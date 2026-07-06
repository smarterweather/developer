---
"@smarterweather/mcp-weather": major
---

GA release (`1.0.0`). Promote `@smarterweather/mcp-weather` off the `preview` dist-tag now that `mcp.smarterweather.com` is live: the package publishes to `latest`, so `npx -y @smarterweather/mcp-weather` (no `@preview` suffix) resolves to the stable bridge. No runtime behaviour change from the last preview — this cut finalizes the real stdio↔Streamable-HTTP bridge and registry metadata accumulated during pre-release. Closes [SmarterWeather#8000](https://github.com/afisch710/SmarterWeather/issues/8000).
