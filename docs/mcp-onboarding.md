# MCP onboarding server guide

> **Preview - server not yet generally available.** The hosted onboarding
> MCP server at `https://developers.smarterweather.com/mcp` and the
> matching `@smarterweather/mcp-onboarding` stdio bridge ship in
> **Phase 4** of the [public roadmap](../README.md#roadmap). The package on
> npm today is a placeholder that prints a single status line and exits
> cleanly.

## What this is

The "meta MCP" - an unauthenticated-on-entry MCP server whose tools walk a
developer (and their agent) through:

1. **Account creation** in the Smarter Weather developer portal.
2. **API key provisioning** for the appropriate plan tier.
3. **Plan selection** with usage projections based on declared intent.
4. **SDK setup** - generates the right config snippets for the client the
   agent is running inside (Cursor, Claude Code, Codex, Claude Desktop,
   etc.) and writes them to disk on the developer's behalf.

The server is co-hosted with the developer portal at
`developers.smarterweather.com/mcp` rather than living on its own subdomain
- the `onboarding.smarterweather.com` namespace is reserved for an unrelated
future B2B product. Path-based CloudFront routing isolates the MCP traffic
from the portal HTML.

## Install (preview)

```bash
npx -y @smarterweather/mcp-onboarding@preview
```

Today this prints:

```text
@smarterweather/mcp-onboarding (preview): not yet functional.
Bridge to the hosted developer-onboarding MCP at https://developers.smarterweather.com/mcp
Implementation ships in Phase 4 of the developer ecosystem rollout.
Roadmap: https://github.com/smarterweather/developer#roadmap
```

The placeholder is published intentionally to reserve the package name on
npm so onboarding tutorials can reference the final shape from day one.

## Auth model

Unlike the weather MCP (API key), the onboarding MCP authorizes via a
browser-callback OAuth flow against Clerk. The bridge launches a local
loopback listener, opens the user's browser to a Clerk-hosted authorization
page, exchanges the resulting code for a session token, and attaches that
token to subsequent JSON-RPC messages. No user secrets touch the bridge
process beyond the session token, and even that is held in memory only.

The end-to-end OAuth readiness work for this flow was completed in Phase 0
- see the public-facing summary at
<https://smarterweather.com/developers/mcp/setup>.

## Planned client configuration

When Phase 4 ships, the canonical config snippets per client will live at
<https://smarterweather.com/developers/mcp/setup>. Today's preview shape:

### Cursor

```jsonc
{
  "mcpServers": {
    "smarterweather-onboarding": {
      "command": "npx",
      "args": ["-y", "@smarterweather/mcp-onboarding@preview"]
    }
  }
}
```

### Claude Desktop / Claude Code

```jsonc
{
  "mcpServers": {
    "smarterweather-onboarding": {
      "command": "npx",
      "args": ["-y", "@smarterweather/mcp-onboarding@preview"]
    }
  }
}
```

No `env` block is required - the OAuth handshake on first run takes care of
session bootstrap.

## Planned tool catalog (Phase 4)

Tool names are subject to change pre-launch; the surface is intentionally
narrow to keep the agent's onboarding script short and predictable.

- `start_onboarding(intent)` - begins a guided session for a stated intent
  ("personal hobby project", "production app", etc.).
- `create_account(email)` - kicks off email verification via Clerk.
- `select_plan(usage_projection)` - returns the recommended tier with cost
  envelope.
- `mint_api_key(name)` - mints an API key scoped to the active session.
- `write_client_config(client)` - writes the right config to the right path
  for the named MCP client and reports the result.

## Why a separate package from `@smarterweather/mcp-weather`?

- **Different audiences.** The weather package is "I am building with
  weather data." The onboarding package is "I am here for the first time."
  Mixing them would muddy both.
- **Different auth models.** API key vs. browser OAuth - the bridges share
  no transport code beyond the underlying MCP framing.
- **Different lifetime.** The onboarding bridge is typically run once per
  developer, then uninstalled. The weather bridge stays installed for the
  life of the integration.

Both packages live in the same repo for shared CI, shared release tooling
(Changesets), and a shared governance posture; they ship to npm
independently.
