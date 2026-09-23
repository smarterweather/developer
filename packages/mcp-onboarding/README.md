# @smarterweather/mcp-onboarding

stdio bridge to the [Smarter Weather developer onboarding MCP server](https://mcp.developers.smarterweather.com) — the agent-first way onto the Smarter Weather platform. Your AI coding agent can explore plans and docs, sign you up, mint API keys, configure your MCP client, and manage billing, all from inside your editor.

A thin wrapper around [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) with Smarter Weather defaults. Discovery and account tools run server-side. `start_trial` is answered **locally**: the package mints over HTTPS, writes `SMARTERWEATHER_API_KEY` to `.env` (mode `0600`), and returns only a 12-character `key_prefix`. After upgrading the package, restart the MCP server so the new interceptor is loaded.

## Quick start (anonymous)

No account, no key, no auth. The open discovery tools (`get_plans`, `get_documentation`, `sign_up`) work immediately:

```json
{
  "mcpServers": {
    "smarterweather-onboarding": {
      "command": "npx",
      "args": ["-y", "@smarterweather/mcp-onboarding"]
    }
  }
}
```

## Authenticated mode (account tools)

Set `SMARTERWEATHER_ONBOARDING_AUTH=required` to unlock the account-scoped tools (`create_api_key`, `list_api_keys`, `rotate_api_key`, `revoke_api_key`, `configure_mcp`, `get_usage`, `get_billing_status`, `upgrade_plan`, `open_billing_portal`). The first request triggers an OAuth 2.1 + PKCE browser sign-in (Clerk); tokens cache at `~/.mcp-auth/`.

Production Clerk keeps **Dynamic Client Registration off**. The bridge uses a pre-registered public PKCE OAuth client (`client_id` baked into the package) and pins the mcp-remote loopback callback to `http://localhost:3334/oauth/callback` so it matches the Clerk app’s redirect URI. No client secret is required or shipped.

```json
{
  "mcpServers": {
    "smarterweather-onboarding": {
      "command": "npx",
      "args": ["-y", "@smarterweather/mcp-onboarding"],
      "env": {
        "SMARTERWEATHER_ONBOARDING_AUTH": "required"
      }
    }
  }
}
```

Ensure port `3334` is free when authenticating; if mcp-remote falls back to a random port, Clerk will reject the redirect.

## Configuration

| Env var | Default | Purpose |
| --- | --- | --- |
| `SMARTERWEATHER_ONBOARDING_MCP_URL` | `https://mcp.developers.smarterweather.com` | Target endpoint override (dev/staging). A positional URL argument takes precedence over both. |
| `SMARTERWEATHER_ONBOARDING_AUTH` | *(unset)* | `required` → opt into the OAuth challenge and account-scoped tools. |
| `SMARTERWEATHER_ONBOARDING_OAUTH_CLIENT_ID` | `PQcxOLVZg5kxzhoC` | Override the pre-registered Clerk OAuth client_id (staging / alternate apps). |
| `SMARTERWEATHER_ENV_FILE` | *(unset)* | Absolute path for the local `start_trial` sink. When unset, the bridge uses the first MCP `file://` root (skipping `/` and `$HOME`), then `cwd/.env`. |
| `SMARTERWEATHER_API_KEY` | *(unset)* | If already set, `start_trial` is a no-op (`already_configured`) and does not mint. |
| `SMARTERWEATHER_API_BASE_URL` | `https://api.smarterweather.com` | Override the trial challenge/mint origin (dev/staging). |

Any extra CLI arguments (`--debug`, `--transport http-only`, `--header X:y`, …) pass through verbatim to `mcp-remote`. If you already pass a callback port or `--static-oauth-client-info`, the bridge will not double-inject them.

`--version` prints the bridge version plus the bundled `mcp-remote` version and exits.

## Looking for weather data?

This package onboards you to the platform. The weather data itself is served by [`@smarterweather/mcp-weather`](https://www.npmjs.com/package/@smarterweather/mcp-weather) (hosted at `mcp.smarterweather.com`) — which `configure_mcp` will happily set up for you.

## License

[MIT](./LICENSE)
