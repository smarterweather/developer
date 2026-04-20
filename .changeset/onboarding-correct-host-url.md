---
"@smarterweather/mcp-onboarding": patch
---

Correct the placeholder's hosted-server URL from `https://onboarding.smarterweather.com` to `https://developers.smarterweather.com/mcp`. Per the developer-platform domain registry (issue #7155, ADR-002), the meta MCP server (sw-onboarding) is co-hosted with the developer portal at `developers.smarterweather.com/mcp` via path-based CloudFront routing — `onboarding.smarterweather.com` is reserved for an unrelated future B2B product.
