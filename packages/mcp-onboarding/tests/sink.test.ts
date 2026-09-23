import { mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { KEY_VAR, parseEnvKey, replaceEnvKey } from '../src/env.js';
import {
  checkAlreadyConfigured,
  writeNewKey,
  writeReplacedKey,
} from '../src/sink.js';

const FAKE = `sw_live_${'ef'.repeat(20)}`;
const FAKE2 = `sw_live_${'gh'.repeat(20)}`;

describe('sink', () => {
  it('writeNewKey writes 0600 and returns only the prefix', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sw-sink-'));
    const envPath = join(dir, '.env');
    const written = writeNewKey(envPath, FAKE);
    expect(written.key_prefix).toBe(FAKE.slice(0, 12));
    expect(written.env_path).toBe(envPath);
    expect(statSync(envPath).mode & 0o777).toBe(0o600);
    expect(readFileSync(join(dir, '.gitignore'), 'utf8')).toContain('.env');
    expect(JSON.stringify(written).includes(FAKE)).toBe(false);
  });

  it('writeReplacedKey replaces an existing key line', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sw-sink-'));
    const envPath = join(dir, '.env');
    writeFileSync(envPath, `FOO=1\n${KEY_VAR}=${FAKE}\nBAR=2\n`);
    const written = writeReplacedKey(envPath, FAKE2);
    expect(written.key_prefix).toBe(FAKE2.slice(0, 12));
    const body = readFileSync(envPath, 'utf8');
    expect(parseEnvKey(body)).toBe(FAKE2);
    expect(body).toContain('FOO=1');
    expect(body).toContain('BAR=2');
    expect(body.includes(FAKE)).toBe(false);
  });

  it('replaceEnvKey appends when the key is missing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sw-sink-'));
    const envPath = join(dir, '.env');
    writeFileSync(envPath, 'FOO=1\n');
    replaceEnvKey(envPath, FAKE);
    expect(parseEnvKey(readFileSync(envPath, 'utf8'))).toBe(FAKE);
  });

  it('checkAlreadyConfigured short-circuits on process env', () => {
    const hit = checkAlreadyConfigured(
      { cwd: '/tmp/proj', homedir: '/Users/nobody', processEnvKey: FAKE },
      '/tmp/proj/.env',
    );
    expect(hit?.status).toBe('already_configured');
    expect(hit && JSON.stringify(hit).includes(FAKE)).toBe(false);
  });
});
