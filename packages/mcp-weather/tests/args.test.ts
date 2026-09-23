import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildArgs } from '../src/args.js';
import { describeMissingKey, KEY_VAR, resolveApiKey } from '../src/env.js';

const DEFAULT_URL = 'https://mcp.smarterweather.com';
const FAKE = `sw_live_${'op'.repeat(20)}`;

describe('buildArgs', () => {
  describe('URL resolution', () => {
    it('uses the default URL when no positional and no env override', () => {
      const args = buildArgs([], { defaultUrl: DEFAULT_URL });
      expect(args).toEqual([DEFAULT_URL]);
    });

    it('uses opts.url when set and no positional given', () => {
      const args = buildArgs([], {
        url: 'http://dev-alb.example.com/mcp',
        defaultUrl: DEFAULT_URL,
      });
      expect(args).toEqual(['http://dev-alb.example.com/mcp']);
    });

    it('respects a positional URL over both opts.url and defaultUrl', () => {
      const args = buildArgs(['https://override.example.com/mcp'], {
        url: 'http://dev-alb.example.com/mcp',
        defaultUrl: DEFAULT_URL,
      });
      expect(args).toEqual(['https://override.example.com/mcp']);
    });

    it('recognizes positional URLs in any position (after a flag)', () => {
      const args = buildArgs(['--debug', 'https://override.example.com/mcp'], {
        defaultUrl: DEFAULT_URL,
      });
      expect(args).toEqual(['--debug', 'https://override.example.com/mcp']);
    });

    it('recognizes http and https schemes case-insensitively', () => {
      const args = buildArgs(['HTTP://example.com/mcp'], { defaultUrl: DEFAULT_URL });
      expect(args).toEqual(['HTTP://example.com/mcp']);
    });

    it('does not inject default when user passes a port positional WITH a URL', () => {
      const args = buildArgs(['https://example.com/mcp', '4567'], {
        defaultUrl: DEFAULT_URL,
      });
      expect(args).toEqual(['https://example.com/mcp', '4567']);
    });
  });

  describe('API-key header injection', () => {
    it('does not inject Authorization when injectAuthHeader is false', () => {
      const args = buildArgs([], { defaultUrl: DEFAULT_URL });
      expect(args).not.toContain('--header');
    });

    it('injects Authorization:${SMARTERWEATHER_AUTH_HEADER} when requested', () => {
      const args = buildArgs([], { injectAuthHeader: true, defaultUrl: DEFAULT_URL });
      expect(args).toEqual([
        DEFAULT_URL,
        '--header',
        'Authorization:${SMARTERWEATHER_AUTH_HEADER}',
      ]);
      expect(args.join(' ').includes(FAKE)).toBe(false);
    });

    it('does not double-inject when the user already passed --header Authorization', () => {
      const args = buildArgs(['--header', 'Authorization:Bearer custom-token'], {
        injectAuthHeader: true,
        defaultUrl: DEFAULT_URL,
      });
      const headerCount = args.filter((a) => a === '--header').length;
      expect(headerCount).toBe(1);
      expect(args).toEqual([
        DEFAULT_URL,
        '--header',
        'Authorization:Bearer custom-token',
      ]);
    });

    it('detects an existing Authorization header case-insensitively', () => {
      const args = buildArgs(['--header', 'authorization:Bearer custom'], {
        injectAuthHeader: true,
        defaultUrl: DEFAULT_URL,
      });
      const headerCount = args.filter((a) => a === '--header').length;
      expect(headerCount).toBe(1);
    });

    it('still injects when the user passed a non-Authorization --header', () => {
      const args = buildArgs(['--header', 'X-Custom:value'], {
        injectAuthHeader: true,
        defaultUrl: DEFAULT_URL,
      });
      expect(args).toEqual([
        DEFAULT_URL,
        '--header',
        'X-Custom:value',
        '--header',
        'Authorization:${SMARTERWEATHER_AUTH_HEADER}',
      ]);
    });
  });

  describe('argv pass-through', () => {
    it('forwards arbitrary mcp-remote flags verbatim', () => {
      const args = buildArgs(['--debug', '--transport', 'http-only'], {
        defaultUrl: DEFAULT_URL,
      });
      expect(args).toEqual([DEFAULT_URL, '--debug', '--transport', 'http-only']);
    });

    it('preserves user arg order', () => {
      const args = buildArgs(
        ['--debug', 'https://override.example.com/mcp', '--transport', 'http-only'],
        { defaultUrl: DEFAULT_URL },
      );
      expect(args).toEqual([
        '--debug',
        'https://override.example.com/mcp',
        '--transport',
        'http-only',
      ]);
    });

    it('combines positional override + flags + injected auth header placeholder', () => {
      const args = buildArgs(['https://override.example.com/mcp', '--debug'], {
        injectAuthHeader: true,
        defaultUrl: DEFAULT_URL,
      });
      expect(args).toEqual([
        'https://override.example.com/mcp',
        '--debug',
        '--header',
        'Authorization:${SMARTERWEATHER_AUTH_HEADER}',
      ]);
      expect(JSON.stringify(args).includes('sw_live_')).toBe(false);
    });
  });
});

describe('resolveApiKey', () => {
  it('prefers a usable process env key', () => {
    const hit = resolveApiKey({
      processEnvKey: FAKE,
      cwd: '/tmp/proj',
      homedir: '/Users/nobody',
      warn: () => undefined,
    });
    expect(hit).toEqual({ ok: true, key: FAKE, source: 'env' });
  });

  it('treats unexpanded ${…} as unset and falls through to .env', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sw-weather-env-'));
    writeFileSync(join(dir, '.env'), `${KEY_VAR}=${FAKE}\n`);
    const warnings: string[] = [];
    const hit = resolveApiKey({
      processEnvKey: '${SMARTERWEATHER_API_KEY}',
      cwd: dir,
      homedir: '/Users/nobody',
      warn: (m) => warnings.push(m),
    });
    expect(hit).toEqual({ ok: true, key: FAKE, source: 'cwd' });
    expect(warnings.length).toBe(1);
  });

  it('reads SMARTERWEATHER_ENV_FILE', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sw-weather-env-'));
    const custom = join(dir, 'custom.env');
    writeFileSync(custom, `${KEY_VAR}=${FAKE}\n`);
    const hit = resolveApiKey({
      envFile: custom,
      cwd: '/',
      homedir: '/Users/nobody',
      warn: () => undefined,
    });
    expect(hit).toEqual({ ok: true, key: FAKE, source: 'env_file' });
  });

  it('refuses guarded cwd when no env key', () => {
    const hit = resolveApiKey({
      cwd: '/',
      homedir: '/Users/nobody',
      warn: () => undefined,
    });
    expect(hit).toEqual({ ok: false, reason: 'guarded_cwd', searched: [`$${KEY_VAR}`] });
  });

  it('skips an unreadable env file with a warning and says where it looked', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sw-weather-env-'));
    const warnings: string[] = [];
    const hit = resolveApiKey({
      envFile: dir,
      cwd: dir,
      homedir: '/Users/nobody',
      warn: (m) => warnings.push(m),
    });
    expect(hit.ok).toBe(false);
    expect(warnings.join('\n')).toMatch(/cannot read/);
    if (!hit.ok) {
      const line = describeMissingKey(hit);
      expect(line).toContain(dir);
      expect(line).toContain(join(dir, '.env'));
      expect(line).toMatch(/OAuth/);
    }
  });
});
