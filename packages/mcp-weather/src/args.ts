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
//   - If opts.apiKey is set AND the user did not pass their own
//     --header "Authorization:..." flag, inject
//     --header "Authorization:Bearer <apiKey>".
//   - The "no space" form (Authorization:Bearer X, not
//     "Authorization: Bearer X") is what mcp-remote's README
//     recommends for Windows / Cursor arg-escaping safety.

export interface BuildArgsOptions {
  /** Optional URL override (typically from SMARTERWEATHER_MCP_URL). */
  url?: string | undefined;
  /** Optional API key (typically from SMARTERWEATHER_API_KEY) to
   * inject as a Bearer Authorization header. */
  apiKey?: string | undefined;
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

  // API-key Authorization header injection.
  if (opts.apiKey !== undefined && opts.apiKey !== '') {
    const userHasAuthHeader = userArgs.some((a, i) => {
      if (a !== '--header') return false;
      const next = userArgs[i + 1];
      return typeof next === 'string' && AUTH_HEADER_RE.test(next);
    });
    if (!userHasAuthHeader) {
      args.push('--header', `Authorization:Bearer ${opts.apiKey}`);
    }
  }

  return args;
}
