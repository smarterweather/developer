import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { KEY_VAR } from '../src/env.js';
import { attachJsonRpcProxy, rewriteToolsList } from '../src/proxy.js';

const FAKE = `sw_live_${'kl'.repeat(20)}`;
const FAKE2 = `sw_live_${'mn'.repeat(20)}`;
const KEY_LEAK_RE = /sw_(?:live|test)_[A-Za-z0-9_-]{20,}/;

describe('json-rpc proxy', () => {
  it('rewriteToolsList replaces hosted start_trial and keeps other tools', () => {
    const rewritten = rewriteToolsList({
      tools: [
        { name: 'get_plans', description: 'plans' },
        { name: 'start_trial', description: 'hosted mint that returns api_key' },
      ],
    }) as { tools: { name: string; description: string }[] };
    expect(rewritten.tools.map((t) => t.name)).toEqual(['get_plans', 'start_trial']);
    expect(rewritten.tools[1].description).toMatch(/Never prints the bearer/);
  });

  it('answers start_trial locally and does not forward it', async () => {
    const hostIn = new PassThrough();
    const hostOut = new PassThrough();
    const childIn = new PassThrough();
    const childOut = new PassThrough();
    const childSaw: string[] = [];
    childIn.on('data', (c: Buffer) => childSaw.push(c.toString('utf8')));

    const payload = { status: 'ok', key_prefix: 'sw_live_abab', env_path: '/tmp/proj/.env' };
    attachJsonRpcProxy({
      hostIn,
      hostOut,
      childIn,
      childOut,
      startTrial: async () => payload,
    });

    const outP = new Promise<string>((resolve) => {
      hostOut.once('data', (c: Buffer) => resolve(c.toString('utf8')));
    });

    hostIn.write(
      `${JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'start_trial', arguments: {} } })}\n`,
    );

    const msg = JSON.parse(await outP);
    expect(msg.id).toBe(7);
    expect(msg.result.structuredContent).toEqual(payload);
    expect(msg.result.content[0].text.includes('sw_live_abab')).toBe(true);
    expect(childSaw.join('').includes('start_trial')).toBe(false);
  });

  it('rewrites tools/list results', async () => {
    const hostIn = new PassThrough();
    const hostOut = new PassThrough();
    const childIn = new PassThrough();
    const childOut = new PassThrough();
    attachJsonRpcProxy({
      hostIn,
      hostOut,
      childIn,
      childOut,
      startTrial: async () => ({ status: 'error', error: 'network' }),
    });

    const outP = new Promise<string>((resolve) => {
      hostOut.once('data', (c: Buffer) => resolve(c.toString('utf8')));
    });

    hostIn.write(`${JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'tools/list' })}\n`);
    await new Promise((r) => setTimeout(r, 10));
    childOut.write(
      `${JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        result: { tools: [{ name: 'start_trial', description: 'leaks api_key' }] },
      })}\n`,
    );

    const msg = JSON.parse(await outP);
    expect(msg.result.tools[0].name).toBe('start_trial');
    expect(msg.result.tools[0].description).toMatch(/Never prints the bearer/);
  });

  it('passes through unrelated traffic and batches', async () => {
    const hostIn = new PassThrough();
    const hostOut = new PassThrough();
    const childIn = new PassThrough();
    const childOut = new PassThrough();
    attachJsonRpcProxy({
      hostIn,
      hostOut,
      childIn,
      childOut,
      startTrial: async () => ({}),
    });

    const childP = new Promise<string>((resolve) => {
      childIn.once('data', (c: Buffer) => resolve(c.toString('utf8')));
    });
    const hostP = new Promise<string>((resolve) => {
      hostOut.once('data', (c: Buffer) => resolve(c.toString('utf8')));
    });

    hostIn.write(`${JSON.stringify([{ jsonrpc: '2.0', id: 1, method: 'ping' }])}\n`);
    childOut.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, result: { ok: true } })}\n`);

    expect(await childP).toMatch(/ping/);
    expect(await hostP).toMatch(/ok/);
  });

  it('create_api_key already_configured does not forward', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'sw-proxy-'));
    writeFileSync(join(dir, '.env'), `${KEY_VAR}=${FAKE}\n`);
    const hostIn = new PassThrough();
    const hostOut = new PassThrough();
    const childIn = new PassThrough();
    const childOut = new PassThrough();
    const childSaw: string[] = [];
    childIn.on('data', (c: Buffer) => childSaw.push(c.toString('utf8')));

    attachJsonRpcProxy({
      hostIn,
      hostOut,
      childIn,
      childOut,
      startTrial: async () => ({}),
      sink: {
        resolveEnvPath: async () => ({ ok: true, path: join(dir, '.env') }),
      },
    });

    const outP = new Promise<string>((resolve) => {
      hostOut.once('data', (c: Buffer) => resolve(c.toString('utf8')));
    });
    hostIn.write(
      `${JSON.stringify({ jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 'create_api_key', arguments: { name: 'x' } } })}\n`,
    );
    const msg = JSON.parse(await outP);
    expect(msg.result.structuredContent.status).toBe('already_configured');
    expect(msg.result.structuredContent.source).toBe('env_file');
    expect(KEY_LEAK_RE.test(JSON.stringify(msg))).toBe(false);
    expect(childSaw.join('')).toBe('');
  });

  it('create_api_key with a process-env key reports no env_path', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'sw-proxy-'));
    const hostIn = new PassThrough();
    const hostOut = new PassThrough();
    const childIn = new PassThrough();
    const childOut = new PassThrough();
    const childSaw: string[] = [];
    childIn.on('data', (c: Buffer) => childSaw.push(c.toString('utf8')));

    attachJsonRpcProxy({
      hostIn,
      hostOut,
      childIn,
      childOut,
      startTrial: async () => ({}),
      sink: {
        processEnvKey: FAKE,
        resolveEnvPath: async () => ({ ok: true, path: join(dir, '.env') }),
      },
    });

    const outP = new Promise<string>((resolve) => {
      hostOut.once('data', (c: Buffer) => resolve(c.toString('utf8')));
    });
    hostIn.write(
      `${JSON.stringify({ jsonrpc: '2.0', id: 21, method: 'tools/call', params: { name: 'create_api_key', arguments: { name: 'x' } } })}\n`,
    );
    const sc = JSON.parse(await outP).result.structuredContent;
    expect(sc.source).toBe('process_env');
    expect(sc.env_path).toBeUndefined();
    expect(sc.handling).toContain('process environment');
    expect(childSaw.join('')).toBe('');
  });

  it('create_api_key with an unexpanded placeholder forwards (not configured)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'sw-proxy-'));
    const hostIn = new PassThrough();
    const hostOut = new PassThrough();
    const childIn = new PassThrough();
    const childOut = new PassThrough();

    attachJsonRpcProxy({
      hostIn,
      hostOut,
      childIn,
      childOut,
      startTrial: async () => ({}),
      sink: {
        processEnvKey: '${SMARTERWEATHER_API_KEY}',
        resolveEnvPath: async () => ({ ok: true, path: join(dir, '.env') }),
      },
    });

    const childP = new Promise<string>((resolve) => {
      childIn.once('data', (c: Buffer) => resolve(c.toString('utf8')));
    });
    hostIn.write(
      `${JSON.stringify({ jsonrpc: '2.0', id: 22, method: 'tools/call', params: { name: 'create_api_key', arguments: { name: 'x' } } })}\n`,
    );
    expect(await childP).toMatch(/create_api_key/);
  });

  it('sinks create_api_key and strips key from the result', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'sw-proxy-'));
    const envPath = join(dir, '.env');
    const hostIn = new PassThrough();
    const hostOut = new PassThrough();
    const childIn = new PassThrough();
    const childOut = new PassThrough();

    attachJsonRpcProxy({
      hostIn,
      hostOut,
      childIn,
      childOut,
      startTrial: async () => ({}),
      sink: {
        resolveEnvPath: async () => ({ ok: true, path: envPath }),
      },
    });

    const childP = new Promise<void>((resolve) => {
      childIn.once('data', () => resolve());
    });
    hostIn.write(
      `${JSON.stringify({ jsonrpc: '2.0', id: 11, method: 'tools/call', params: { name: 'create_api_key', arguments: { name: 'x' } } })}\n`,
    );
    await childP;

    const outP = new Promise<string>((resolve) => {
      hostOut.once('data', (c: Buffer) => resolve(c.toString('utf8')));
    });
    childOut.write(
      `${JSON.stringify({
        jsonrpc: '2.0',
        id: 11,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                key: FAKE,
                keyId: 'key_1',
                keyPrefix: FAKE.slice(0, 12),
                handling: 'shown once',
              }),
            },
          ],
          structuredContent: {
            key: FAKE,
            keyId: 'key_1',
            keyPrefix: FAKE.slice(0, 12),
            handling: 'shown once',
          },
        },
      })}\n`,
    );

    const msg = JSON.parse(await outP);
    expect(msg.result.structuredContent.key).toBeUndefined();
    expect(msg.result.structuredContent.env_path).toBe(envPath);
    expect(msg.result.structuredContent.handling).toMatch(/written to \.env/);
    expect(KEY_LEAK_RE.test(JSON.stringify(msg))).toBe(false);
    expect(readFileSync(envPath, 'utf8')).toContain(FAKE);
  });

  it('sinks rotate_api_key and strips newKey.key', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'sw-proxy-'));
    const envPath = join(dir, '.env');
    writeFileSync(envPath, `${KEY_VAR}=${FAKE}\n`);
    const hostIn = new PassThrough();
    const hostOut = new PassThrough();
    const childIn = new PassThrough();
    const childOut = new PassThrough();

    attachJsonRpcProxy({
      hostIn,
      hostOut,
      childIn,
      childOut,
      startTrial: async () => ({}),
      sink: {
        resolveEnvPath: async () => ({ ok: true, path: envPath }),
      },
    });

    hostIn.write(
      `${JSON.stringify({ jsonrpc: '2.0', id: 12, method: 'tools/call', params: { name: 'rotate_api_key', arguments: { key_id: 'k' } } })}\n`,
    );
    await new Promise((r) => setTimeout(r, 10));

    const outP = new Promise<string>((resolve) => {
      hostOut.once('data', (c: Buffer) => resolve(c.toString('utf8')));
    });
    childOut.write(
      `${JSON.stringify({
        jsonrpc: '2.0',
        id: 12,
        result: {
          structuredContent: {
            newKey: { key: FAKE2, keyId: 'key_2', keyPrefix: FAKE2.slice(0, 12) },
            oldKey: { keyId: 'key_1', keyPrefix: FAKE.slice(0, 12), revokedAt: '2099-01-01T00:00:00Z' },
          },
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                newKey: { key: FAKE2, keyId: 'key_2', keyPrefix: FAKE2.slice(0, 12) },
                oldKey: { keyId: 'key_1', keyPrefix: FAKE.slice(0, 12), revokedAt: '2099-01-01T00:00:00Z' },
              }),
            },
          ],
        },
      })}\n`,
    );

    const msg = JSON.parse(await outP);
    expect(msg.result.structuredContent.newKey.key).toBeUndefined();
    expect(msg.result.structuredContent.env_path).toBe(envPath);
    expect(KEY_LEAK_RE.test(JSON.stringify(msg))).toBe(false);
    expect(readFileSync(envPath, 'utf8')).toContain(FAKE2);
    expect(readFileSync(envPath, 'utf8').includes(FAKE)).toBe(false);
  });

  it('passes through unparseable create results unchanged', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'sw-proxy-'));
    const hostIn = new PassThrough();
    const hostOut = new PassThrough();
    const childIn = new PassThrough();
    const childOut = new PassThrough();

    attachJsonRpcProxy({
      hostIn,
      hostOut,
      childIn,
      childOut,
      startTrial: async () => ({}),
      sink: {
        resolveEnvPath: async () => ({ ok: true, path: join(dir, '.env') }),
      },
    });

    hostIn.write(
      `${JSON.stringify({ jsonrpc: '2.0', id: 13, method: 'tools/call', params: { name: 'create_api_key', arguments: {} } })}\n`,
    );
    await new Promise((r) => setTimeout(r, 10));

    const outP = new Promise<string>((resolve) => {
      hostOut.once('data', (c: Buffer) => resolve(c.toString('utf8')));
    });
    childOut.write(
      `${JSON.stringify({
        jsonrpc: '2.0',
        id: 13,
        result: { content: [{ type: 'text', text: 'not-json' }] },
      })}\n`,
    );
    const msg = JSON.parse(await outP);
    expect(msg.result.content[0].text).toBe('not-json');
  });

  it('redacts a key the server put in a non-JSON text block', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'sw-proxy-'));
    const envPath = join(dir, '.env');
    const { hostIn, hostOut, childOut } = wire(envPath);

    hostIn.write(
      `${JSON.stringify({ jsonrpc: '2.0', id: 14, method: 'tools/call', params: { name: 'create_api_key', arguments: {} } })}\n`,
    );
    await new Promise((r) => setTimeout(r, 10));

    const outP = nextLine(hostOut);
    childOut.write(
      `${JSON.stringify({
        jsonrpc: '2.0',
        id: 14,
        result: {
          structuredContent: { key: FAKE, keyId: 'key_1' },
          content: [
            { type: 'text', text: JSON.stringify({ key: FAKE, keyId: 'key_1' }) },
            { type: 'text', text: `Your key: ${FAKE}` },
          ],
        },
      })}\n`,
    );
    const msg = JSON.parse(await outP);
    expect(KEY_LEAK_RE.test(JSON.stringify(msg))).toBe(false);
    expect(msg.result.content[1].text).toContain('[redacted');
    expect(readFileSync(envPath, 'utf8')).toContain(FAKE);
  });

  it('refuses create_api_key and rotate_api_key before forwarding when .env is git-tracked', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'sw-proxy-git-'));
    const envPath = join(dir, '.env');
    writeFileSync(envPath, 'OTHER=1\n');
    execFileSync('git', ['init', '-q'], { cwd: dir });
    execFileSync('git', ['add', '.env'], { cwd: dir });
    const { hostIn, hostOut, childSaw } = wire(envPath);

    for (const [id, name] of [
      [15, 'create_api_key'],
      [16, 'rotate_api_key'],
    ] as const) {
      const outP = nextLine(hostOut);
      hostIn.write(
        `${JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: {} } })}\n`,
      );
      const msg = JSON.parse(await outP);
      expect(msg.id).toBe(id);
      expect(msg.result.isError).toBe(true);
      expect(msg.result.structuredContent.error).toMatch(/tracked by git/);
    }
    expect(childSaw.join('')).toBe('');
  });

  it('passes a JSON-RPC error for a sink call through and forgets the id', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'sw-proxy-'));
    const { hostIn, hostOut, childOut } = wire(join(dir, '.env'));

    hostIn.write(
      `${JSON.stringify({ jsonrpc: '2.0', id: 17, method: 'tools/call', params: { name: 'create_api_key', arguments: {} } })}\n`,
    );
    await new Promise((r) => setTimeout(r, 10));

    const errLine = JSON.stringify({ jsonrpc: '2.0', id: 17, error: { code: -32001, message: 'unauthorized' } });
    let outP = nextLine(hostOut);
    childOut.write(`${errLine}\n`);
    expect((await outP).trim()).toBe(errLine);

    // A later result reusing the id is not treated as a mint to sink.
    const reuse = JSON.stringify({ jsonrpc: '2.0', id: 17, result: { structuredContent: { ok: true } } });
    outP = nextLine(hostOut);
    childOut.write(`${reuse}\n`);
    expect((await outP).trim()).toBe(reuse);
  });
});

function wire(envPath: string) {
  const hostIn = new PassThrough();
  const hostOut = new PassThrough();
  const childIn = new PassThrough();
  const childOut = new PassThrough();
  const childSaw: string[] = [];
  childIn.on('data', (c: Buffer) => childSaw.push(c.toString('utf8')));
  attachJsonRpcProxy({
    hostIn,
    hostOut,
    childIn,
    childOut,
    startTrial: async () => ({}),
    sink: { resolveEnvPath: async () => ({ ok: true, path: envPath }) },
  });
  return { hostIn, hostOut, childOut, childSaw };
}

function nextLine(stream: PassThrough): Promise<string> {
  return new Promise((resolve) => {
    stream.once('data', (c: Buffer) => resolve(c.toString('utf8')));
  });
}
