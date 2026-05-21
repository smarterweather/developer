---
"@smarterweather/mcp-weather": minor
---

Replace the preview placeholder with a real stdio↔Streamable-HTTP bridge. The bin now `spawn()`s [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) with SmarterWeather URL defaults (`https://mcp.smarterweather.com/mcp`, overridable via `SMARTERWEATHER_MCP_URL` env or positional argument) and optionally injects an `Authorization: Bearer $SMARTERWEATHER_API_KEY` header so headless callers can skip the OAuth flow. Adds `--version` short-circuit (also reports the bundled `mcp-remote` version), signal forwarding (SIGINT/SIGTERM/SIGHUP), and a `vitest` unit-test suite covering argv assembly. Implements [M7-1 / SmarterWeather#8087](https://github.com/afisch710/SmarterWeather/issues/8087) toward the broader [#8000](https://github.com/afisch710/SmarterWeather/issues/8000) launch milestone.
