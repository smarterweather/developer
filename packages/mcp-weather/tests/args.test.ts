import { describe, expect, it } from 'vitest';
import { buildArgs } from '../src/args.js';

const DEFAULT_URL = 'https://mcp.smarterweather.com/mcp';

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
      // mcp-remote signature: <url> [port]. User passes both.
      const args = buildArgs(['https://example.com/mcp', '4567'], {
        defaultUrl: DEFAULT_URL,
      });
      expect(args).toEqual(['https://example.com/mcp', '4567']);
    });
  });

  describe('API-key header injection', () => {
    it('does not inject Authorization when apiKey is undefined', () => {
      const args = buildArgs([], { defaultUrl: DEFAULT_URL });
      expect(args).not.toContain('--header');
    });

    it('does not inject Authorization when apiKey is empty string', () => {
      const args = buildArgs([], { apiKey: '', defaultUrl: DEFAULT_URL });
      expect(args).not.toContain('--header');
    });

    it('injects Authorization Bearer header when apiKey is set', () => {
      const args = buildArgs([], { apiKey: 'sw_live_test', defaultUrl: DEFAULT_URL });
      expect(args).toEqual([DEFAULT_URL, '--header', 'Authorization:Bearer sw_live_test']);
    });

    it('uses the no-space form recommended by mcp-remote (Authorization:Bearer X, not Authorization: Bearer X)', () => {
      const args = buildArgs([], { apiKey: 'sw_live_test', defaultUrl: DEFAULT_URL });
      const headerIdx = args.indexOf('--header');
      expect(headerIdx).toBeGreaterThanOrEqual(0);
      expect(args[headerIdx + 1]).toBe('Authorization:Bearer sw_live_test');
    });

    it('does not double-inject when the user already passed --header Authorization', () => {
      const args = buildArgs(
        ['--header', 'Authorization:Bearer custom-token'],
        { apiKey: 'sw_live_test', defaultUrl: DEFAULT_URL },
      );
      const headerCount = args.filter((a) => a === '--header').length;
      expect(headerCount).toBe(1);
      expect(args).toEqual([
        DEFAULT_URL,
        '--header',
        'Authorization:Bearer custom-token',
      ]);
    });

    it('detects an existing Authorization header case-insensitively', () => {
      const args = buildArgs(
        ['--header', 'authorization:Bearer custom'],
        { apiKey: 'sw_live_test', defaultUrl: DEFAULT_URL },
      );
      const headerCount = args.filter((a) => a === '--header').length;
      expect(headerCount).toBe(1);
    });

    it('still injects when the user passed a non-Authorization --header', () => {
      const args = buildArgs(
        ['--header', 'X-Custom:value'],
        { apiKey: 'sw_live_test', defaultUrl: DEFAULT_URL },
      );
      expect(args).toEqual([
        DEFAULT_URL,
        '--header',
        'X-Custom:value',
        '--header',
        'Authorization:Bearer sw_live_test',
      ]);
    });
  });

  describe('argv pass-through', () => {
    it('forwards arbitrary mcp-remote flags verbatim', () => {
      const args = buildArgs(['--debug', '--transport', 'http-only'], {
        defaultUrl: DEFAULT_URL,
      });
      expect(args).toEqual([
        DEFAULT_URL,
        '--debug',
        '--transport',
        'http-only',
      ]);
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

    it('combines positional override + flags + injected API-key header', () => {
      const args = buildArgs(
        ['https://override.example.com/mcp', '--debug'],
        { apiKey: 'sw_live_test', defaultUrl: DEFAULT_URL },
      );
      expect(args).toEqual([
        'https://override.example.com/mcp',
        '--debug',
        '--header',
        'Authorization:Bearer sw_live_test',
      ]);
    });
  });
});
