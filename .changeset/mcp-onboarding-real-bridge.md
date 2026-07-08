---
"@smarterweather/mcp-onboarding": major
---

GA release (`1.0.0`): replace the preview placeholder with the real stdio↔Streamable-HTTP bridge to the hosted developer onboarding MCP server, now live at `https://developers.smarterweather.com/mcp`. The bin `spawn()`s [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) with the Smarter Weather URL default (overridable via `SMARTERWEATHER_ONBOARDING_MCP_URL` or a positional argument). Anonymous by default — the open discovery tools (`get_plans`, `get_documentation`, `sign_up`) need no credentials; set `SMARTERWEATHER_ONBOARDING_AUTH=required` to opt into the OAuth 2.1 + PKCE sign-in that unlocks the account-scoped key-lifecycle and billing tools. Adds `--version` short-circuit, signal forwarding, argv pass-through to `mcp-remote`, a vitest suite, and MCP Registry metadata (`mcpName`, `server.json`).
