# @smarterweather/mcp-weather

## 0.0.0-preview.2

### Minor Changes

- [#17](https://github.com/smarterweather/developer/pull/17) [`a588215`](https://github.com/smarterweather/developer/commit/a58821507473f5cd074c056ea1ee830045de26dc) Thanks [@afisch710](https://github.com/afisch710)! - Replace the preview placeholder with a real stdio↔Streamable-HTTP bridge. The bin now `spawn()`s [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) with SmarterWeather URL defaults (`https://mcp.smarterweather.com/mcp`, overridable via `SMARTERWEATHER_MCP_URL` env or positional argument) and optionally injects an `Authorization: Bearer $SMARTERWEATHER_API_KEY` header so headless callers can skip the OAuth flow. Adds `--version` short-circuit (also reports the bundled `mcp-remote` version), signal forwarding (SIGINT/SIGTERM/SIGHUP), and a `vitest` unit-test suite covering argv assembly. Implements [M7-1 / SmarterWeather#8087](https://github.com/afisch710/SmarterWeather/issues/8087) toward the broader [#8000](https://github.com/afisch710/SmarterWeather/issues/8000) launch milestone.

## 0.0.0-preview.1

### Patch Changes

- Initial preview placeholder. Bridge to https://mcp.smarterweather.com — not yet functional. Real implementation ships in Phase 3 of the developer ecosystem rollout.
