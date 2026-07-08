# @smarterweather/mcp-onboarding

stdio bridge to the [Smarter Weather developer onboarding MCP server](https://developers.smarterweather.com/mcp) — the agent-first way onto the Smarter Weather platform. Your AI coding agent can explore plans and docs, sign you up, mint API keys, configure your MCP client, and manage billing, all from inside your editor.

A thin wrapper around [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) with Smarter Weather defaults. All onboarding logic runs server-side.

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

## Configuration

| Env var | Default | Purpose |
| --- | --- | --- |
| `SMARTERWEATHER_ONBOARDING_MCP_URL` | `https://developers.smarterweather.com/mcp` | Target endpoint override (dev/staging). A positional URL argument takes precedence over both. |
| `SMARTERWEATHER_ONBOARDING_AUTH` | *(unset)* | `required` → opt into the OAuth challenge and account-scoped tools. |

Any extra CLI arguments (`--debug`, `--transport http-only`, `--header X:y`, …) pass through verbatim to `mcp-remote`.

`--version` prints the bridge version plus the bundled `mcp-remote` version and exits.

## Looking for weather data?

This package onboards you to the platform. The weather data itself is served by [`@smarterweather/mcp-weather`](https://www.npmjs.com/package/@smarterweather/mcp-weather) (hosted at `mcp.smarterweather.com`) — which `configure_mcp` will happily set up for you.

## License

[MIT](./LICENSE)
