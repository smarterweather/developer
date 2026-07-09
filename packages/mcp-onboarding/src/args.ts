// Pure-function argv builder for the mcp-remote wrapper.
//
// Same shape as packages/mcp-weather/src/args.ts (kept separately
// deliberately -- the two packages version and publish independently
// and each stays dependency-free beyond mcp-remote itself), with
// onboarding-specific additions:
//
//   1. `authMode=required` appends `?auth=required` to the resolved
//      target URL. The hosted onboarding server answers anonymous
//      requests 200 by design (open discovery tools), and mcp-remote
//      only initiates its OAuth client on a 401 -- the query param
//      opts into that challenge server-side (SmarterWeather#9660).
//
//   2. When auth is required, also pin mcp-remote's OAuth callback
//      port to 3334 (its documented default) and pass
//      `--static-oauth-client-info` with the pre-registered public
//      PKCE Clerk client_id. Production Clerk keeps Dynamic Client
//      Registration OFF; the static client skips DCR entirely.
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

/** Pre-registered public PKCE Clerk OAuth app for the onboarding bridge. */
export const DEFAULT_OAUTH_CLIENT_ID = 'PQcxOLVZg5kxzhoC';

/** Pinned mcp-remote OAuth callback port (matches Clerk redirect URI). */
export const DEFAULT_OAUTH_CALLBACK_PORT = '3334';

export interface BuildArgsOptions {
  /** Optional URL override (typically from
   * SMARTERWEATHER_ONBOARDING_MCP_URL). */
  url?: string | undefined;
  /** When 'required', append auth=required to the target URL so the
   * server 401-challenges anonymous requests and mcp-remote runs its
   * OAuth client. Typically from SMARTERWEATHER_ONBOARDING_AUTH. */
  authMode?: string | undefined;
  /** Optional override for the pre-registered Clerk OAuth client_id
   * (typically SMARTERWEATHER_ONBOARDING_OAUTH_CLIENT_ID). */
  oauthClientId?: string | undefined;
  /** Default URL when neither a user-provided positional nor
   * opts.url is set. */
  defaultUrl: string;
}

const SCHEME_RE = /^https?:\/\//i;
const PORT_RE = /^\d+$/;

function withAuthRequired(url: string): string {
  if (/[?&]auth=/i.test(url)) return url; // user already chose
  return url + (url.includes('?') ? '&' : '?') + 'auth=required';
}

function hasPortAfterUrl(args: readonly string[], urlIdx: number): boolean {
  const next = args[urlIdx + 1];
  return typeof next === 'string' && PORT_RE.test(next);
}

function hasStaticOAuthClientInfo(args: readonly string[]): boolean {
  return args.includes('--static-oauth-client-info');
}

function applyAuthRequiredExtras(args: string[], urlIdx: number, opts: BuildArgsOptions): void {
  if (!hasPortAfterUrl(args, urlIdx)) {
    args.splice(urlIdx + 1, 0, DEFAULT_OAUTH_CALLBACK_PORT);
  }
  if (!hasStaticOAuthClientInfo(args)) {
    const clientId =
      opts.oauthClientId !== undefined && opts.oauthClientId !== ''
        ? opts.oauthClientId
        : DEFAULT_OAUTH_CLIENT_ID;
    args.push('--static-oauth-client-info', JSON.stringify({ client_id: clientId }));
  }
}

export function buildArgs(userArgs: readonly string[], opts: BuildArgsOptions): string[] {
  const args = [...userArgs];
  const wantAuth = (opts.authMode ?? '').toLowerCase() === 'required';

  const positionalIdx = args.findIndex((a) => SCHEME_RE.test(a));
  if (positionalIdx >= 0) {
    if (wantAuth) {
      args[positionalIdx] = withAuthRequired(args[positionalIdx] as string);
      applyAuthRequiredExtras(args, positionalIdx, opts);
    }
    return args;
  }

  let resolved = opts.url ?? opts.defaultUrl;
  if (wantAuth) resolved = withAuthRequired(resolved);
  args.unshift(resolved);
  if (wantAuth) {
    applyAuthRequiredExtras(args, 0, opts);
  }
  return args;
}
