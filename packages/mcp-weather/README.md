# @smarterweather/mcp-weather

A stdio-to-Streamable-HTTP bridge for the Smarter Weather hosted MCP server at `https://mcp.smarterweather.com`. It lets local-only MCP clients (Claude Desktop, Claude Code, Cursor, MCP Inspector, etc.) reach `sw-mcp` over the network with your API key.

Requires Node.js 22 or later.

The package is a thin wrapper around [`mcp-remote`](https://www.npmjs.com/package/mcp-remote): no weather logic ships here, and the protocol implementation is not forked. All tools, schemas, rate limiting and metering live server-side in `sw-mcp`.

## Get an API key

Run one of these in your project directory:

```bash
# A human is present: device sign-in in the browser (free account, no card)
npx -y @smarterweather/mcp-onboarding@latest login

# No human present: mint a trial key you can claim into a free account later
npx -y @smarterweather/mcp-onboarding@latest trial
```

Both write `SMARTERWEATHER_API_KEY` to `./.env` (mode `0600`, gitignored) and print only a key prefix, never the key.

The bridge resolves the key from:

1. `SMARTERWEATHER_API_KEY` in the process environment
2. the file named by `SMARTERWEATHER_ENV_FILE`
3. `.env` in the working directory (skipped when the working directory is `/` or `$HOME`)

Unexpanded `${…}` placeholders count as unset. The bridge passes the key to `mcp-remote` as `Authorization:${SMARTERWEATHER_AUTH_HEADER}`, with the bearer only in the child process environment, never on argv.

Without a key the bridge still connects, and discovery tools such as `search_locations` and `search_catalog` stay free. Other tool calls return x402 payment requirements (USDC on Base) with `next_steps` that point back to `login` and `trial`. OAuth sign-in through the bridge is not available yet; use an API key.

## Install

```bash
npx -y @smarterweather/mcp-weather --version
```

## Claude Desktop

Add to `claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "smarterweather": {
      "command": "npx",
      "args": ["-y", "@smarterweather/mcp-weather"],
      "env": {
        "SMARTERWEATHER_ENV_FILE": "/absolute/path/to/your/project/.env"
      }
    }
  }
}
```

Claude Desktop does not interpolate env placeholders, so point the bridge at the `.env` that `login` / `trial` wrote, by absolute path. Never paste the key into this file. The bridge sends `Authorization: Bearer <key>` on every proxied request.

## Cursor

Use `envFile` in the project `.cursor/mcp.json` (`envFile` requires `"type": "stdio"`):

```json
{
  "mcpServers": {
    "smarterweather": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@smarterweather/mcp-weather"],
      "envFile": "${workspaceFolder}/.env"
    }
  }
}
```

Or `${env:NAME}` from the process environment:

```json
{
  "mcpServers": {
    "smarterweather": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@smarterweather/mcp-weather"],
      "env": {
        "SMARTERWEATHER_API_KEY": "${env:SMARTERWEATHER_API_KEY}"
      }
    }
  }
}
```

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `SMARTERWEATHER_API_KEY` | API key. Takes precedence when set; an unexpanded `${…}` falls through. | unset (then `SMARTERWEATHER_ENV_FILE`, then `.env`) |
| `SMARTERWEATHER_ENV_FILE` | Absolute `.env` path, read when the process env key is unset. | unset → `cwd/.env` (not `/` or `$HOME`) |
| `SMARTERWEATHER_MCP_URL` | Override the target MCP endpoint. A positional URL argument wins over it. | `https://mcp.smarterweather.com` |

Any [`mcp-remote` flag](https://www.npmjs.com/package/mcp-remote) passes through unchanged. Examples:

- `--debug`: verbose logs at `~/.mcp-auth/{server_hash}_debug.log`.
- `--transport http-only`: force Streamable HTTP (skip the SSE fallback).
- `--header "X-Custom:value"`: add a header. Use the no-space form for cross-platform argument escaping.

```jsonc
"args": [
  "-y", "@smarterweather/mcp-weather",
  "--debug",
  "--transport", "http-only"
]
```

## Troubleshooting

- **Tool calls return "Payment required"**: the bridge found no key. Its stderr names every place it checked. Run `login` or `trial` in the project directory, or set `SMARTERWEATHER_ENV_FILE` to the `.env` path, then restart the MCP client.
- **"Incompatible auth server: does not support dynamic client registration"**: the server rejected the key (unknown, revoked or expired), and the bridge has no sign-in fallback. Mint a new key with `login` or `trial` and restart the client. The bridge passes the key verbatim.
- **"Connection error: fetch failed"**: check that the endpoint is reachable from your machine. `curl -i https://mcp.smarterweather.com` should return HTTP `405` with `Method not allowed. Use POST.` (the endpoint accepts POST only).
- **Cursor doesn't see the server**: make sure `.cursor/mcp.json` is valid JSON, then restart Cursor. The MCP panel logs the spawned process's stderr.

## How it works

The bin is a small Node script. It resolves the URL (positional arg → `SMARTERWEATHER_MCP_URL` → default) and the API key (see above), sets `SMARTERWEATHER_AUTH_HEADER` in the child environment, appends `--header "Authorization:${SMARTERWEATHER_AUTH_HEADER}"` when a key was found, then `spawn()`s `mcp-remote`'s `dist/proxy.js`. `mcp-remote` reads JSON-RPC over stdio and proxies each message to the hosted Streamable HTTP endpoint. Signals (SIGINT/SIGTERM/SIGHUP) are forwarded and exit codes propagate. The wrapper does not transform or inspect MCP traffic.

## License

[MIT](./LICENSE)
