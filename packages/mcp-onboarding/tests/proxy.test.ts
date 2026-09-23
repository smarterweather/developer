import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { attachJsonRpcProxy, rewriteToolsList } from '../src/proxy.js';

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
});
