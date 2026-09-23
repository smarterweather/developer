---
name: smarterweather-onboarding
description: >-
  One-shot onboarding onto the Smarter Weather developer platform via the
  hosted onboarding MCP: discover plans, create a free Clerk account,
  mint an API key, write weather-client config, then remove this server.
  Use when the user wants to sign up, create an API key, or configure
  @smarterweather/mcp-weather from an agent for the first time.
license: MIT
metadata:
  canonical: https://developers.smarterweather.com/.well-known/skills/smarterweather-onboarding/SKILL.md
---

# Onboard to Smarter Weather (one-shot)

This install is **temporary**. It talks to the onboarding MCP at
`https://mcp.developers.smarterweather.com`. After a key exists and the
weather client is configured, **remove this server** from the client
config. Never wire it into a long-lived config alongside the weather MCP
(`https://mcp.smarterweather.com`).

## Flow

Prefer CLI when possible:

```bash
npx -y @smarterweather/mcp-onboarding@latest login   # human present
npx -y @smarterweather/mcp-onboarding@latest trial   # no human
```

Both write `.env` and print only a key prefix. Otherwise:

1. Connect with no credentials. Call `get_plans` / `get_documentation` /
   `sign_up`.
2. `sign_up` returns a Clerk signup URL. A human opens it and creates a
   free account (no credit card).
3. Reconnect this MCP with OAuth when the host prompts. The stdio bridge
   (`npx -y @smarterweather/mcp-onboarding`) uses a loopback callback on
   port `3334` — keep that port free. Cursor's native `cursor://` OAuth
   against Clerk is broken ([#7184](https://github.com/smarterweather/SmarterWeather/issues/7184));
   prefer the stdio bridge for gated tools.
4. Call `create_api_key` (idempotent). Via the stdio bridge the key is
   written to `.env` and not returned. Prefer CLI `login` when a human
   can approve a device code.
5. Call `configure_mcp`. Cursor gets `envFile: ${workspaceFolder}/.env`;
   Claude Desktop keeps an env slot a human fills locally. Never paste
   `sw_live_` / `sw_test_` into committed JSON.
6. Install the weather plugin or `@smarterweather/mcp-weather`, then
   remove this onboarding server.

Anonymous connections list only the discovery tools. Account-scoped
tools appear after OAuth. That is by design.

## After onboarding

- Weather MCP / Agent Plugin: `https://mcp.smarterweather.com`
- REST: `https://api.smarterweather.com`
- Playbooks: `smarterweather-mcp` and `smarterweather-api` at
  <https://developers.smarterweather.com/.well-known/skills/>
