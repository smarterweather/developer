import { mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  displayPrefix,
  ensureGitignore,
  fileUriToPath,
  isGuardedCwd,
  KEY_VAR,
  parseEnvKey,
  readExistingKey,
  resolveEnvPath,
  replaceEnvKey,
  upsertEnvKey,
} from '../src/env.js';

const FAKE = `sw_live_${'ab'.repeat(20)}`;

describe('env', () => {
  it('displayPrefix is the first 12 characters', () => {
    expect(displayPrefix(FAKE)).toBe('sw_live_abab');
    expect(displayPrefix(FAKE)).toHaveLength(12);
  });

  it('parseEnvKey reads unquoted and quoted assignments', () => {
    expect(parseEnvKey(`${KEY_VAR}=${FAKE}\n`)).toBe(FAKE);
    expect(parseEnvKey(`# comment\n${KEY_VAR}="${FAKE}"\n`)).toBe(FAKE);
    expect(parseEnvKey('OTHER=1\n')).toBeUndefined();
  });

  it('isGuardedCwd rejects / and $HOME', () => {
    expect(isGuardedCwd('/', '/Users/alex')).toBe(true);
    expect(isGuardedCwd('/Users/alex', '/Users/alex')).toBe(true);
    expect(isGuardedCwd('/Users/alex/proj', '/Users/alex')).toBe(false);
  });

  it('resolveEnvPath prefers SMARTERWEATHER_ENV_FILE', () => {
    const hit = resolveEnvPath({
      envFile: '/tmp/custom.env',
      rootUris: ['file:///Users/alex/proj'],
      cwd: '/',
      homedir: '/Users/alex',
    });
    expect(hit.ok).toBe(true);
    if (hit.ok) {
      expect(hit.source).toBe('env');
      expect(hit.path.endsWith('custom.env')).toBe(true);
    }
  });

  it('resolveEnvPath uses MCP file:// roots and skips $HOME', () => {
    const hit = resolveEnvPath({
      rootUris: ['file:///Users/alex', 'file:///Users/alex/proj'],
      cwd: '/',
      homedir: '/Users/alex',
    });
    expect(hit.ok).toBe(true);
    if (hit.ok) {
      expect(hit.source).toBe('root');
      expect(hit.path.endsWith('/Users/alex/proj/.env')).toBe(true);
    }
  });

  it('resolveEnvPath refuses a guarded cwd', () => {
    expect(resolveEnvPath({ cwd: '/', homedir: '/Users/alex' }).ok).toBe(false);
  });

  it('fileUriToPath decodes file URIs', () => {
    expect(fileUriToPath('file:///Users/alex/My%20Proj')).toBe('/Users/alex/My Proj');
    expect(fileUriToPath('https://example.com')).toBeUndefined();
  });

  it('upsertEnvKey writes mode 0600 and does not overwrite', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sw-onboarding-env-'));
    const file = join(dir, '.env');
    upsertEnvKey(file, FAKE);
    expect(readExistingKey(file)).toBe(FAKE);
    expect(statSync(file).mode & 0o777).toBe(0o600);
    expect(() => upsertEnvKey(file, 'sw_live_other')).toThrow(/already set/);
    mkdirSync(join(dir, 'nested'), { recursive: true });
    writeFileSync(join(dir, 'notes.txt'), 'keep');
  });

  it('upsertEnvKey appends to an existing file without a key', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sw-onboarding-env-'));
    const file = join(dir, '.env');
    writeFileSync(file, 'FOO=1');
    upsertEnvKey(file, FAKE);
    const body = readFileSync(file, 'utf8');
    expect(body.startsWith('FOO=1\n')).toBe(true);
    expect(parseEnvKey(body)).toBe(FAKE);
  });

  it('ensureGitignore appends .env once', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sw-onboarding-gi-'));
    ensureGitignore(dir);
    ensureGitignore(dir);
    const lines = readFileSync(join(dir, '.gitignore'), 'utf8').trim().split('\n');
    expect(lines.filter((l) => l === '.env')).toEqual(['.env']);
  });

  it('replaceEnvKey replaces in place at mode 0600', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sw-onboarding-env-'));
    const file = join(dir, '.env');
    upsertEnvKey(file, FAKE);
    replaceEnvKey(file, `sw_live_${'zz'.repeat(20)}`);
    expect(readExistingKey(file)?.startsWith('sw_live_zz')).toBe(true);
    expect(statSync(file).mode & 0o777).toBe(0o600);
  });
});
