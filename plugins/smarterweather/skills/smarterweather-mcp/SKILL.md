---
name: smarterweather-mcp
description: >-
  Install and use Smarter Weather's hosted MCP servers: the weather MCP
  (forecasts, alerts, radar/satellite imagery, and raw dataset queries)
  and the onboarding MCP (agent-first signup, API key minting, client
  configuration, usage and billing). Covers stdio bridge
  install for Cursor / Claude Code / VS Code, Streamable HTTP endpoints,
  OAuth for account-scoped tools, and keyless pay-per-call access via
  x402 agentic payments. Use when the user wants to connect an AI agent
  or MCP client to Smarter Weather, onboard to the developer platform
  from an agent, or configure @smarterweather/mcp-weather or
  @smarterweather/mcp-onboarding.
license: MIT
metadata:
  canonical: https://developers.smarterweather.com/.well-known/skills/smarterweather-mcp/SKILL.md
---

# Use the Smarter Weather MCP servers

Smarter Weather ships two hosted MCP servers on different hosts; they
do not conflict, but they serve different phases. The onboarding MCP
is one-shot: keep it in the client config only until `configure_mcp`
has written the weather MCP entry, then remove it so its account tools
are not left in a long-lived session.

| Server | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| Weather MCP | `https://mcp.smarterweather.com` | API key Bearer, OAuth 2.1 + PKCE, or keyless x402 | Hosted weather tools: forecasts, alerts, outlooks, raw dataset queries, rendered radar/satellite/sounding imagery |
| Onboarding MCP | `https://mcp.developers.smarterweather.com` | Anonymous for discovery; OAuth for account tools | One-time onboarding: `get_plans`, `get_documentation`, `sign_up`, then `create_api_key`, `configure_mcp`, usage + billing |

Tool descriptors for the weather MCP:
<https://developers.smarterweather.com/.well-known/mcp-tools.json>

## Recommended onboarding flow (agents)

1. Prefer the CLI with no MCP host when you can:
   - Human present: `npx -y @smarterweather/mcp-onboarding@latest login`
   - No human: `npx -y @smarterweather/mcp-onboarding@latest trial`
2. Or connect to the **onboarding MCP** with no credentials, call
   `get_plans` / `get_documentation` / `sign_up`, complete Clerk OAuth
   (stdio bridge loopback on port `3334`), then `create_api_key` /
   `configure_mcp`. Via the stdio bridge, create/rotate sink into `.env`.
3. Point `@smarterweather/mcp-weather` at the project `.env`
   (`envFile` or cwd fallback). Remove the onboarding server afterwards.

Anonymous connections to the onboarding MCP list only the three
discovery tools; the account-scoped tools appear after OAuth. This is by
design, not a failure.

## stdio bridge install (local clients)

For clients that cannot speak Streamable HTTP (or whose native OAuth
flow is unreliable), use the npm stdio bridges. Do **not** append
`@preview` — `latest` is the GA bridge.

```jsonc
// ~/.cursor/mcp.json (or the client's equivalent)
{
  "mcpServers": {
    "smarterweather": {
      "command": "npx",
      "args": ["-y", "@smarterweather/mcp-weather"],
      "env": { "SMARTERWEATHER_API_KEY": "<from shell, not pasted here>" }
    }
  }
}
```

- Set `SMARTERWEATHER_API_KEY` in the shell profile and let the client
  inherit it — pasting the key into the JSON file stores it on disk in
  cleartext.
- For the onboarding bridge, use `@smarterweather/mcp-onboarding` with
  no env; set `SMARTERWEATHER_ONBOARDING_AUTH=required` to force OAuth
  up front for account-scoped tools.
- The bridges are thin stdio-to-Streamable-HTTP proxies; all tool
  implementations run on the hosted servers.

One-click install buttons (Cursor deeplink, Claude Code, VS Code) are at
<https://developers.smarterweather.com/agents>.

### Troubleshooting

- `npm error ENOENT ... Cursor.app/Contents/Resources/app/resources/lib`:
  a known Cursor bug where the spawned npm resolves its prefix inside
  Cursor's app bundle. Work around by setting `command` to the absolute
  path of the system `npx`, or adding
  `"env": { "NPM_CONFIG_PREFIX": "<node install prefix>" }`.
- Streamable HTTP + OAuth failing with "does not support dynamic client
  registration": use the stdio bridge instead for gated tools.

## Keyless access — x402 agentic payments

Agents with wallets can call the weather MCP without an account or API
key by paying per call in USDC on Base. The server responds to unpaid
tool calls with an in-band HTTP 402-style payment requirement; settle it
via an x402-capable client and retry. Discovery tools stay free. See
<https://developers.smarterweather.com/agents> for the current price
list and supported networks.

## Choosing MCP vs REST

- Agent calls tools live during a session → MCP.
- The user's own service calls weather endpoints in production → REST
  (see the `smarterweather-api` skill).
- Code generation tasks referencing weather data → REST examples unless
  the user is explicitly configuring an MCP client.

## Where to learn more

- Built for agents: <https://developers.smarterweather.com/agents>
- MCP setup guide: <https://developers.smarterweather.com/mcp-server/setup>
- MCP tool reference: <https://developers.smarterweather.com/mcp-server/tools>
- Agent-oriented doc index: <https://developers.smarterweather.com/llms.txt>
- REST integration: the `smarterweather-api` skill at
  <https://developers.smarterweather.com/.well-known/skills/smarterweather-api/SKILL.md>
