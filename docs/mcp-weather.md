# MCP weather server guide

> The hosted weather MCP server at
> `https://mcp.smarterweather.com/mcp` is **live in production**,
> serving the full 28-tool catalog with API-key and OAuth 2.1 auth.
> The `@smarterweather/mcp-weather` npm bridge remains on the
> `@preview` dist-tag until it is promoted; clients that speak
> streamable HTTP natively can connect to the hosted endpoint
> directly without the bridge.

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

To target a non-production deployment (e.g. a dev ALB), point the
bridge at it via `SMARTERWEATHER_MCP_URL` or as a positional arg:

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

The hosted server exposes **28 tools** organized around
meteorologist workflows rather than raw endpoints. Every
location-aware tool accepts either a free-text `location` string or
explicit `lat`/`lon`. Call `tools/list` for the live, canonical
catalog with full input/output schemas.

### Location

- `search_locations` — geocode a free-text query (city, ZIP,
  landmark); supports fuzzy autosuggest.
- `reverse_geocode` — nearest place name for a lat/lon.

### Forecast

- `get_forecast` — the headliner: blended daily + hourly forecast,
  alerts, and outlook context in one call (parity with
  `/v1/weather`).
- `get_hourly_forecast` — hour-by-hour detail for a window.
- `get_forecast_distribution` — probabilistic spread (percentiles)
  across ensemble members for a variable.
- `get_time_context` — local time, sunrise/sunset, day/night
  framing for a location.

### Current conditions and observations

- `get_current_conditions` — real-time analysis conditions.
- `get_observations` — recent station observations.
- `get_lightning_activity` — recent lightning strikes near a point.
- `get_storm_reports` — local storm reports (wind, hail, tornado).
- `get_sounding` — nearest model sounding profile with derived
  severe-weather parameters (CAPE, shear, SRH, ...).

### Hazards and forecaster text

- `get_alerts` — active NWS alerts for a location or area, with
  severity/event filtering.
- `get_outlooks` — SPC convective / WPC excessive-rain / fire-weather
  outlooks with narrative.
- `get_forecast_discussion` — the NWS Area Forecast Discussion text.

### Situational coverage

- `get_tropical` — active tropical systems, track and cone.
- `get_population_exposure` — population inside a hazard footprint.
- `get_climate_records` — record highs/lows and normals.
- `get_storm_cells` — storm-scale cell tracks, hail, mesocyclone and
  TVS signatures.
- `get_air_quality` — AQI and constituent pollutants.
- `get_growing_degree_days` — accumulated GDD for agriculture.

### Data plane (raw grids)

- `list_datasets` — discover available gridded datasets.
- `describe_dataset` — variables, extent, and freshness for one
  dataset.
- `query_dataset` — point-query any dataset variable time series.
- `get_period_totals` — accumulations/aggregates over a period.

### Analysis

- `compare_locations` — side-by-side multi-location comparison for
  an event or trip.
- `find_best_window` — rank time windows against weather criteria
  ("best 3-hour window for a run this week").

### Visual

- `get_map_snapshot` — rendered weather map image (PNG): pick a
  product (radar, satellite, SPC outlooks, model fields, ...) plus
  location/zoom, or pass a full declarative scene document layering
  basemap + multiple weather products + alert overlays.
- `get_sounding_chart` — rendered Skew-T + hodograph image for the
  nearest model sounding.

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
