import { describe, expect, it } from 'vitest';
import {
  DEFAULT_OAUTH_CALLBACK_PORT,
  DEFAULT_OAUTH_CLIENT_ID,
  buildArgs,
} from '../src/args.js';

const DEFAULT_URL = 'https://mcp.developers.smarterweather.com';
const AUTH_URL = `${DEFAULT_URL}?auth=required`;
const STATIC_INFO = JSON.stringify({ client_id: DEFAULT_OAUTH_CLIENT_ID });

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
    it('appends ?auth=required, pins port 3334, and injects static client info', () => {
      expect(buildArgs([], { authMode: 'required', defaultUrl: DEFAULT_URL })).toEqual([
        AUTH_URL,
        DEFAULT_OAUTH_CALLBACK_PORT,
        '--static-oauth-client-info',
        STATIC_INFO,
      ]);
    });

    it('appends with & when the URL already has a query string', () => {
      expect(
        buildArgs([], {
          url: 'http://dev.example.com/mcp?x=1',
          authMode: 'required',
          defaultUrl: DEFAULT_URL,
        }),
      ).toEqual([
        'http://dev.example.com/mcp?x=1&auth=required',
        DEFAULT_OAUTH_CALLBACK_PORT,
        '--static-oauth-client-info',
        STATIC_INFO,
      ]);
    });

    it('applies to a user-provided positional URL too', () => {
      expect(
        buildArgs(['http://dev.example.com/mcp', '--debug'], {
          authMode: 'required',
          defaultUrl: DEFAULT_URL,
        }),
      ).toEqual([
        'http://dev.example.com/mcp?auth=required',
        DEFAULT_OAUTH_CALLBACK_PORT,
        '--debug',
        '--static-oauth-client-info',
        STATIC_INFO,
      ]);
    });

    it('does not double-append when the URL already carries an auth param', () => {
      expect(
        buildArgs(['http://dev.example.com/mcp?auth=false'], {
          authMode: 'required',
          defaultUrl: DEFAULT_URL,
        }),
      ).toEqual([
        'http://dev.example.com/mcp?auth=false',
        DEFAULT_OAUTH_CALLBACK_PORT,
        '--static-oauth-client-info',
        STATIC_INFO,
      ]);
    });

    it('is case-insensitive and ignores other values', () => {
      expect(buildArgs([], { authMode: 'REQUIRED', defaultUrl: DEFAULT_URL })).toEqual([
        AUTH_URL,
        DEFAULT_OAUTH_CALLBACK_PORT,
        '--static-oauth-client-info',
        STATIC_INFO,
      ]);
      expect(buildArgs([], { authMode: 'optional', defaultUrl: DEFAULT_URL })).toEqual([DEFAULT_URL]);
      expect(buildArgs([], { authMode: '', defaultUrl: DEFAULT_URL })).toEqual([DEFAULT_URL]);
    });

    it('does not inject port when the user already passed one', () => {
      expect(
        buildArgs(['http://dev.example.com/mcp', '9696'], {
          authMode: 'required',
          defaultUrl: DEFAULT_URL,
        }),
      ).toEqual([
        'http://dev.example.com/mcp?auth=required',
        '9696',
        '--static-oauth-client-info',
        STATIC_INFO,
      ]);
    });

    it('does not inject static client info when the user already passed the flag', () => {
      const custom = JSON.stringify({ client_id: 'custom-id' });
      expect(
        buildArgs(['--static-oauth-client-info', custom], {
          authMode: 'required',
          defaultUrl: DEFAULT_URL,
        }),
      ).toEqual([AUTH_URL, DEFAULT_OAUTH_CALLBACK_PORT, '--static-oauth-client-info', custom]);
    });

    it('uses opts.oauthClientId when set', () => {
      expect(
        buildArgs([], {
          authMode: 'required',
          oauthClientId: 'staging-client',
          defaultUrl: DEFAULT_URL,
        }),
      ).toEqual([
        AUTH_URL,
        DEFAULT_OAUTH_CALLBACK_PORT,
        '--static-oauth-client-info',
        JSON.stringify({ client_id: 'staging-client' }),
      ]);
    });
  });
});
