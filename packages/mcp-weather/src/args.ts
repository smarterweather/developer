// Pure-function argv builder for the mcp-remote wrapper.
//
// Exported separately from src/index.ts so unit tests can assert
// the argv assembly without spawning a child process. The CLI
// entry point in src/index.ts is thin glue: parse env, call
// buildArgs(), spawn() mcp-remote with the result.
//
// Precedence rules (URL):
//   1. First arg in userArgs that has an http:// or https:// scheme
//      (mcp-remote treats this as the target URL positional[0], and
//      rejects schemeless URLs at its own validation step). When
//      present, opts.url + opts.defaultUrl are both ignored -- the
//      user explicitly asked for that URL.
//   2. opts.url (typically sourced from SMARTERWEATHER_MCP_URL).
//   3. opts.defaultUrl (the package-baked-in default).
//
// Precedence rules (Authorization header):
//   - If opts.injectAuthHeader is true AND the user did not pass their
//     own --header "Authorization:..." flag, inject
//     --header "Authorization:${SMARTERWEATHER_AUTH_HEADER}".
//     The child process env must set SMARTERWEATHER_AUTH_HEADER to
//     "Bearer <key>" so mcp-remote expands the placeholder — the key
//     never appears in argv (or in mcp-remote's pre-expansion header log).
//   - A user-supplied --header Authorization: still wins.

import { AUTH_HEADER_VAR } from './env.js';

export interface BuildArgsOptions {
  /** Optional URL override (typically from SMARTERWEATHER_MCP_URL). */
  url?: string | undefined;
  /** When true, inject Authorization:${SMARTERWEATHER_AUTH_HEADER}. */
  injectAuthHeader?: boolean | undefined;
  /** Default URL when neither a user-provided positional nor opts.url
   * is set. */
  defaultUrl: string;
}

const SCHEME_RE = /^https?:\/\//i;
const AUTH_HEADER_RE = /^authorization\s*:/i;

export function buildArgs(userArgs: readonly string[], opts: BuildArgsOptions): string[] {
  const args = [...userArgs];

  // URL injection.
  const userProvidedUrl = userArgs.some((a) => SCHEME_RE.test(a));
  if (!userProvidedUrl) {
    const resolved = opts.url ?? opts.defaultUrl;
    args.unshift(resolved);
  }

  // Authorization header via env-expanded placeholder (never the raw key).
  if (opts.injectAuthHeader) {
    const userHasAuthHeader = userArgs.some((a, i) => {
      if (a !== '--header') return false;
      const next = userArgs[i + 1];
      return typeof next === 'string' && AUTH_HEADER_RE.test(next);
    });
    if (!userHasAuthHeader) {
      args.push('--header', `Authorization:\${${AUTH_HEADER_VAR}}`);
    }
  }

  return args;
}
