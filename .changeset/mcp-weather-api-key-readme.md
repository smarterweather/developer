---
"@smarterweather/mcp-weather": patch
---

Lead the README with the API key (`npx -y @smarterweather/mcp-onboarding@latest login` or `trial`) and state Node.js 22+. Drop the OAuth-first setup, the promise of a `401` with `WWW-Authenticate` for keyless calls, a private issue link, and the dev-ALB section: OAuth sign-in through the bridge is not available yet, and keyless tool calls return x402 payment requirements while discovery tools stay free. The no-key stderr line now says that and points at `login` / `trial` instead of OAuth sign-in. The MCP Registry `SMARTERWEATHER_API_KEY` description no longer promises an OAuth fallback.
