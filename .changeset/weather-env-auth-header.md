---
"@smarterweather/mcp-weather": minor
---

Resolve the API key from env → `SMARTERWEATHER_ENV_FILE` → `cwd/.env` (unexpanded `${…}` counts as unset) and pass `Authorization:${SMARTERWEATHER_AUTH_HEADER}` so the bearer never appears in argv or mcp-remote's header log.
