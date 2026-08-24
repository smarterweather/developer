# @smarterweather/mcp-weather

A stdio-to-Streamable-HTTP bridge for the [Smarter Weather hosted MCP server](https://github.com/afisch710/SmarterWeather/issues/7148). Lets local-only MCP clients (Claude Desktop, Claude Code, Cursor, MCP Inspector, etc.) talk to `sw-mcp` over the network and authenticate via either:

- **OAuth 2.1 + PKCE** (recommended for end users). The bridge runs the full MCP OAuth client — discovery, dynamic client registration, browser-based consent on `localhost`, and token caching at `~/.mcp-auth/`. You sign in once with your SmarterWeather account; tokens auto-refresh.
- **`SMARTERWEATHER_API_KEY`** environment variable. Useful for headless / CI / scripted clients that don't want a browser pop-up. The bridge forwards the key as an `Authorization: Bearer …` header on every proxied request.

The package itself is a thin wrapper around [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) — no weather logic ships here, no protocol implementation forks. All tools, schemas, rate-limiting, and metering live server-side in `sw-mcp`.

## Install

```bash
npx -y @smarterweather/mcp-weather --version
```

## Claude Desktop

Add to `claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`):

### OAuth (recommended)

```json
{
  "mcpServers": {
    "smarterweather": {
      "command": "npx",
      "args": ["-y", "@smarterweather/mcp-weather"]
    }
  }
}
```

When Claude Desktop starts the server, your default browser opens to a SmarterWeather sign-in flow. After consent, the bridge caches the access + refresh tokens locally and Claude Desktop sees the full tool catalog (`get_forecast`, `get_alerts`, `get_map_snapshot`, etc.).

### API key

```json
{
  "mcpServers": {
    "smarterweather": {
      "command": "npx",
      "args": ["-y", "@smarterweather/mcp-weather"],
      "env": {
        "SMARTERWEATHER_API_KEY": "<from create_api_key>"
      }
    }
  }
}
```

Claude Desktop does not interpolate env placeholders — replace
`<from create_api_key>` with the key in this local file (do not
commit it). The bridge injects `Authorization: Bearer <key>` on
every proxied request. No browser pop-up.

## Cursor

Add to `~/.cursor/mcp.json`. OAuth:

```json
{
  "mcpServers": {
    "smarterweather": {
      "command": "npx",
      "args": ["-y", "@smarterweather/mcp-weather"]
    }
  }
}
```

API key — Cursor interpolates `${env:NAME}` from the process
environment:

```json
{
  "mcpServers": {
    "smarterweather": {
      "command": "npx",
      "args": ["-y", "@smarterweather/mcp-weather"],
      "env": {
        "SMARTERWEATHER_API_KEY": "${env:SMARTERWEATHER_API_KEY}"
      }
    }
  }
}
```

> **Note (Cursor built-in OAuth):** Cursor's *built-in* MCP OAuth client (`cursor://` redirect) is currently incompatible with Clerk; this is tracked at [SmarterWeather#7184](https://github.com/afisch710/SmarterWeather/issues/7184). Using `@smarterweather/mcp-weather` (which delegates OAuth to `mcp-remote`'s loopback callback) is the documented workaround — it works on Cursor today.

## Dev / staging override

To point the bridge at a non-production `sw-mcp` deployment (e.g. a dev ALB), override the URL:

```json
{
  "mcpServers": {
    "smarterweather-dev": {
      "command": "npx",
      "args": ["-y", "@smarterweather/mcp-weather"],
      "env": {
        "SMARTERWEATHER_MCP_URL": "http://<dev-alb-dns>/mcp"
      }
    }
  }
}
```

Or pass the URL as a positional arg (precedence: positional > env > default):

```jsonc
"args": ["-y", "@smarterweather/mcp-weather", "http://<dev-alb-dns>/mcp"]
```

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `SMARTERWEATHER_MCP_URL` | Override the target MCP endpoint. Useful for dev / staging. | `https://mcp.smarterweather.com` |
| `SMARTERWEATHER_API_KEY` | Inject `Authorization: Bearer <key>` on every proxied request. Bypasses the OAuth flow. | unset (use OAuth) |
| `MCP_REMOTE_CONFIG_DIR` | OAuth token cache directory (passed through to `mcp-remote`). | `~/.mcp-auth/` |

Power users can pass any [`mcp-remote` flag](https://www.npmjs.com/package/mcp-remote) verbatim — they're forwarded unchanged. Examples:

- `--debug` — verbose logs at `~/.mcp-auth/{server_hash}_debug.log`.
- `--transport http-only` — force Streamable HTTP (skip SSE fallback).
- `--header "X-Custom:value"` — inject additional headers. Note the no-space form for cross-platform arg-escaping safety.

```jsonc
"args": [
  "-y", "@smarterweather/mcp-weather",
  "--debug",
  "--transport", "http-only"
]
```

## Troubleshooting

- **"Connection error: fetch failed"** — verify `SMARTERWEATHER_MCP_URL` (or the default) is reachable from your machine. `curl -i $SMARTERWEATHER_MCP_URL` should return an HTTP response (a 401 with a `WWW-Authenticate` header is the expected unauthenticated reply for `sw-mcp`).
- **OAuth window keeps re-opening** — clear stale tokens with `rm -rf ~/.mcp-auth/` and restart the MCP client.
- **API key returns 401** — double-check the key was minted with `mcp` scope and isn't expired. The bridge passes the key verbatim; `sw-mcp` is the source of truth for which scopes a key carries.
- **Cursor still doesn't see the server** — make sure `~/.cursor/mcp.json` is valid JSON, then restart Cursor. The MCP panel logs the spawned process's stderr.

## How it works (one paragraph)

The bin is a ~70-line Node script: it resolves the URL (positional arg → `SMARTERWEATHER_MCP_URL` → default), optionally appends `--header "Authorization:Bearer $SMARTERWEATHER_API_KEY"`, then `spawn()`s `mcp-remote`'s `dist/proxy.js` with the assembled argv. `mcp-remote` handles the actual stdio↔HTTP plumbing: it reads JSON-RPC over stdio, performs the OAuth flow if needed (discovery → DCR → PKCE → loopback callback → token cache), and proxies each message to the upstream HTTP MCP endpoint. Signals (SIGINT/SIGTERM/SIGHUP) are forwarded; exit codes propagate. The wrapper does not transform or inspect MCP traffic — it's purely a config-and-spawn shim.

## License

[MIT](./LICENSE)
