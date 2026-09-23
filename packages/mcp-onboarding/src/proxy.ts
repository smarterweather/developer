import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import { displayPrefix, readExistingKey } from './env.js';
import { writeNewKey, writeReplacedKey } from './sink.js';

export type JsonRpc = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: unknown;
};

export type StartTrialHandler = (args: unknown) => Promise<unknown>;

export type ProxySinkContext = {
  /** Resolve the .env path (may request MCP roots). */
  resolveEnvPath: () => Promise<{ ok: true; path: string } | { ok: false; error: string }>;
  /** Process-env key, if any (already_configured short-circuit). */
  processEnvKey?: string;
};

const ROOTS_ID_PREFIX = 'sw-onboarding-roots-';
const SINK_TOOLS = new Set(['create_api_key', 'rotate_api_key']);

function parseLine(line: string): JsonRpc | JsonRpc[] | undefined {
  try {
    return JSON.parse(line) as JsonRpc | JsonRpc[];
  } catch {
    return undefined;
  }
}

function writeLine(out: Writable, msg: unknown): void {
  out.write(`${JSON.stringify(msg)}\n`);
}

function toolResult(payload: unknown): {
  content: { type: 'text'; text: string }[];
  structuredContent: unknown;
} {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
  };
}

function toolError(message: string, extra?: Record<string, unknown>): {
  content: { type: 'text'; text: string }[];
  structuredContent: unknown;
  isError: true;
} {
  const payload = { status: 'error', error: message, ...extra };
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
    isError: true,
  };
}

function isToolsCall(msg: JsonRpc, name: string): boolean {
  if (msg.method !== 'tools/call') return false;
  const params = msg.params as { name?: string } | undefined;
  return params?.name === name;
}

function toolsCallName(msg: JsonRpc): string | undefined {
  if (msg.method !== 'tools/call') return undefined;
  const params = msg.params as { name?: string } | undefined;
  return typeof params?.name === 'string' ? params.name : undefined;
}

export function rewriteToolsList(result: unknown): unknown {
  if (!result || typeof result !== 'object') return result;
  const r = result as { tools?: unknown };
  if (!Array.isArray(r.tools)) return result;
  const tools = (r.tools as unknown[]).filter((t) => {
    if (!t || typeof t !== 'object') return true;
    return (t as { name?: string }).name !== 'start_trial';
  });
  tools.push({
    name: 'start_trial',
    description:
      'Mint a trial API key locally, write it to .env (mode 0600), and return only a key prefix. Never prints the bearer. No-ops if SMARTERWEATHER_API_KEY is already set.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  });
  return { ...r, tools };
}

function extractRootUris(result: unknown): string[] {
  if (!result || typeof result !== 'object') return [];
  const roots = (result as { roots?: unknown }).roots;
  if (!Array.isArray(roots)) return [];
  const uris: string[] = [];
  for (const root of roots) {
    if (root && typeof root === 'object' && typeof (root as { uri?: string }).uri === 'string') {
      uris.push((root as { uri: string }).uri);
    }
  }
  return uris;
}

function parseStructured(result: unknown): Record<string, unknown> | undefined {
  if (!result || typeof result !== 'object') return undefined;
  const r = result as { structuredContent?: unknown; content?: unknown };
  if (r.structuredContent && typeof r.structuredContent === 'object') {
    return r.structuredContent as Record<string, unknown>;
  }
  if (Array.isArray(r.content)) {
    for (const block of r.content) {
      if (
        block &&
        typeof block === 'object' &&
        (block as { type?: string }).type === 'text' &&
        typeof (block as { text?: string }).text === 'string'
      ) {
        try {
          const parsed = JSON.parse((block as { text: string }).text) as unknown;
          if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
        } catch {
          /* ignore */
        }
      }
    }
  }
  return undefined;
}

function stripKeyFields(
  result: unknown,
  mutate: (obj: Record<string, unknown>) => void,
): unknown {
  if (!result || typeof result !== 'object') return result;
  const r = { ...(result as Record<string, unknown>) };

  if (r.structuredContent && typeof r.structuredContent === 'object') {
    const sc = { ...(r.structuredContent as Record<string, unknown>) };
    mutate(sc);
    r.structuredContent = sc;
  }

  if (Array.isArray(r.content)) {
    r.content = (r.content as unknown[]).map((block) => {
      if (
        !block ||
        typeof block !== 'object' ||
        (block as { type?: string }).type !== 'text' ||
        typeof (block as { text?: string }).text !== 'string'
      ) {
        return block;
      }
      try {
        const parsed = JSON.parse((block as { text: string }).text) as unknown;
        if (!parsed || typeof parsed !== 'object') return block;
        const obj = { ...(parsed as Record<string, unknown>) };
        mutate(obj);
        return { ...block, text: JSON.stringify(obj, null, 2) };
      } catch {
        return block;
      }
    });
  }

  return r;
}

export type JsonRpcProxy = {
  requestHostRoots: () => Promise<string[]>;
};

export function attachJsonRpcProxy(opts: {
  hostIn: Readable;
  hostOut: Writable;
  childIn: Writable;
  childOut: Readable;
  startTrial: StartTrialHandler;
  sink?: ProxySinkContext;
  rootsTimeoutMs?: number;
}): JsonRpcProxy {
  const pendingListIds = new Set<string | number>();
  const pendingRoots = new Map<string, (uris: string[]) => void>();
  /** id → tool name for create/rotate results we must sink. */
  const pendingSinkIds = new Map<string | number, 'create_api_key' | 'rotate_api_key'>();
  let rootsSeq = 0;
  const rootsTimeoutMs = opts.rootsTimeoutMs ?? 2000;

  const hostRl = createInterface({ input: opts.hostIn, crlfDelay: Infinity });
  const childRl = createInterface({ input: opts.childOut, crlfDelay: Infinity });

  hostRl.on('line', (line) => {
    const parsed = parseLine(line);
    if (parsed === undefined || Array.isArray(parsed)) {
      opts.childIn.write(`${line}\n`);
      return;
    }

    if (parsed.id !== undefined && parsed.id !== null && pendingRoots.has(String(parsed.id))) {
      const resolve = pendingRoots.get(String(parsed.id));
      pendingRoots.delete(String(parsed.id));
      resolve?.(extractRootUris(parsed.result));
      return;
    }

    if (isToolsCall(parsed, 'start_trial') && parsed.id !== undefined && parsed.id !== null) {
      const args = (parsed.params as { arguments?: unknown } | undefined)?.arguments;
      void opts
        .startTrial(args)
        .then((payload) => {
          writeLine(opts.hostOut, { jsonrpc: '2.0', id: parsed.id, result: toolResult(payload) });
        })
        .catch((err: Error) => {
          writeLine(opts.hostOut, {
            jsonrpc: '2.0',
            id: parsed.id,
            error: { code: -32000, message: err.message },
          });
        });
      return;
    }

    if (
      opts.sink &&
      isToolsCall(parsed, 'create_api_key') &&
      parsed.id !== undefined &&
      parsed.id !== null
    ) {
      const id = parsed.id;
      void (async () => {
        const target = await opts.sink!.resolveEnvPath();
        if (!target.ok) {
          writeLine(opts.hostOut, {
            jsonrpc: '2.0',
            id,
            result: toolError(target.error),
          });
          return;
        }
        const existing = opts.sink!.processEnvKey || readExistingKey(target.path);
        if (existing) {
          writeLine(opts.hostOut, {
            jsonrpc: '2.0',
            id,
            result: toolResult({
              status: 'already_configured',
              key_prefix: displayPrefix(existing),
              env_path: target.path,
              handling: 'written to .env; not shown',
            }),
          });
          return;
        }
        pendingSinkIds.set(id, 'create_api_key');
        opts.childIn.write(`${line}\n`);
      })();
      return;
    }

    const callName = toolsCallName(parsed);
    if (
      opts.sink &&
      callName &&
      SINK_TOOLS.has(callName) &&
      callName === 'rotate_api_key' &&
      parsed.id !== undefined &&
      parsed.id !== null
    ) {
      pendingSinkIds.set(parsed.id, 'rotate_api_key');
    }

    if (parsed.method === 'tools/list' && parsed.id !== undefined && parsed.id !== null) {
      pendingListIds.add(parsed.id);
    }

    opts.childIn.write(`${line}\n`);
  });

  childRl.on('line', (line) => {
    const parsed = parseLine(line);
    if (parsed === undefined || Array.isArray(parsed)) {
      opts.hostOut.write(`${line}\n`);
      return;
    }

    if (
      parsed.id !== undefined &&
      parsed.id !== null &&
      pendingListIds.has(parsed.id) &&
      parsed.result !== undefined
    ) {
      pendingListIds.delete(parsed.id);
      writeLine(opts.hostOut, { ...parsed, result: rewriteToolsList(parsed.result) });
      return;
    }

    if (
      opts.sink &&
      parsed.id !== undefined &&
      parsed.id !== null &&
      pendingSinkIds.has(parsed.id) &&
      parsed.result !== undefined
    ) {
      const tool = pendingSinkIds.get(parsed.id)!;
      pendingSinkIds.delete(parsed.id);
      void (async () => {
        const sunk = await sinkChildResult(opts.sink!, tool, parsed.result);
        writeLine(opts.hostOut, { ...parsed, result: sunk });
      })();
      return;
    }

    opts.hostOut.write(`${line}\n`);
  });

  return {
    requestHostRoots: () =>
      new Promise<string[]>((resolve) => {
        const id = `${ROOTS_ID_PREFIX}${++rootsSeq}`;
        const timer = setTimeout(() => {
          pendingRoots.delete(id);
          resolve([]);
        }, rootsTimeoutMs);
        pendingRoots.set(id, (uris) => {
          clearTimeout(timer);
          resolve(uris);
        });
        writeLine(opts.hostOut, { jsonrpc: '2.0', id, method: 'roots/list' });
      }),
  };
}

async function sinkChildResult(
  sink: ProxySinkContext,
  tool: 'create_api_key' | 'rotate_api_key',
  result: unknown,
): Promise<unknown> {
  const structured = parseStructured(result);
  if (!structured) {
    // Unparseable — pass through unchanged (never drop a key the server minted).
    return result;
  }

  const target = await sink.resolveEnvPath();
  if (!target.ok) {
    const keyId =
      tool === 'create_api_key'
        ? structured.keyId
        : (structured.newKey as { keyId?: string } | undefined)?.keyId;
    return toolError(
      `key was minted but could not be written to .env (${target.error}). Revoke keyId ${String(keyId ?? 'unknown')} and retry after setting SMARTERWEATHER_ENV_FILE.`,
      { keyId },
    );
  }

  if (tool === 'create_api_key') {
    const key = structured.key;
    if (typeof key !== 'string' || key.length < 16) {
      return result;
    }
    try {
      const written = writeNewKey(target.path, key);
      return stripKeyFields(result, (obj) => {
        delete obj.key;
        obj.key_prefix = written.key_prefix;
        obj.env_path = written.env_path;
        obj.handling = 'written to .env; not shown';
      });
    } catch (e) {
      return toolError(
        `key was minted but written nowhere (${(e as Error).message}). Revoke keyId ${String(structured.keyId ?? 'unknown')}.`,
        { keyId: structured.keyId },
      );
    }
  }

  // rotate_api_key
  const newKey = structured.newKey as
    | { key?: string; keyId?: string; keyPrefix?: string }
    | undefined;
  const oldKey = structured.oldKey as
    | { keyId?: string; keyPrefix?: string; revokedAt?: string }
    | undefined;
  if (!newKey || typeof newKey.key !== 'string' || newKey.key.length < 16) {
    return result;
  }

  const existing = sink.processEnvKey || readExistingKey(target.path);
  if (existing) {
    const existingPrefix = displayPrefix(existing);
    const oldPrefix = typeof oldKey?.keyPrefix === 'string' ? oldKey.keyPrefix : undefined;
    if (oldPrefix && existingPrefix !== oldPrefix.slice(0, 12) && existingPrefix !== oldPrefix) {
      return toolError(
        `rotate mismatch: .env prefix ${existingPrefix} does not match oldKey.keyPrefix. The old key keeps working until revokedAt. Revoke the new keyId and rotate from the dashboard.`,
        {
          keyId: newKey.keyId,
          revokedAt: oldKey?.revokedAt,
          env_path: target.path,
        },
      );
    }
  }

  try {
    const written = existing
      ? writeReplacedKey(target.path, newKey.key)
      : writeNewKey(target.path, newKey.key);
    return stripKeyFields(result, (obj) => {
      const nk = obj.newKey;
      if (nk && typeof nk === 'object') {
        const copy = { ...(nk as Record<string, unknown>) };
        delete copy.key;
        obj.newKey = copy;
      }
      obj.key_prefix = written.key_prefix;
      obj.env_path = written.env_path;
      obj.handling = 'written to .env; not shown';
    });
  } catch (e) {
    return toolError(
      `key was minted but written nowhere (${(e as Error).message}). Revoke keyId ${String(newKey.keyId ?? 'unknown')}.`,
      { keyId: newKey.keyId },
    );
  }
}
