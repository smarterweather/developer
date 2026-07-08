// Pure-function argv builder for the mcp-remote wrapper.
//
// Same shape as packages/mcp-weather/src/args.ts (kept separately
// deliberately -- the two packages version and publish independently
// and each stays dependency-free beyond mcp-remote itself), with one
// onboarding-specific addition: the `authMode` option appends
// `?auth=required` to the resolved target URL. The hosted onboarding
// server answers anonymous requests 200 by design (open discovery
// tools), and mcp-remote only initiates its OAuth client on a 401 --
// the query param opts into that challenge server-side
// (SmarterWeather#9660) so account-touching tools (key minting,
// billing) become reachable through the stdio bridge.
//
// Precedence rules (URL):
//   1. First arg in userArgs with an http:// or https:// scheme.
//   2. opts.url (typically SMARTERWEATHER_ONBOARDING_MCP_URL).
//   3. opts.defaultUrl (the package-baked-in default).
//
// The auth=required param is appended to whichever URL wins,
// INCLUDING a user-provided positional (auth mode and target URL are
// orthogonal knobs; overriding the URL to a dev deployment must not
// silently drop the auth opt-in).

export interface BuildArgsOptions {
  /** Optional URL override (typically from
   * SMARTERWEATHER_ONBOARDING_MCP_URL). */
  url?: string | undefined;
  /** When 'required', append auth=required to the target URL so the
   * server 401-challenges anonymous requests and mcp-remote runs its
   * OAuth client. Typically from SMARTERWEATHER_ONBOARDING_AUTH. */
  authMode?: string | undefined;
  /** Default URL when neither a user-provided positional nor
   * opts.url is set. */
  defaultUrl: string;
}

const SCHEME_RE = /^https?:\/\//i;

function withAuthRequired(url: string): string {
  if (/[?&]auth=/i.test(url)) return url; // user already chose
  return url + (url.includes('?') ? '&' : '?') + 'auth=required';
}

export function buildArgs(userArgs: readonly string[], opts: BuildArgsOptions): string[] {
  const args = [...userArgs];
  const wantAuth = (opts.authMode ?? '').toLowerCase() === 'required';

  const positionalIdx = args.findIndex((a) => SCHEME_RE.test(a));
  if (positionalIdx >= 0) {
    if (wantAuth) {
      args[positionalIdx] = withAuthRequired(args[positionalIdx] as string);
    }
    return args;
  }

  let resolved = opts.url ?? opts.defaultUrl;
  if (wantAuth) resolved = withAuthRequired(resolved);
  args.unshift(resolved);
  return args;
}
