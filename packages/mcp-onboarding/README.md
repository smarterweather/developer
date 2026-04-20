# @smarterweather/mcp-onboarding

> **Preview — not yet functional.** This package is a name placeholder while the real stdio bridge to the [Smarter Weather developer onboarding MCP server](https://developers.smarterweather.com/mcp) is implemented. Running it today prints a one-line message and exits cleanly. Real implementation ships in Phase 4 of the developer ecosystem rollout — see [the public roadmap](https://github.com/smarterweather/developer#roadmap).

## Install (preview)

The preview is published under the `preview` dist-tag, so plain `npm install` will not resolve it. To run it explicitly:

```bash
npx -y @smarterweather/mcp-onboarding@preview
```

When the real implementation ships, the install command becomes `npx -y @smarterweather/mcp-onboarding` (no `@preview` suffix needed).

## What this will do (Phase 4)

A thin stdio-to-streamable-HTTP proxy aimed at developer onboarding flows: account creation, API key provisioning, plan selection, and SDK setup walkthroughs delivered through your AI coding agent. The MCP client speaks JSON-RPC over stdio to this process; this process performs an OAuth browser-callback handshake to authorize the session and proxies messages to `https://developers.smarterweather.com/mcp`. All onboarding logic runs server-side.

## License

[MIT](./LICENSE)
