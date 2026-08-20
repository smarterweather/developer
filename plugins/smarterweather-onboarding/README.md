# Smarter Weather Onboarding Plugin

Portable [Agent Plugins 1.0](https://agent-plugins.org/) package for the
**one-shot** onboarding MCP. Install it to sign up, mint a key, and
configure the weather client. Then **remove it**.

| Piece | Role |
| ----- | ---- |
| `plugin.json` | Plugin identity (Agent Plugins 1.0) |
| `mcp.json` | Streamable HTTP → `https://developers.smarterweather.com/mcp` |
| `skills/smarterweather-onboarding` | Create account → mint key → configure weather → remove |

This is not the weather plugin. The long-lived install unit is
[`plugins/smarterweather/`](../smarterweather/). Never put both servers
in one `mcp.json`.

Cursor Marketplace discovery uses the repo-root
[`.cursor-plugin/marketplace.json`](../../.cursor-plugin/marketplace.json)
entry whose `source` is this directory.

## Auth

Agent Plugins 1.0 defines no OAuth or credential fields. `mcp.json`
declares the hosted URL only. Headers must not contain secrets.

Anonymous discovery tools (`get_plans`, `get_documentation`, `sign_up`)
need no credentials. Account tools require Clerk OAuth 2.1 + PKCE after
a human completes signup.

Never paste an API key into `mcp.json`, chat, or a committed config file.

## Cursor: stdio fallback (OAuth + `cursor://`)

Cursor's native Streamable HTTP OAuth against Clerk can fail when the
redirect uses the `cursor://` scheme (tracked as
[SmarterWeather#7184](https://github.com/smarterweather/SmarterWeather/issues/7184)).
Until that is fixed, prefer the npm stdio bridge in the **client** MCP
config — not in this portable `mcp.json`.

```jsonc
// ~/.cursor/mcp.json (or the client's equivalent)
{
  "mcpServers": {
    "smarterweather-onboarding": {
      "command": "npx",
      "args": ["-y", "@smarterweather/mcp-onboarding"]
    }
  }
}
```

The bridge pins a loopback callback on port `3334`. Do **not** append
`@preview` — `latest` is the GA bridge.

## What this plugin does not include

- The weather MCP (`https://mcp.smarterweather.com/mcp`). Install
  [`plugins/smarterweather/`](../smarterweather/) after `configure_mcp`.
- A local copy of onboarding or weather tools. All implementations run
  on the hosted servers.

## Install

- **Cursor Marketplace** — search for Smarter Weather Onboarding once
  the listing is approved, or install from this repo via Customize →
  plugins using the marketplace `source` path
  `./plugins/smarterweather-onboarding`.
- **Any Agent Plugins client** — point the client at this directory.
- **Hosted skill** —
  https://developers.smarterweather.com/.well-known/skills/smarterweather-onboarding/SKILL.md

## License

MIT for the package and skill. Hosted API access is governed by the
Developer Terms at https://developers.smarterweather.com/legal/terms.
