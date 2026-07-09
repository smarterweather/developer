# MCP onboarding server guide

The "meta MCP" — the agent-first way onto the Smarter Weather platform,
**live at `https://developers.smarterweather.com/mcp`**. Its tools walk a
developer (and their agent) end-to-end:

1. **Discovery** — plans, pricing, and documentation, with zero credentials.
2. **Account creation** — a referral-tagged signup link into the developer
   portal.
3. **API key provisioning** — mint, list, rotate, and revoke keys after an
   OAuth sign-in.
4. **Client configuration** — generates the right `@smarterweather/mcp-weather`
   config snippet for the client the agent is running inside (Cursor, Claude
   Code, Claude Desktop, Codex, etc.).
5. **Billing** — usage, billing status, plan upgrades, and the billing portal.

The server is co-hosted with the developer portal at
`developers.smarterweather.com/mcp` rather than living on its own subdomain;
path-based CloudFront routing isolates the MCP traffic from the portal HTML.

## Connect

### Hosted (Streamable HTTP)

Clients with native remote-MCP support connect directly:

```
https://developers.smarterweather.com/mcp
```

Anonymous connections see the three open discovery tools. Signing in via the
advertised OAuth 2.1 flow (RFC 9728 discovery is served at
`/.well-known/oauth-protected-resource/mcp`) unlocks the account-scoped tools.

### stdio bridge (npm)

For stdio-only clients:

```json
{
  "mcpServers": {
    "smarterweather-onboarding": {
      "command": "npx",
      "args": ["-y", "@smarterweather/mcp-onboarding"]
    }
  }
}
```

Add `"env": { "SMARTERWEATHER_ONBOARDING_AUTH": "required" }` to trigger the
OAuth browser sign-in and unlock the account-scoped tools. The bridge uses a
**pre-registered public PKCE** Clerk OAuth client (no Dynamic Client
Registration) and pins the loopback callback to
`http://localhost:3334/oauth/callback`. See the
[package README](../packages/mcp-onboarding/README.md) for all knobs.

> **Cursor note:** Cursor's built-in Streamable HTTP OAuth (`cursor://`
> redirect) is incompatible with Clerk today. Prefer the stdio bridge above
> for account-scoped tools; anonymous discovery tools work with a direct
> `url` entry.

## Tool catalog

| Tool | Auth | What it does |
| --- | --- | --- |
| `get_plans` | none | Plan/pricing catalog with feature matrices. |
| `get_documentation` | none | Keyword-searchable documentation index + content. |
| `sign_up` | none | Referral-tagged signup URL into the developer portal. |
| `create_api_key` / `list_api_keys` / `rotate_api_key` / `revoke_api_key` | OAuth | Full key lifecycle, acting as the signed-in developer. |
| `configure_mcp` | OAuth | Ready-to-paste `@smarterweather/mcp-weather` client config for your editor/agent. |
| `get_quickstart` | OAuth | Personalized quickstart (key + first calls). |
| `get_usage` / `get_billing_status` | OAuth | Usage against plan limits; subscription + invoice preview. |
| `upgrade_plan` / `open_billing_portal` | OAuth | Stripe checkout / billing portal links. |

## Auth model

- **Open tools** are served anonymously by design (aggressively rate-limited
  per IP). No key, no account, no OAuth — an agent can evaluate the platform
  cold.
- **Account tools** require a Clerk OAuth 2.1 + PKCE sign-in. The server
  never holds privileged credentials: every account-touching call is proxied
  with the *caller's own* verified token.
- **API keys are not accepted here.** Keys (`sw_live_*` / `sw_test_*`)
  authenticate the weather data surfaces (`api.smarterweather.com`,
  `mcp.smarterweather.com`); onboarding is identity-based.

## Interactive widgets (MCP Apps)

The server implements the [MCP Apps extension](https://modelcontextprotocol.io/extensions/apps/overview):
in hosts that support it, selected onboarding tools render an interactive
widget alongside the model's text answer.

- **Enhanced tools**: `sign_up` (account CTA), `get_usage` (usage dashboard),
  `configure_mcp` (paste-ready client config), `upgrade_plan` and
  `open_billing_portal` (Stripe Checkout / portal CTAs). Sign-in itself
  remains the host OAuth reconnect flow — not a widget.
- **How it works**: the tools reference one shared app resource,
  `ui://onboarding-widget/v1/index.html`, via `_meta.ui.resourceUri`, and
  include an additive `widget` block in `structuredContent`. Hosts without
  MCP Apps support ignore both — every tool result remains complete as
  plain text content.
- **Hybrid gating**: `sign_up` carries the widget pre-auth; gated tools
  only advertise `_meta.ui` when the session is OAuth-authenticated.
  Reading the `ui://` resource is anonymous and unmetered.
- **Widget interactivity** is host-mediated (upgrade chips send a chat
  prompt; signup / checkout buttons open URLs via the host). Widgets never
  trigger additional billable tool calls.

## Looking for weather data?

That's [`@smarterweather/mcp-weather`](./mcp-weather.md), hosted at
`mcp.smarterweather.com/mcp` — which this server's `configure_mcp` tool will
set up for you.
