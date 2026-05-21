# MCP weather server guide

> **Preview — server not yet generally available.** The hosted
> weather MCP server at `https://mcp.smarterweather.com/mcp`
> starts serving production traffic when **Track F MVP** (cert /
> DNS / prod deploy) lands. The `@smarterweather/mcp-weather` npm
> bridge is a **functional, published preview** today: it speaks
> OAuth 2.1 + API-key auth to whichever MCP endpoint you point it
> at. Use `SMARTERWEATHER_MCP_URL` to override the default to a
> dev ALB until the prod URL is live.

## What this is

Two pieces ship together as the "weather MCP" surface:

1. **Hosted MCP server** at `https://mcp.smarterweather.com/mcp` —
   streamable-HTTP transport, served from the same backend that
   powers the REST API at `api.smarterweather.com`. Authenticates
   with either a Smarter Weather API key (`Authorization: Bearer
   sw_live_…`) or a Clerk-issued OAuth 2.1 + PKCE access token.
2. **stdio bridge package**
   [`@smarterweather/mcp-weather`](https://www.npmjs.com/package/@smarterweather/mcp-weather)
   — thin, local Node.js process that lets local-first MCP clients
   (Claude Desktop, Claude Code, Cursor, MCP Inspector) talk to the
   hosted server. The bridge runs the full MCP OAuth client when no
   API key is configured (discovery → DCR → PKCE → loopback
   callback → token cache); when `SMARTERWEATHER_API_KEY` is set,
   it forwards the key as an `Authorization: Bearer` header
   instead.

All tool implementations live server-side. The bridge does not
see, parse, or modify weather data — it's purely a config-and-spawn
shim around
[`mcp-remote`](https://www.npmjs.com/package/mcp-remote).

## Install

```bash
npx -y @smarterweather/mcp-weather@preview --version
```

Pre-release, the `@preview` dist-tag is required. After GA, drop
the suffix.

> **Known issue (M7-1.1 follow-up):** the `@preview` dist-tag was
> briefly frozen on the placeholder `0.0.0-preview.1` while
> `@latest` carried the real bridge at `0.0.0-preview.2`. The
> automated dist-tag repoint (`release.yml`) needs an `NPM_TOKEN`
> repo secret to run; until that's provisioned, install
> `@smarterweather/mcp-weather@0.0.0-preview.2` explicitly (or
> `@latest`) to get the real bridge. Tracked at
> [SmarterWeather#8090](https://github.com/afisch710/SmarterWeather/issues/8090).

## Authentication

The bridge supports two auth paths against the hosted server.
Pick whichever fits your client:

### OAuth 2.1 + PKCE (recommended for end users)

The default when no `SMARTERWEATHER_API_KEY` is set. On first run
the bridge opens your default browser to the SmarterWeather sign-in
flow, then caches the access + refresh tokens at `~/.mcp-auth/`
for future invocations. Tokens auto-refresh; no manual rotation
needed.

This delegates entirely to `mcp-remote`'s OAuth client. Clients
that already speak MCP OAuth natively can talk to
`mcp.smarterweather.com` directly without the bridge.

### API key (headless / CI)

Set `SMARTERWEATHER_API_KEY=sw_live_…` (or `sw_test_…`) in the
bridge's environment. The bridge forwards the key as
`Authorization: Bearer <key>` on every proxied request. Skips
the browser flow entirely — useful for scripted or CI usage.

Mint keys at <https://smarterweather.com/developers/api-keys>.
Keys need the `mcp` scope to authenticate against `sw-mcp`.

## Client configuration

### Cursor (`~/.cursor/mcp.json`)

OAuth:

```jsonc
{
  "mcpServers": {
    "smarterweather": {
      "command": "npx",
      "args": ["-y", "@smarterweather/mcp-weather@preview"]
    }
  }
}
```

API key:

```jsonc
{
  "mcpServers": {
    "smarterweather": {
      "command": "npx",
      "args": ["-y", "@smarterweather/mcp-weather@preview"],
      "env": {
        "SMARTERWEATHER_API_KEY": "sw_live_..."
      }
    }
  }
}
```

> **Note (Cursor built-in OAuth):** Cursor's *built-in* MCP OAuth
> client (`cursor://` redirect) is currently incompatible with
> Clerk; this is tracked at
> [SmarterWeather#7184](https://github.com/afisch710/SmarterWeather/issues/7184).
> Using `@smarterweather/mcp-weather` (which delegates OAuth to
> `mcp-remote`'s loopback callback) is the documented workaround —
> it works on Cursor today.

### Claude Desktop / Claude Code

`claude_desktop_config.json` (macOS:
`~/Library/Application Support/Claude/claude_desktop_config.json`)
uses the identical `mcpServers` shape:

```jsonc
{
  "mcpServers": {
    "smarterweather": {
      "command": "npx",
      "args": ["-y", "@smarterweather/mcp-weather@preview"]
    }
  }
}
```

The client connects to the local bridge over stdio; the bridge
connects to `https://mcp.smarterweather.com/mcp` over streamable
HTTP and either prompts you to sign in (OAuth) or attaches your
API key.

### MCP Inspector

The reference inspector at
<https://github.com/modelcontextprotocol/inspector> works
out-of-the-box; point it at the same `npx` command.

## Dev / staging override

Until `mcp.smarterweather.com` is live in production (Track F),
point the bridge at the dev ALB DNS via `SMARTERWEATHER_MCP_URL`
or as a positional arg:

```jsonc
{
  "mcpServers": {
    "smarterweather-dev": {
      "command": "npx",
      "args": ["-y", "@smarterweather/mcp-weather@preview"],
      "env": {
        "SMARTERWEATHER_MCP_URL": "http://<dev-alb-dns>/mcp"
      }
    }
  }
}
```

Precedence: positional arg > `SMARTERWEATHER_MCP_URL` env >
package default.

## Tool catalog (current)

The launch tool set follows the same "one call, full picture"
philosophy as the `/v1/weather` REST endpoint, plus a small number
of higher-level tools that benefit from agent reasoning. The
canonical catalog lives at
<https://smarterweather.com/developers/mcp/tools>; at minimum the
hosted server exposes:

- `weather/get(latitude, longitude)` — parity with `/v1/weather`.
- `alerts/active(area)` — active NWS alerts for a CONUS area.
- `model/compare(latitude, longitude, hours)` — probabilistic
  comparison across NBM / HRRR / GFS / RTMA at a lead time.

Additions after launch follow the same deprecation policy as the
REST API (see [REST API guide](./rest-api.md#stability-promise)).

## Stability promise

Same as the REST API: 6 months notice for tool removals, 90 days
for breaking input / output shape changes, non-breaking additions
ship immediately. Pre-GA the surface is allowed to change.

## Why a bridge?

A few alternatives were considered:

- **Pure remote MCP** — works in clients that already speak
  streamable HTTP (Cursor recent versions, MCP Inspector). The
  bridge is still useful for clients that do not (Claude Desktop,
  Claude Code), and for agents that benefit from a stable local
  handle.
- **Native MCP server in the agent's runtime** — too tightly
  coupled to individual agent vendors and forecloses on
  language-specific SDKs.

The bridge keeps every weather behavior server-side and every
client behavior local; only OAuth client logic and JSON-RPC
framing live in the package. Source:
[`packages/mcp-weather/`](../packages/mcp-weather/).
