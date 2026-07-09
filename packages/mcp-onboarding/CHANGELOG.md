# @smarterweather/mcp-onboarding

## 0.0.1

### Patch Changes

- [#37](https://github.com/smarterweather/developer/pull/37) [`e68b12e`](https://github.com/smarterweather/developer/commit/e68b12eb1b6112fea4ec23e6cd179d392fef206f) Thanks [@afisch710](https://github.com/afisch710)! - When `SMARTERWEATHER_ONBOARDING_AUTH=required`, pin the mcp-remote OAuth callback to port `3334` and pass `--static-oauth-client-info` with the pre-registered public PKCE Clerk `client_id` (`PQcxOLVZg5kxzhoC`, overridable via `SMARTERWEATHER_ONBOARDING_OAUTH_CLIENT_ID`). Production Clerk keeps Dynamic Client Registration off; the bridge no longer depends on DCR.

## 0.0.0

### Major Changes

- [#26](https://github.com/smarterweather/developer/pull/26) [`389c795`](https://github.com/smarterweather/developer/commit/389c795e91c11ce255d4d6dda23bc7c3c5e2713f) Thanks [@afisch710](https://github.com/afisch710)! - GA release (`1.0.0`): replace the preview placeholder with the real stdio↔Streamable-HTTP bridge to the hosted developer onboarding MCP server, now live at `https://developers.smarterweather.com/mcp`. The bin `spawn()`s [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) with the Smarter Weather URL default (overridable via `SMARTERWEATHER_ONBOARDING_MCP_URL` or a positional argument). Anonymous by default — the open discovery tools (`get_plans`, `get_documentation`, `sign_up`) need no credentials; set `SMARTERWEATHER_ONBOARDING_AUTH=required` to opt into the OAuth 2.1 + PKCE sign-in that unlocks the account-scoped key-lifecycle and billing tools. Adds `--version` short-circuit, signal forwarding, argv pass-through to `mcp-remote`, a vitest suite, and MCP Registry metadata (`mcpName`, `server.json`).

## 0.0.0-preview.2

### Patch Changes

- [#7](https://github.com/smarterweather/developer/pull/7) [`fea62d6`](https://github.com/smarterweather/developer/commit/fea62d68aca0e8ec323b5bd61bc757516898ada9) Thanks [@afisch710](https://github.com/afisch710)! - Correct the placeholder's hosted-server URL from `https://onboarding.smarterweather.com` to `https://developers.smarterweather.com/mcp`. Per the developer-platform domain registry (issue #7155, ADR-002), the meta MCP server (sw-onboarding) is co-hosted with the developer portal at `developers.smarterweather.com/mcp` via path-based CloudFront routing — `onboarding.smarterweather.com` is reserved for an unrelated future B2B product.

## 0.0.0-preview.1

### Patch Changes

- Initial preview placeholder. Bridge to https://developers.smarterweather.com/mcp — not yet functional. Real implementation ships in Phase 4 of the developer ecosystem rollout.
