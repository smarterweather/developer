import { describe, expect, it } from 'vitest';
import { buildArgs } from '../src/args.js';

const DEFAULT_URL = 'https://developers.smarterweather.com/mcp';

describe('buildArgs', () => {
  describe('URL resolution', () => {
    it('uses the default URL when no positional and no env override', () => {
      expect(buildArgs([], { defaultUrl: DEFAULT_URL })).toEqual([DEFAULT_URL]);
    });

    it('uses opts.url when set and no positional given', () => {
      expect(
        buildArgs([], { url: 'http://dev-alb.example.com/mcp', defaultUrl: DEFAULT_URL }),
      ).toEqual(['http://dev-alb.example.com/mcp']);
    });

    it('respects a positional URL over both opts.url and defaultUrl', () => {
      expect(
        buildArgs(['https://override.example.com/mcp'], {
          url: 'http://dev-alb.example.com/mcp',
          defaultUrl: DEFAULT_URL,
        }),
      ).toEqual(['https://override.example.com/mcp']);
    });

    it('passes through extra flags verbatim', () => {
      expect(buildArgs(['--debug', '--transport', 'http-only'], { defaultUrl: DEFAULT_URL })).toEqual([
        DEFAULT_URL,
        '--debug',
        '--transport',
        'http-only',
      ]);
    });
  });

  describe('authMode=required', () => {
    it('appends ?auth=required to the default URL', () => {
      expect(buildArgs([], { authMode: 'required', defaultUrl: DEFAULT_URL })).toEqual([
        `${DEFAULT_URL}?auth=required`,
      ]);
    });

    it('appends with & when the URL already has a query string', () => {
      expect(
        buildArgs([], {
          url: 'http://dev.example.com/mcp?x=1',
          authMode: 'required',
          defaultUrl: DEFAULT_URL,
        }),
      ).toEqual(['http://dev.example.com/mcp?x=1&auth=required']);
    });

    it('applies to a user-provided positional URL too', () => {
      expect(
        buildArgs(['http://dev.example.com/mcp', '--debug'], {
          authMode: 'required',
          defaultUrl: DEFAULT_URL,
        }),
      ).toEqual(['http://dev.example.com/mcp?auth=required', '--debug']);
    });

    it('does not double-append when the URL already carries an auth param', () => {
      expect(
        buildArgs(['http://dev.example.com/mcp?auth=false'], {
          authMode: 'required',
          defaultUrl: DEFAULT_URL,
        }),
      ).toEqual(['http://dev.example.com/mcp?auth=false']);
    });

    it('is case-insensitive and ignores other values', () => {
      expect(buildArgs([], { authMode: 'REQUIRED', defaultUrl: DEFAULT_URL })).toEqual([
        `${DEFAULT_URL}?auth=required`,
      ]);
      expect(buildArgs([], { authMode: 'optional', defaultUrl: DEFAULT_URL })).toEqual([DEFAULT_URL]);
      expect(buildArgs([], { authMode: '', defaultUrl: DEFAULT_URL })).toEqual([DEFAULT_URL]);
    });
  });
});
