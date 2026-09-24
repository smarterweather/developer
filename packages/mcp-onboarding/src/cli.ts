// CLI subcommands: `trial` (no-human mint) and `login` (RFC 8628 device grant).
// Both write SMARTERWEATHER_API_KEY to .env and print only a key prefix.
// Access tokens / device codes / raw keys are never printed or persisted.

import { basename, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { ENV_FILE_VAR } from './env.js';
import {
  alreadyConfiguredHandling,
  checkAlreadyConfigured,
  resolveSinkTarget,
  trackedEnvError,
  writeNewKey,
  type AlreadyConfigured,
  type SinkResolveDeps,
} from './sink.js';
import { DEFAULT_KEY_API_BASE, startTrial, TRIAL_CONSUME } from './trial.js';

const require = createRequire(import.meta.url);

interface PackageJsonShape {
  version: string;
}

const pkg = require('../package.json') as PackageJsonShape;

/** Matches assets/developer-links/links.json device_flow (Clerk public PKCE CLI client). */
export const DEVICE_CLIENT_ID = 'k2h05BUoTP393zcD';
export const DEVICE_AUTHORIZATION_ENDPOINT =
  'https://clerk.smarterweather.com/oauth/device_authorization';
export const TOKEN_ENDPOINT = 'https://clerk.smarterweather.com/oauth/token';
export const DEVICE_SCOPE = 'openid email';
/** Our approval page; Clerk's verification_uri is the stock Account Portal page. */
export const DEVICE_VERIFICATION_PAGE = 'https://developers.smarterweather.com/device';

export function deviceVerificationUrl(userCode: string): string {
  return `${DEVICE_VERIFICATION_PAGE}?user_code=${encodeURIComponent(userCode)}`;
}

/** key-api config.maxApiKeyNameLength */
export const KEY_NAME_MAX = 64;

const KEY_LEAK_RE = /sw_(?:live|test)_[A-Za-z0-9_-]{20,}/;

const API_KEYS_DASHBOARD = 'https://developers.smarterweather.com/dashboard/api-keys';

export const USAGE = `Usage: npx -y @smarterweather/mcp-onboarding@latest <command> [--json]

Commands:
  login   Approve in a browser (device code), then write a full key to .env
  trial   No human: mint a trial key to .env (claim it into an account to keep it)

With no command, runs the stdio MCP bridge to https://mcp.developers.smarterweather.com.
Both commands write SMARTERWEATHER_API_KEY to ./.env (or $${ENV_FILE_VAR}) with
mode 0600, add .env to .gitignore, and print only a key prefix.`;

export type CliDeps = SinkResolveDeps & {
  fetchImpl?: typeof fetch;
  keyApiBase?: string;
  stdout?: (line: string) => void;
  stderr?: (line: string) => void;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  uuid?: () => string;
};

export type CliJsonResult = Record<string, unknown>;

function defaultSleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function out(deps: CliDeps, line: string): void {
  (deps.stdout ?? ((s: string) => process.stdout.write(`${s}\n`)))(line);
}

function err(deps: CliDeps, line: string): void {
  (deps.stderr ?? ((s: string) => process.stderr.write(`${s}\n`)))(line);
}

function assertNoLeak(payload: unknown): void {
  const dumped = JSON.stringify(payload);
  if (KEY_LEAK_RE.test(dumped)) {
    throw new Error('internal: refused to emit a key-shaped value');
  }
}

/** Report a failure: one JSON object on stdout with --json, else one stderr line. */
function fail(
  deps: CliDeps,
  command: 'trial' | 'login',
  json: boolean | undefined,
  error: string,
  detail?: string,
  exitCode = 1,
): number {
  const payload = { status: 'error' as const, error, ...(detail ? { detail } : {}) };
  assertNoLeak(payload);
  if (json) out(deps, JSON.stringify(payload));
  else err(deps, `${command} failed: ${detail ?? error}`);
  return exitCode;
}

function resolveCliTarget(deps: CliDeps):
  | { ok: true; path: string }
  | { ok: false; message: string } {
  const target = resolveSinkTarget(deps);
  if (!target.ok) {
    return {
      ok: false,
      message: `${target.error}. Set ${ENV_FILE_VAR} to an absolute .env path.`,
    };
  }
  const tracked = trackedEnvError(target.path);
  if (tracked) return { ok: false, message: tracked };
  return { ok: true, path: target.path };
}

function printAlreadyConfigured(
  deps: CliDeps,
  already: AlreadyConfigured,
  json: boolean | undefined,
): number {
  const payload = {
    status: 'already_configured' as const,
    key_prefix: already.key_prefix,
    source: already.source,
    ...(already.env_path ? { env_path: already.env_path } : {}),
    handling: alreadyConfiguredHandling(already),
  };
  assertNoLeak(payload);
  if (json) out(deps, JSON.stringify(payload));
  else out(deps, `already_configured ${payload.key_prefix} (${payload.handling})`);
  return 0;
}

export async function runTrialCli(
  deps: CliDeps,
  opts: { json?: boolean } = {},
): Promise<number> {
  const target = resolveCliTarget(deps);
  if (!target.ok) return fail(deps, 'trial', opts.json, 'env_path', target.message, 2);

  const already = checkAlreadyConfigured(deps.processEnvKey, target.path);
  if (already) return printAlreadyConfigured(deps, already, opts.json);

  const result = await startTrial({
    ...deps,
    envFile: target.path,
    fetchImpl: deps.fetchImpl,
    keyApiBase: deps.keyApiBase,
  });

  if (result.status === 'already_configured') {
    return printAlreadyConfigured(deps, result, opts.json);
  }

  if (result.status === 'error') {
    return fail(deps, 'trial', opts.json, result.error, result.detail);
  }

  const payload: CliJsonResult = {
    status: 'ok',
    key_prefix: result.key_prefix,
    env_path: result.env_path,
    consume: TRIAL_CONSUME,
  };
  if (result.claim_url) payload.claim_url = result.claim_url;
  if (result.expires_at) payload.expires_at = result.expires_at;
  if (result.claim_expires_at) payload.claim_expires_at = result.claim_expires_at;
  assertNoLeak(payload);

  if (opts.json) {
    out(deps, JSON.stringify(payload));
  } else {
    out(deps, `ok ${result.key_prefix} ${result.env_path}`);
    if (result.claim_url) out(deps, `claim_url ${result.claim_url}`);
    if (result.expires_at) out(deps, `expires_at ${result.expires_at}`);
    if (result.claim_expires_at) out(deps, `claim_expires_at ${result.claim_expires_at}`);
    out(deps, `consume ${TRIAL_CONSUME}`);
  }
  return 0;
}

type DeviceCodeResponse = {
  device_code?: string;
  user_code?: string;
  verification_uri?: string;
  verification_uri_complete?: string;
  expires_in?: number;
  interval?: number;
};

type TokenPollBody = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type CreateKeyBody = {
  key?: string;
  keyPrefix?: string;
  keyId?: string;
  type?: string;
  title?: string;
  detail?: string;
  error?: string;
};

/** Dashboard label: `cli <project dir>`, where the project dir holds the target .env. */
export function keyNameForEnvPath(envPath: string): string {
  const base = basename(dirname(envPath)) || 'project';
  const name = `cli ${base}`;
  return name.length <= KEY_NAME_MAX ? name : name.slice(0, KEY_NAME_MAX);
}

export async function runLoginCli(
  deps: CliDeps,
  opts: { json?: boolean } = {},
): Promise<number> {
  const target = resolveCliTarget(deps);
  if (!target.ok) return fail(deps, 'login', opts.json, 'env_path', target.message, 2);

  const already = checkAlreadyConfigured(deps.processEnvKey, target.path);
  if (already) return printAlreadyConfigured(deps, already, opts.json);

  const fetchImpl = deps.fetchImpl ?? fetch;
  const sleep = deps.sleep ?? defaultSleep;
  const keyApiBase = (deps.keyApiBase ?? DEFAULT_KEY_API_BASE).replace(/\/$/, '');

  let device: DeviceCodeResponse;
  try {
    const res = await fetchImpl(DEVICE_AUTHORIZATION_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: new URLSearchParams({
        client_id: DEVICE_CLIENT_ID,
        scope: DEVICE_SCOPE,
      }).toString(),
    });
    if (!res.ok) {
      return fail(deps, 'login', opts.json, 'device_authorization', `device authorization HTTP ${res.status}`);
    }
    device = (await res.json()) as DeviceCodeResponse;
  } catch (e) {
    return fail(deps, 'login', opts.json, 'network', `network (${(e as Error).message})`);
  }

  if (
    typeof device.device_code !== 'string' ||
    typeof device.user_code !== 'string' ||
    typeof device.verification_uri !== 'string'
  ) {
    return fail(deps, 'login', opts.json, 'device_authorization', 'malformed device authorization response');
  }

  const verifyUrl = deviceVerificationUrl(device.user_code);

  // Flush immediately so an agent can relay the URL while we poll.
  if (opts.json) {
    out(
      deps,
      JSON.stringify({
        status: 'pending_approval',
        verification_uri: verifyUrl,
        user_code: device.user_code,
        note: 'login blocks until the human approves (≤ expires_in); run in background or with a long shell timeout and relay the printed URL.',
      }),
    );
  } else {
    out(deps, `Open this URL to approve: ${verifyUrl}`);
    out(deps, `Code: ${device.user_code} (check it matches on that page)`);
    out(
      deps,
      'login blocks until the human approves (≤ the device code expires_in); run it in the background or with a long shell timeout and relay the printed URL.',
    );
  }

  const deviceCode = device.device_code;
  let intervalMs = Math.max(1, Number(device.interval ?? 5)) * 1000;
  const expiresInSec = Number(device.expires_in ?? 600);
  const deadline = (deps.now ?? Date.now)() + expiresInSec * 1000;

  let accessToken: string | undefined;
  let warnedNetwork = false;
  while ((deps.now ?? Date.now)() < deadline) {
    await sleep(intervalMs);
    let poll: TokenPollBody;
    try {
      const res = await fetchImpl(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          accept: 'application/json',
        },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          device_code: deviceCode,
          client_id: DEVICE_CLIENT_ID,
        }).toString(),
      });
      poll = (await res.json().catch(() => ({}))) as TokenPollBody;
      if (res.ok && typeof poll.access_token === 'string') {
        accessToken = poll.access_token;
        break;
      }
    } catch (e) {
      // A dropped connection mid-approval should not waste the human's approval.
      if (!warnedNetwork) {
        err(deps, `login: token poll network error (${(e as Error).message}); retrying until the code expires`);
        warnedNetwork = true;
      }
      continue;
    }

    const code = poll.error;
    if (code === 'authorization_pending') continue;
    if (code === 'slow_down') {
      intervalMs += 5000;
      continue;
    }
    if (code === 'expired_token' || code === 'access_denied') {
      const msg = code === 'access_denied' ? 'access denied by the human' : 'device code expired';
      return fail(deps, 'login', opts.json, code, msg);
    }
    if (code) {
      return fail(deps, 'login', opts.json, code, poll.error_description ? `${code} (${poll.error_description})` : code);
    }
  }

  if (!accessToken) {
    return fail(deps, 'login', opts.json, 'expired_token', 'device code expired');
  }

  const idempotencyKey = (deps.uuid ?? randomUUID)();
  let created: CreateKeyBody = {};
  try {
    const res = await fetchImpl(`${keyApiBase}/developer/keys`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
        'idempotency-key': idempotencyKey,
      },
      body: JSON.stringify({
        name: keyNameForEnvPath(target.path),
        origin: {
          channel: 'device_flow',
          client: { name: '@smarterweather/mcp-onboarding', version: pkg.version },
        },
      }),
    });
    created = (await res.json().catch(() => ({}))) as CreateKeyBody;
    const blob = `${created.type ?? ''} ${created.title ?? ''} ${created.detail ?? ''} ${created.error ?? ''}`;
    if (res.status === 403 || /email-not-verified/i.test(blob)) {
      const detail = /email-not-verified/i.test(blob)
        ? 'email not verified — verify your email at https://developers.smarterweather.com/dashboard, then re-run login'
        : created.detail || created.title || created.error || `HTTP ${res.status}`;
      return fail(deps, 'login', opts.json, 'forbidden', detail);
    }
    if (!res.ok) {
      const capped = /Maximum of \d+ API keys/i.test(blob) || /key.?limit/i.test(blob);
      const detail = capped
        ? `API key limit reached (25/owner). Revoke a key at ${API_KEYS_DASHBOARD} then re-run login.`
        : created.detail || created.title || created.error || `HTTP ${res.status}`;
      return fail(deps, 'login', opts.json, capped ? 'key_cap' : 'create_failed', detail);
    }
  } catch (e) {
    return fail(deps, 'login', opts.json, 'network', `network (${(e as Error).message})`);
  } finally {
    accessToken = undefined;
  }

  if (typeof created.key !== 'string' || created.key.length < 16) {
    return fail(deps, 'login', opts.json, 'create_failed', 'create response missing key');
  }

  let written;
  try {
    written = writeNewKey(target.path, created.key);
  } catch (e) {
    const id = created.keyId ? ` (keyId ${created.keyId})` : '';
    return fail(
      deps,
      'login',
      opts.json,
      'env_write',
      `key ${created.key.slice(0, 12)}${id} was created but could not be written to ${target.path} (${(e as Error).message}). Revoke it at ${API_KEYS_DASHBOARD}, fix the path, and re-run login.`,
    );
  }

  const payload: CliJsonResult = {
    status: 'ok',
    key_prefix: written.key_prefix,
    env_path: written.env_path,
  };
  assertNoLeak(payload);

  if (opts.json) out(deps, JSON.stringify(payload));
  else out(deps, `ok ${written.key_prefix} ${written.env_path}`);
  return 0;
}

export type ParsedCli =
  | { command: 'trial' | 'login'; json: boolean }
  | { command: 'help' }
  | { command: 'unknown'; arg: string };

/**
 * Parse argv for CLI subcommands. Returns null when the process should run the
 * stdio proxy (no args, flags, or a server URL — mcp-remote's argv shape).
 */
export function parseCliArgs(argv: readonly string[]): ParsedCli | null {
  const filtered = argv.filter((a) => a !== '--json');
  const json = argv.includes('--json');
  const cmd = filtered[0];
  if (cmd === 'trial' || cmd === 'login') return { command: cmd, json };
  if (cmd === 'help' || cmd === '--help' || cmd === '-h') return { command: 'help' };
  if (cmd !== undefined && !cmd.startsWith('-') && !/^https?:\/\//i.test(cmd)) {
    return { command: 'unknown', arg: cmd };
  }
  return null;
}
