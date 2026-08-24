---
"@smarterweather/mcp-weather": patch
---

Point the stdio bridge default and the official MCP Registry remote at `https://mcp.smarterweather.com` (hostname apex). The previous `/mcp` path remains a cutover alias on the server until it is removed; new installs should use the apex URL.
