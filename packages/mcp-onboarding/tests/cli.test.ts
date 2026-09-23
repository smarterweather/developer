import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  KEY_NAME_MAX,
  keyNameForEnvPath,
  parseCliArgs,
  runLoginCli,
  runTrialCli,
} from '../src/cli.js';
import { resetStartTrialLock } from '../src/trial.js';

const FAKE = `sw_live_${'ij'.repeat(20)}`;
const FAKE_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.faketoken.sig';
const KEY_LEAK_RE = /sw_(?:live|test)_[A-Za-z0-9_-]{20,}/;
const TOKEN_LEAK_RE = /eyJ[A-Za-z0-9_-]{10,}/;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('parseCliArgs', () => {
  it('detects trial/login and --json', () => {
    expect(parseCliArgs(['trial'])).toEqual({ command: 'trial', json: false });
    expect(parseCliArgs(['login', '--json'])).toEqual({ command: 'login', json: true });
    expect(parseCliArgs(['--debug'])).toBeNull();
  });

  it('routes help and unknown words instead of starting the proxy', () => {
    expect(parseCliArgs(['help'])).toEqual({ command: 'help' });
    expect(parseCliArgs(['--help'])).toEqual({ command: 'help' });
    expect(parseCliArgs(['-h'])).toEqual({ command: 'help' });
    expect(parseCliArgs(['signup'])).toEqual({ command: 'unknown', arg: 'signup' });
    expect(parseCliArgs([])).toBeNull();
    expect(parseCliArgs(['https://mcp.example.com', '--header', 'X:1'])).toBeNull();
  });
});

describe('keyNameForEnvPath', () => {
  it('labels by the directory holding the .env and caps length', () => {
    expect(keyNameForEnvPath('/work/acme-app/.env')).toBe('cli acme-app');
    expect(keyNameForEnvPath(`/work/${'x'.repeat(100)}/.env`)).toHaveLength(KEY_NAME_MAX);
  });
});

function device(): Response {
  return jsonResponse(200, {
    device_code: 'x',
    user_code: 'Y',
    verification_uri: 'https://example.com',
    expires_in: 100,
    interval: 1,
  });
}

const frozenNow = () => 1_000_000;

describe('runTrialCli', () => {
  it('mints, writes .env 0600, and never prints the key', async () => {
    resetStartTrialLock();
    const dir = mkdtempSync(join(tmpdir(), 'sw-cli-trial-'));
    const lines: string[] = [];
    const code = await runTrialCli(
      {
        cwd: dir,
        homedir: '/Users/nobody',
        stdout: (l) => lines.push(l),
        stderr: (l) => lines.push(`ERR:${l}`),
        fetchImpl: async (input) => {
          const url = String(input);
          if (url.endsWith('/challenge')) {
            return jsonResponse(200, { challenge_token: 'sw-pow-vector-v1', difficulty_bits: 12 });
          }
          if (url.endsWith('/trial')) {
            return jsonResponse(200, {
              api_key: FAKE,
              claim_url: 'https://smarterweather.com/claim#ticket=sw_claim_abc',
              expires_at: '2099-01-01T00:00:00Z',
            });
          }
          return jsonResponse(404, {});
        },
      },
      { json: false },
    );
    expect(code).toBe(0);
    const joined = lines.join('\n');
    expect(KEY_LEAK_RE.test(joined)).toBe(false);
    expect(joined).toContain(FAKE.slice(0, 12));
    expect(joined).toContain('#ticket=');
    expect(statSync(join(dir, '.env')).mode & 0o777).toBe(0o600);
    expect(readFileSync(join(dir, '.env'), 'utf8')).toContain(FAKE);
  });

  it('returns already_configured without networking', async () => {
    resetStartTrialLock();
    const dir = mkdtempSync(join(tmpdir(), 'sw-cli-trial-'));
    let calls = 0;
    const lines: string[] = [];
    const code = await runTrialCli(
      {
        cwd: dir,
        homedir: '/Users/nobody',
        processEnvKey: FAKE,
        stdout: (l) => lines.push(l),
        fetchImpl: async () => {
          calls += 1;
          return jsonResponse(500, {});
        },
      },
      { json: true },
    );
    expect(code).toBe(0);
    expect(calls).toBe(0);
    expect(KEY_LEAK_RE.test(lines.join('\n'))).toBe(false);
    expect(JSON.parse(lines[0]).status).toBe('already_configured');
  });
});

describe('runLoginCli', () => {
  it('polls pending → slow_down → success, sinks key, never prints token or key', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'sw-cli-login-'));
    const lines: string[] = [];
    let polls = 0;
    let createBody: unknown;
    const code = await runLoginCli(
      {
        cwd: dir,
        homedir: '/Users/nobody',
        stdout: (l) => lines.push(l),
        stderr: (l) => lines.push(`ERR:${l}`),
        sleep: async () => undefined,
        now: (() => {
          let t = 1_000_000;
          return () => t;
        })(),
        uuid: () => 'idem-1',
        fetchImpl: async (input, init) => {
          const url = String(input);
          if (url.includes('/oauth/device_authorization')) {
            return jsonResponse(200, {
              device_code: 'devcode-secret',
              user_code: 'ABCD-EFGH',
              verification_uri: 'https://accounts.smarterweather.com/device',
              verification_uri_complete:
                'https://accounts.smarterweather.com/device?user_code=ABCD-EFGH',
              expires_in: 599,
              interval: 5,
            });
          }
          if (url.includes('/oauth/token')) {
            polls += 1;
            if (polls === 1) return jsonResponse(400, { error: 'authorization_pending' });
            if (polls === 2) return jsonResponse(400, { error: 'slow_down' });
            return jsonResponse(200, { access_token: FAKE_TOKEN, token_type: 'Bearer' });
          }
          if (url.endsWith('/developer/keys') && init?.method === 'POST') {
            createBody = JSON.parse(String(init.body));
            const auth = (init.headers as Record<string, string>).authorization;
            expect(auth).toBe(`Bearer ${FAKE_TOKEN}`);
            return jsonResponse(200, {
              key: FAKE,
              keyPrefix: FAKE.slice(0, 12),
              keyId: 'key_1',
            });
          }
          return jsonResponse(404, {});
        },
      },
      { json: false },
    );
    expect(code).toBe(0);
    expect(polls).toBe(3);
    expect(createBody).toMatchObject({
      origin: { channel: 'device_flow' },
    });
    const joined = lines.join('\n');
    expect(KEY_LEAK_RE.test(joined)).toBe(false);
    expect(TOKEN_LEAK_RE.test(joined)).toBe(false);
    expect(joined.includes('devcode-secret')).toBe(false);
    expect(joined).toContain('Open this URL to approve:');
    expect(joined).toContain(FAKE.slice(0, 12));
    expect(statSync(join(dir, '.env')).mode & 0o777).toBe(0o600);
  });

  it('exits 1 on access_denied', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'sw-cli-login-'));
    const lines: string[] = [];
    const code = await runLoginCli(
      {
        cwd: dir,
        homedir: '/Users/nobody',
        stdout: (l) => lines.push(l),
        stderr: (l) => lines.push(l),
        sleep: async () => undefined,
        now: (() => {
          let t = 1_000_000;
          return () => t;
        })(),
        fetchImpl: async (input) => {
          const url = String(input);
          if (url.includes('/device_authorization')) {
            return jsonResponse(200, {
              device_code: 'x',
              user_code: 'Y',
              verification_uri: 'https://example.com',
              expires_in: 100,
              interval: 1,
            });
          }
          return jsonResponse(400, { error: 'access_denied' });
        },
      },
      { json: true },
    );
    expect(code).toBe(1);
    expect(KEY_LEAK_RE.test(lines.join('\n'))).toBe(false);
  });

  it('exits 1 on expired_token', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'sw-cli-login-'));
    const code = await runLoginCli(
      {
        cwd: dir,
        homedir: '/Users/nobody',
        stdout: () => undefined,
        stderr: () => undefined,
        sleep: async () => undefined,
        now: (() => {
          let t = 1_000_000;
          return () => t;
        })(),
        fetchImpl: async (input) => {
          const url = String(input);
          if (url.includes('/device_authorization')) {
            return jsonResponse(200, {
              device_code: 'x',
              user_code: 'Y',
              verification_uri: 'https://example.com',
              expires_in: 100,
              interval: 1,
            });
          }
          return jsonResponse(400, { error: 'expired_token' });
        },
      },
      {},
    );
    expect(code).toBe(1);
  });

  it('maps key-cap create errors', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'sw-cli-login-'));
    const lines: string[] = [];
    const code = await runLoginCli(
      {
        cwd: dir,
        homedir: '/Users/nobody',
        stdout: (l) => lines.push(l),
        stderr: (l) => lines.push(l),
        sleep: async () => undefined,
        now: (() => {
          let t = 1_000_000;
          return () => t;
        })(),
        fetchImpl: async (input) => {
          const url = String(input);
          if (url.includes('/device_authorization')) {
            return jsonResponse(200, {
              device_code: 'x',
              user_code: 'Y',
              verification_uri: 'https://example.com',
              expires_in: 100,
              interval: 1,
            });
          }
          if (url.includes('/oauth/token')) {
            return jsonResponse(200, { access_token: FAKE_TOKEN });
          }
          return jsonResponse(400, { error: 'Maximum of 25 API keys reached. Revoke an existing key before creating a new one.' });
        },
      },
      { json: true },
    );
    expect(code).toBe(1);
    expect(lines.join('\n')).toMatch(/key_cap|25\/owner|dashboard\/api-keys/);
    expect(TOKEN_LEAK_RE.test(lines.join('\n'))).toBe(false);
  });

  it('keeps polling through a transient network error', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'sw-cli-login-'));
    const errs: string[] = [];
    let polls = 0;
    const code = await runLoginCli(
      {
        cwd: dir,
        homedir: '/Users/nobody',
        stdout: () => undefined,
        stderr: (l) => errs.push(l),
        sleep: async () => undefined,
        now: frozenNow,
        fetchImpl: async (input) => {
          const url = String(input);
          if (url.includes('/device_authorization')) return device();
          if (url.includes('/oauth/token')) {
            polls += 1;
            if (polls <= 2) throw new Error('ECONNRESET');
            return jsonResponse(200, { access_token: FAKE_TOKEN });
          }
          return jsonResponse(200, { key: FAKE, keyId: 'key_1' });
        },
      },
      {},
    );
    expect(code).toBe(0);
    expect(polls).toBe(3);
    expect(errs.filter((l) => l.includes('ECONNRESET'))).toHaveLength(1);
  });

  it('with --json, reports failures as one JSON object on stdout', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'sw-cli-login-'));
    const stdout: string[] = [];
    const code = await runLoginCli(
      {
        cwd: dir,
        homedir: '/Users/nobody',
        stdout: (l) => stdout.push(l),
        stderr: () => undefined,
        fetchImpl: async () => {
          throw new Error('getaddrinfo ENOTFOUND');
        },
      },
      { json: true },
    );
    expect(code).toBe(1);
    expect(JSON.parse(stdout[0])).toMatchObject({ status: 'error', error: 'network' });
  });

  it('names the keyId to revoke when the minted key cannot be written', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'sw-cli-login-'));
    const blocker = join(dir, 'not-a-dir');
    writeFileSync(blocker, '');
    const stdout: string[] = [];
    const code = await runLoginCli(
      {
        envFile: join(blocker, '.env'),
        cwd: dir,
        homedir: '/Users/nobody',
        stdout: (l) => stdout.push(l),
        stderr: () => undefined,
        sleep: async () => undefined,
        now: frozenNow,
        fetchImpl: async (input) => {
          const url = String(input);
          if (url.includes('/device_authorization')) return device();
          if (url.includes('/oauth/token')) return jsonResponse(200, { access_token: FAKE_TOKEN });
          return jsonResponse(200, { key: FAKE, keyId: 'key_orphan' });
        },
      },
      { json: true },
    );
    expect(code).toBe(1);
    const last = JSON.parse(stdout[stdout.length - 1]);
    expect(last).toMatchObject({ status: 'error', error: 'env_write' });
    expect(last.detail).toContain('key_orphan');
    expect(last.detail).toContain(FAKE.slice(0, 12));
    expect(KEY_LEAK_RE.test(stdout.join('\n'))).toBe(false);
  });
});

describe('git-tracked .env', () => {
  it('refuses trial and login before any network call', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'sw-cli-git-'));
    writeFileSync(join(dir, '.env'), 'OTHER=1\n');
    execFileSync('git', ['init', '-q'], { cwd: dir });
    execFileSync('git', ['add', '.env'], { cwd: dir });
    let fetched = 0;
    const deps = {
      cwd: dir,
      homedir: '/Users/nobody',
      stdout: () => undefined,
      stderr: () => undefined,
      fetchImpl: async () => {
        fetched += 1;
        return jsonResponse(500, {});
      },
    };
    resetStartTrialLock();
    expect(await runTrialCli(deps, {})).toBe(2);
    expect(await runLoginCli(deps, {})).toBe(2);
    expect(fetched).toBe(0);
    expect(readFileSync(join(dir, '.env'), 'utf8')).toBe('OTHER=1\n');
  });
});
