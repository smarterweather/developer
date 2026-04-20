# MCP weather server guide

> **Preview - server not yet generally available.** The hosted weather MCP
> server at `https://mcp.smarterweather.com/mcp` and the matching
> `@smarterweather/mcp-weather` stdio bridge ship in **Phase 3** of the
> [public roadmap](../README.md#roadmap). The package on npm today is a
> placeholder that prints a single status line and exits cleanly.

## What this is

Two pieces ship together as the "weather MCP" surface:

1. **Hosted MCP server** at `https://mcp.smarterweather.com/mcp` -
   streamable HTTP transport, served from the same backend that powers the
   REST API at `api.smarterweather.com`. Authentication is a Smarter Weather
   API key (`X-API-Key`) at launch; OAuth via Clerk lands in a follow-on.
2. **stdio bridge package** [`@smarterweather/mcp-weather`](../packages/mcp-weather)
   - thin, local Node.js process that speaks JSON-RPC over stdio to your MCP
   client and proxies every message to the hosted server. The bridge exists
   because today's mainstream MCP clients (Cursor, Claude Desktop, Claude
   Code) are stdio-first; the streamable-HTTP transport is still rolling out.

All tool implementations live server-side. The bridge does not see, parse,
or modify weather data.

## Install (preview)

```bash
npx -y @smarterweather/mcp-weather@preview
```

Today this prints:

```text
@smarterweather/mcp-weather (preview): not yet functional.
Bridge to the hosted weather MCP at https://mcp.smarterweather.com/mcp
Implementation ships in Phase 3 of the developer ecosystem rollout.
Roadmap: https://github.com/smarterweather/developer#roadmap
```

The placeholder is published intentionally: it reserves the package name on
npm so client config files and tutorials can reference the final shape from
day one without churn at GA.

## Planned client configuration

When Phase 3 ships, the canonical config snippets per client will live at
<https://smarterweather.com/developers/mcp/setup>. Today's preview shape
looks like:

### Cursor (`~/.cursor/mcp.json`)

```jsonc
{
  "mcpServers": {
    "smarterweather-weather": {
      "command": "npx",
      "args": ["-y", "@smarterweather/mcp-weather@preview"],
      "env": { "SMARTERWEATHER_API_KEY": "sk_live_..." }
    }
  }
}
```

### Claude Desktop / Claude Code

```jsonc
{
  "mcpServers": {
    "smarterweather-weather": {
      "command": "npx",
      "args": ["-y", "@smarterweather/mcp-weather@preview"],
      "env": { "SMARTERWEATHER_API_KEY": "sk_live_..." }
    }
  }
}
```

The client connects to the local bridge over stdio; the bridge connects to
`https://mcp.smarterweather.com/mcp` over streamable HTTP and attaches your
API key from `SMARTERWEATHER_API_KEY` on every outbound request.

## Planned tool catalog (Phase 3)

The launch tool set targets the same "one call, full picture" philosophy as
`/v1/weather` plus a small number of higher-level tools that benefit from
agent reasoning. The exact catalog is published with the Phase 3 cutover;
expect at minimum:

- `get_weather(latitude, longitude)` - parity with `/v1/weather`.
- `get_alerts(area)` - active NWS alerts for a CONUS area.
- `compare_models(latitude, longitude, hours)` - probabilistic comparison
  across NBM/HRRR/GFS/RTMA at a lead time.

Additions after launch follow the same deprecation policy as the REST API
(see [REST API guide](./rest-api.md#stability-promise)).

## Stability promise

Same as the REST API: 6 months notice for tool removals, 90 days for
breaking input/output shape changes, non-breaking additions ship
immediately. Pre-GA the surface is allowed to change.

## Why a bridge?

A few alternatives were considered:

- **Pure remote MCP** - works in clients that already speak streamable HTTP
  (Cursor recent versions). The bridge is still useful for clients that do
  not, and for agents that benefit from a stable local handle.
- **Native MCP server in the agent's runtime** - too tightly coupled to
  individual agent vendors and forecloses on language-specific SDKs.

The bridge keeps every weather behavior server-side and every client
behavior local; only authentication and JSON-RPC framing live in the
package.
