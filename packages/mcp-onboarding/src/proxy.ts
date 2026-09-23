import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';

export type JsonRpc = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: unknown;
};

export type StartTrialHandler = (args: unknown) => Promise<unknown>;

const ROOTS_ID_PREFIX = 'sw-onboarding-roots-';

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

function isStartTrialCall(msg: JsonRpc): boolean {
  if (msg.method !== 'tools/call') return false;
  const params = msg.params as { name?: string } | undefined;
  return params?.name === 'start_trial';
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

export type JsonRpcProxy = {
  requestHostRoots: () => Promise<string[]>;
};

export function attachJsonRpcProxy(opts: {
  hostIn: Readable;
  hostOut: Writable;
  childIn: Writable;
  childOut: Readable;
  startTrial: StartTrialHandler;
  rootsTimeoutMs?: number;
}): JsonRpcProxy {
  const pendingListIds = new Set<string | number>();
  const pendingRoots = new Map<string, (uris: string[]) => void>();
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

    if (isStartTrialCall(parsed) && parsed.id !== undefined && parsed.id !== null) {
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
