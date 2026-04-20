# @smarterweather/mcp-weather

> **Preview — not yet functional.** This package is a name placeholder while the real stdio bridge to the [Smarter Weather hosted MCP server](https://mcp.smarterweather.com) is implemented. Running it today prints a one-line message and exits cleanly. Real implementation ships in Phase 3 of the developer ecosystem rollout — see [the public roadmap](https://github.com/smarterweather/developer#roadmap).

## Install (preview)

The preview is published under the `preview` dist-tag, so plain `npm install` will not resolve it. To run it explicitly:

```bash
npx -y @smarterweather/mcp-weather@preview
```

When the real implementation ships, the install command becomes `npx -y @smarterweather/mcp-weather` (no `@preview` suffix needed).

## What this will do (Phase 3)

A thin stdio-to-streamable-HTTP proxy. The MCP client (Cursor, Claude Desktop, Claude Code, etc.) speaks JSON-RPC over stdio to this process; this process attaches your `SMARTERWEATHER_API_KEY` and proxies every message to `https://mcp.smarterweather.com/mcp`. All weather logic runs server-side — no business logic ships in this package.

## License

[MIT](./LICENSE)
