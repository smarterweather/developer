# MCP weather server guide

> The hosted weather MCP server at
> `https://mcp.smarterweather.com` is **live in production**,
> serving the full 33-tool catalog. Authenticate with an API key
> (`npx -y @smarterweather/mcp-onboarding@latest login` or `trial`
> writes one to `.env`). Install the stdio bridge with
> `npx -y @smarterweather/mcp-weather` (Node.js 22+; untagged, since
> `latest` is the only tag). Clients that speak streamable HTTP
> natively can connect to the hosted endpoint directly without the
> bridge.

## What this is

Two pieces ship together as the "weather MCP" surface:

1. **Hosted MCP server** at `https://mcp.smarterweather.com` —
   streamable-HTTP transport, served from the same backend that
   powers the REST API at `api.smarterweather.com`. Authenticates
   with a Smarter Weather API key (`Authorization: Bearer
   sw_live_…`). Keyless callers can use the free discovery tools and
   pay per call with x402 for the rest.
2. **stdio bridge package**
   [`@smarterweather/mcp-weather`](https://www.npmjs.com/package/@smarterweather/mcp-weather)
   — thin, local Node.js process that lets local-first MCP clients
   (Claude Desktop, Claude Code, Cursor, MCP Inspector) talk to the
   hosted server. When a key is available (process env,
   `SMARTERWEATHER_ENV_FILE`, or `cwd/.env`), it forwards
   `Authorization:${SMARTERWEATHER_AUTH_HEADER}` with the bearer in
   the child env — never on argv — so process listings and
   mcp-remote's pre-expansion header log never see the key.
   Unexpanded `${…}` placeholders in the env count as unset. With
   no key it connects keyless.

All tool implementations live server-side. The bridge does not
see, parse, or modify weather data — it's purely a config-and-spawn
shim around
[`mcp-remote`](https://www.npmjs.com/package/mcp-remote).

## Install

```bash
npx -y @smarterweather/mcp-weather --version
```

## Authentication

### API key

Get a key first. Run one of these in your project directory:

```bash
# A human is present: device sign-in in the browser (free account, no card)
npx -y @smarterweather/mcp-onboarding@latest login

# No human present: mint a trial key you can claim into a free account later
npx -y @smarterweather/mcp-onboarding@latest trial
```

Both write `SMARTERWEATHER_API_KEY` to `./.env` (mode `0600`,
gitignored) and print only a key prefix. The onboarding stdio
bridge's `start_trial` tool does the same. You can also set
`SMARTERWEATHER_API_KEY` in the bridge's environment.
Resolution order: process env →
`SMARTERWEATHER_ENV_FILE` → `cwd/.env` (refuses `/` and `$HOME`).
An unexpanded `${SMARTERWEATHER_API_KEY}` literal counts as unset
and falls through (one stderr warning). The bridge never puts the
key on argv.

You can also mint a key at
<https://developers.smarterweather.com/dashboard/api-keys>.
Keys need the `mcp` scope to authenticate against `sw-mcp`.

OAuth sign-in for generic MCP clients is not available yet (no
dynamic client registration), so use an API key. Without one, the
bridge connects keyless and paid tool calls return x402 payment
requirements whose `next_steps` point back to `login` and `trial`.

### Keyless x402 (wallet agents)

Agents with a wallet can call the hosted weather MCP with no
account and no API key. An unpaid `tools/call` returns **in-band**
x402 payment requirements as a tool result (never a raw HTTP 402
on `POST /mcp` — that breaks MCP clients). Settle in USDC on Base
and retry the same call with the payment proof. Discovery tools
(`find_places`, `search_data`, `describe_data`, `get_status`)
stay free. Keyed and keyless rails are mutually exclusive per
request. Under the Stripe payee the quote floors at **$0.01** per
call. See <https://developers.smarterweather.com/agents>.

## Client configuration

### Cursor

In the project `.cursor/mcp.json`, use `envFile` so the
bridge reads the `.env` written by `login` / `trial` / `start_trial`
(Cursor requires `"type": "stdio"` for `envFile`):

```jsonc
{
  "mcpServers": {
    "smarterweather": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@smarterweather/mcp-weather"],
      "envFile": "${workspaceFolder}/.env"
    }
  }
}
```

Cursor also interpolates `${env:NAME}` from the process environment.
Do not paste `sw_live_` / `sw_test_` into the JSON. The bridge itself
falls back to `cwd/.env` when the process env is unset.

### Claude Desktop / Claude Code

In `claude_desktop_config.json` (macOS:
`~/Library/Application Support/Claude/claude_desktop_config.json`),
point the bridge at the project `.env` by absolute path instead of
pasting the key (Claude Desktop does not interpolate `${…}`):

```jsonc
{
  "mcpServers": {
    "smarterweather": {
      "command": "npx",
      "args": ["-y", "@smarterweather/mcp-weather"],
      "env": {
        "SMARTERWEATHER_ENV_FILE": "/absolute/path/to/your/project/.env"
      }
    }
  }
}
```

The client connects to the local bridge over stdio; the bridge
connects to `https://mcp.smarterweather.com` over streamable
HTTP and attaches your API key.

### MCP Inspector

The reference inspector at
<https://github.com/modelcontextprotocol/inspector> works
out-of-the-box; point it at the same `npx` command.

## Tool catalog (current)

The hosted server exposes **35 tools** organized around
meteorologist workflows rather than raw endpoints. Every
location-aware tool accepts either a free-text `location` string or
explicit `lat`/`lon`. Call `tools/list` for the live, canonical
catalog with full input/output schemas.

The root URL lists the `core` and `catalog` toolsets (12 weather
tools) plus `find_tools` and `call_tool`: `find_tools` lists the
other toolsets' tools and `call_tool` runs one on the same
connection. `/x/all`, or `/x/<toolset>[,<toolset>]`, lists toolsets
directly.

### Location

- `find_places` — pass `query` (place name, ZIP, venue or address;
  `fuzzy` for partial input) for ranked candidates with lat/lon, or
  `lat` + `lon` for the place and timezone at a point. Returns
  `candidates[]`; in point mode each candidate carries
  `relation: "in" | "near"`.

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
- `get_observed_precipitation` — observed rain totals (MRMS QPE)
  over 1–72 h windows.
- `get_observations` — recent station observations.
- `get_lightning_activity` — recent lightning strikes near a point.
- `get_storm_reports` — local storm reports (wind, hail, tornado).
- `get_sounding` — nearest model sounding profile with derived
  severe-weather parameters (CAPE, shear, SRH, ...).
- `get_tropical_observations` — Hurricane Hunter reconnaissance
  (center fixes and flight-level observations).

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
- `get_climate_normals` — day-of-year NCEI 1991–2020 normals from
  the nearest station.
- `get_path_exposure` — civic points of interest (schools, hospitals,
  airports, ...) inside a caller-supplied GeoJSON polygon.
- `get_storm_cells` — storm-scale cell tracks, hail, mesocyclone and
  TVS signatures.
- `get_air_quality` — AQI and constituent pollutants.
- `get_growing_degree_days` — accumulated GDD for agriculture.

### Data plane (raw grids)

- `search_data` — which dataset answers a question (`query`), or,
  without `query`, the datasets at a place with freshness. Returns
  `hits[]`; with `query` each hit carries the exact `call` to run
  next.
- `describe_data` — variables, horizon, cadence, and freshness for
  one dataset.
- `query_dataset` — point-query any dataset variable time series.
- `get_period_totals` — accumulations/aggregates over a period.

### Analysis

- `compare_locations` — side-by-side multi-location comparison for
  an event or trip.
- `find_best_window` — rank time windows against weather criteria
  ("best 3-hour window for a run this week").
- `get_route_weather` — forecast hazards, alerts, and outlooks along
  a caller-supplied path, for up to 3 departures.
- `get_forecast_skill` — how accurate our forecasts have been near a
  location, measured against observed analysis truth.
- `get_forecast_skill_map` — the same skill measurement as hexes
  inside a bounding box.

### Platform

- `get_status` — data-freshness state per source; check it
  before reporting data as current.

### Visual

- `get_map_snapshot` — rendered weather map image (PNG): pick a
  product (radar, satellite, SPC outlooks, model fields, ...) plus
  location/zoom, or pass a full declarative scene document layering
  basemap + multiple weather products + alert overlays.
- `get_sounding_chart` — rendered Skew-T + hodograph image for the
  nearest model sounding.

Additions after launch follow the same deprecation policy as the
REST API (see [REST API guide](./rest-api.md#stability-promise)).

## Interactive widgets (MCP Apps)

The server implements the [MCP Apps extension](https://modelcontextprotocol.io/extensions/apps/overview):
in hosts that support it, the flagship weather tools render an
interactive widget alongside the model's text answer.

- **Enhanced tools**: `get_forecast` (current-conditions card, with
  alert banners above it when alerts are active, plus a multi-day
  forecast strip), `get_hourly_forecast` (scrollable hourly strip),
  `get_alerts` (severity-styled alert banners), and `get_air_quality`
  (AQI card with EPA category).
- **How it works**: the tools reference one shared app resource,
  `ui://weather-widget/v1/index.html`, via `_meta.ui.resourceUri`, and
  include an additive `widget` block in `structuredContent`. Hosts
  without MCP Apps support ignore both — every tool result remains
  complete as plain structured content, so nothing breaks in
  non-Apps clients.
- **Widget interactivity** is host-mediated (suggestion chips send a
  chat prompt, alert links open in your browser, selections update
  model context). Widgets never trigger additional billable tool
  calls, and reading the `ui://` resource is not metered.
- **Supported hosts** (per the official client matrix): Claude and
  Claude Desktop, VS Code (GitHub Copilot), Microsoft 365 Copilot,
  Goose, Postman, MCPJam, Archestra. ChatGPT uses its own Apps SDK
  and is not covered by this extension.
- **Theming**: the widget adopts the host's style variables and
  light/dark theme automatically.

The widget block's `component` / `props` entries follow Smarter
Weather's published component contracts, so the same shapes power
first-party app UI and these widgets.

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
client behavior local; only key resolution and JSON-RPC framing
live in the package. Source:
[`packages/mcp-weather/`](../packages/mcp-weather/).
