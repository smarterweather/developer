// CLI subcommands: `trial` (no-human mint) and `login` (RFC 8628 device grant).
// Both write SMARTERWEATHER_API_KEY to .env and print only a key prefix.
// Access tokens / device codes / raw keys are never printed or persisted.

import { basename } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { ENV_FILE_VAR } from './env.js';
import {
  checkAlreadyConfigured,
  resolveSinkTarget,
  writeNewKey,
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

/** key-api config.maxApiKeyNameLength */
export const KEY_NAME_MAX = 64;

const KEY_LEAK_RE = /sw_(?:live|test)_[A-Za-z0-9_-]{20,}/;

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
  return { ok: true, path: target.path };
}

export async function runTrialCli(
  deps: CliDeps,
  opts: { json?: boolean } = {},
): Promise<number> {
  const target = resolveCliTarget(deps);
  if (!target.ok) {
    err(deps, target.message);
    return 2;
  }

  const already = checkAlreadyConfigured(deps, target.path);
  if (already) {
    const payload = {
      status: 'already_configured' as const,
      key_prefix: already.key_prefix,
      env_path: already.env_path,
    };
    assertNoLeak(payload);
    if (opts.json) {
      out(deps, JSON.stringify(payload));
    } else {
      out(deps, `already_configured ${payload.key_prefix} ${payload.env_path}`);
    }
    return 0;
  }

  const result = await startTrial({
    ...deps,
    envFile: target.path,
    fetchImpl: deps.fetchImpl,
    keyApiBase: deps.keyApiBase,
  });

  if (result.status === 'already_configured') {
    const payload = {
      status: 'already_configured' as const,
      key_prefix: result.key_prefix,
      env_path: result.env_path,
    };
    assertNoLeak(payload);
    if (opts.json) out(deps, JSON.stringify(payload));
    else out(deps, `already_configured ${payload.key_prefix} ${payload.env_path}`);
    return 0;
  }

  if (result.status === 'error') {
    const payload = { status: 'error' as const, error: result.error, detail: result.detail };
    assertNoLeak(payload);
    if (opts.json) out(deps, JSON.stringify(payload));
    else err(deps, `trial failed: ${result.error}${result.detail ? ` (${result.detail})` : ''}`);
    return 1;
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

function keyNameForCwd(cwd: string): string {
  const base = basename(cwd) || 'project';
  const name = `cli ${base}`;
  return name.length <= KEY_NAME_MAX ? name : name.slice(0, KEY_NAME_MAX);
}

export async function runLoginCli(
  deps: CliDeps,
  opts: { json?: boolean } = {},
): Promise<number> {
  const target = resolveCliTarget(deps);
  if (!target.ok) {
    err(deps, target.message);
    return 2;
  }

  const already = checkAlreadyConfigured(deps, target.path);
  if (already) {
    const payload = {
      status: 'already_configured' as const,
      key_prefix: already.key_prefix,
      env_path: already.env_path,
    };
    assertNoLeak(payload);
    if (opts.json) out(deps, JSON.stringify(payload));
    else out(deps, `already_configured ${payload.key_prefix} ${payload.env_path}`);
    return 0;
  }

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
      err(deps, `login failed: device authorization HTTP ${res.status}`);
      return 1;
    }
    device = (await res.json()) as DeviceCodeResponse;
  } catch (e) {
    err(deps, `login failed: network (${(e as Error).message})`);
    return 1;
  }

  if (
    typeof device.device_code !== 'string' ||
    typeof device.user_code !== 'string' ||
    typeof device.verification_uri !== 'string'
  ) {
    err(deps, 'login failed: malformed device authorization response');
    return 1;
  }

  const verifyUrl =
    typeof device.verification_uri_complete === 'string' && device.verification_uri_complete
      ? device.verification_uri_complete
      : `${device.verification_uri} (code ${device.user_code})`;

  // Flush immediately so an agent can relay the URL while we poll.
  if (opts.json) {
    out(
      deps,
      JSON.stringify({
        status: 'pending_approval',
        verification_uri:
          typeof device.verification_uri_complete === 'string' && device.verification_uri_complete
            ? device.verification_uri_complete
            : device.verification_uri,
        user_code: device.user_code,
        note: 'login blocks until the human approves (≤ expires_in); run in background or with a long shell timeout and relay the printed URL.',
      }),
    );
  } else {
    out(deps, `Open this URL to approve: ${verifyUrl}`);
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
      err(deps, `login failed: network (${(e as Error).message})`);
      return 1;
    }

    const code = poll.error;
    if (code === 'authorization_pending') continue;
    if (code === 'slow_down') {
      intervalMs += 5000;
      continue;
    }
    if (code === 'expired_token' || code === 'access_denied') {
      const msg = code === 'access_denied' ? 'access denied by the human' : 'device code expired';
      if (opts.json) out(deps, JSON.stringify({ status: 'error', error: code, detail: msg }));
      else err(deps, `login failed: ${msg}`);
      return 1;
    }
    if (code) {
      if (opts.json) {
        out(deps, JSON.stringify({ status: 'error', error: code, detail: poll.error_description }));
      } else {
        err(deps, `login failed: ${code}${poll.error_description ? ` (${poll.error_description})` : ''}`);
      }
      return 1;
    }
  }

  if (!accessToken) {
    if (opts.json) out(deps, JSON.stringify({ status: 'error', error: 'expired_token' }));
    else err(deps, 'login failed: device code expired');
    return 1;
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
        name: keyNameForCwd(deps.cwd),
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
      if (opts.json) out(deps, JSON.stringify({ status: 'error', error: 'forbidden', detail }));
      else err(deps, `login failed: ${detail}`);
      return 1;
    }
    if (!res.ok) {
      const capped = /Maximum of \d+ API keys/i.test(blob) || /key.?limit/i.test(blob);
      const detail = capped
        ? 'API key limit reached (25/owner). Revoke a key at https://developers.smarterweather.com/dashboard/api-keys then re-run login.'
        : created.detail || created.title || created.error || `HTTP ${res.status}`;
      if (opts.json) {
        out(
          deps,
          JSON.stringify({
            status: 'error',
            error: capped ? 'key_cap' : 'create_failed',
            detail,
          }),
        );
      } else {
        err(deps, `login failed: ${detail}`);
      }
      return 1;
    }
  } catch (e) {
    err(deps, `login failed: network (${(e as Error).message})`);
    return 1;
  } finally {
    accessToken = undefined;
  }

  if (typeof created.key !== 'string' || created.key.length < 16) {
    err(deps, 'login failed: create response missing key');
    return 1;
  }

  let written;
  try {
    written = writeNewKey(target.path, created.key);
  } catch (e) {
    err(deps, `login failed: could not write .env (${(e as Error).message})`);
    return 1;
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

/** Parse argv for CLI subcommands. Returns null when the process should run the stdio proxy. */
export function parseCliArgs(argv: readonly string[]): {
  command: 'trial' | 'login';
  json: boolean;
} | null {
  const filtered = argv.filter((a) => a !== '--json');
  const json = argv.includes('--json');
  const cmd = filtered[0];
  if (cmd === 'trial' || cmd === 'login') {
    return { command: cmd, json };
  }
  return null;
}
