---
"@smarterweather/mcp-weather": patch
---

Add MCP Registry metadata: `mcpName: "io.github.smarterweather/weather"` in `package.json` and a draft `server.json` manifest declaring both the hosted streamable-HTTP endpoint (`https://mcp.smarterweather.com/mcp`) and the npm stdio bridge as installation options. Required for `mcp-publisher publish` to the [official MCP Registry](https://registry.modelcontextprotocol.io). No runtime behaviour change.
