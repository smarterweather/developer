# Smarter Weather Agent Plugin

Portable [Agent Plugins 1.0](https://agent-plugins.org/) package for the
Smarter Weather developer platform. It is a **client install unit**: skills
plus MCP *connection config*. It is not a copy of the weather server.

| Piece | Role |
| ----- | ---- |
| `plugin.json` | Plugin identity (Agent Plugins 1.0) |
| `mcp.json` | Streamable HTTP → `https://mcp.smarterweather.com` |
| `skills/smarterweather-mcp` | When and how to use the hosted weather MCP |
| `skills/smarterweather-api` | When and how to call the REST API |

The hosted server remains the source of truth for tools, auth, metering, and
MCP Apps widgets. Tool schemas live in
[`descriptors/mcp-tools.json`](../../descriptors/mcp-tools.json) and in
`tools/list` — do not hardcode a tool count.

This repository is not a plugin-only tree, so Cursor Marketplace discovery
uses the repo-root [`.cursor-plugin/marketplace.json`](../../.cursor-plugin/marketplace.json)
entry whose `source` is this directory.

## Auth

Agent Plugins 1.0 defines no OAuth or credential fields. `mcp.json` declares
the hosted URL only. Headers must not contain secrets. The client owns auth
(OAuth discovery, API-key prompt, or wallet).

Supported on the hosted weather MCP:

- `Authorization: Bearer sw_live_*` / `sw_test_*`
- Clerk OAuth 2.1 + PKCE
- Keyless x402 pay-per-call

Never paste an API key into `mcp.json`, chat, or a committed config file.

## Cursor: stdio fallback (OAuth + `cursor://`)

Cursor's native Streamable HTTP OAuth against Clerk can fail when the
redirect uses the `cursor://` scheme (tracked as
[SmarterWeather#7184](https://github.com/smarterweather/SmarterWeather/issues/7184)).
Until that is fixed, prefer the npm stdio bridge in the **client** MCP
config — not in this portable `mcp.json` (the spec has no fallback, and
`npx` as `command` is a worse path for ChatGPT / Claude).

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

Set `SMARTERWEATHER_API_KEY` in the process environment. Do **not** append
`@preview` — `latest` is the GA bridge.

## What this plugin does not include

- The onboarding MCP (`https://mcp.developers.smarterweather.com`). That
  server is a one-shot signup path — use
  [`plugins/smarterweather-onboarding/`](../smarterweather-onboarding/).
  Never wire it into a long-lived client config alongside the weather
  server.
- A local copy of weather tools. All implementations run on the hosted
  server.
- Cursor `variables`, rules, hooks, or a Claude Code `.claude-plugin/`
  tree. Those are follow-ups.

## Install

- **Cursor Marketplace** — search for Smarter Weather once the listing is
  approved, or install from this repo via Customize → plugins using the
  marketplace `source` path `./plugins/smarterweather`.
- **Any Agent Plugins client** — point the client at this directory.
- **Hosted skills only** — https://developers.smarterweather.com/.well-known/skills/

## License

MIT for the package and skills. Hosted API access is governed by the
Developer Terms at https://developers.smarterweather.com/legal/terms.
