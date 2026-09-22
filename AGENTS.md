# AGENTS.md — Smarter Weather developer platform

Guidance for AI agents integrating with Smarter Weather.

**Agents: start here.** There is nothing to install. Call the REST API with
no key and read the response: every `401`, `403`, and `429` is an RFC 9457
problem whose `next_steps` member names where to go (`recommended` first)
and carries an RFC 6750 `WWW-Authenticate: Bearer` challenge.

```bash
curl -sS -D - 'https://api.smarterweather.com/v1/weather?lat=41.66&lon=-91.53'
```

Then get a key (see below), write it to `.env` as
`SMARTERWEATHER_API_KEY`, add `.env` to `.gitignore`, and call again with
`Authorization: Bearer sw_live_*`.

## Surfaces

| Surface | Endpoint | Auth |
| ------- | -------- | ---- |
| REST API | `https://api.smarterweather.com` | `Authorization: Bearer sw_live_*` / `sw_test_*` |
| Weather MCP | `https://mcp.smarterweather.com` | OAuth 2.1 + PKCE, or API key Bearer |
| Onboarding MCP | `https://mcp.developers.smarterweather.com` | Anonymous discovery tools; OAuth for account tools |

Canonical machine-readable contracts:

- OpenAPI: [`openapi.yaml`](./openapi.yaml)
- Weather MCP tool descriptors: [`descriptors/mcp-tools.json`](./descriptors/mcp-tools.json)
- Agent Plugin (skills + MCP config): [`plugins/smarterweather/`](./plugins/smarterweather/)
- Agent doc index: [`llms.txt`](./llms.txt)

## Getting a key

- **Human present (recommended):** send them to
  <https://developers.smarterweather.com/dashboard/api-keys> (free, no
  card; the key is shown once) and have them put it in `.env`, not chat.
- **Client speaks MCP:** use the onboarding MCP path below.
- **Agent holds a wallet:** pay per call on the weather MCP via x402
  (USDC on Base); no account needed.

## Onboarding MCP path

1. Connect to the **onboarding MCP** with no credentials.
2. Call `get_plans` / `get_documentation` / `sign_up`. `sign_up` returns
   a Clerk signup URL; a human completes account creation in the browser
   (no credit card for the free tier).
3. Complete Clerk OAuth when the host prompts.
4. Call `create_api_key` (idempotent) and `configure_mcp`.
5. Use the returned key against the weather MCP or REST API, then remove
   the onboarding server from the client config (it is one-shot).

stdio bridges (local clients that cannot speak Streamable HTTP):

```bash
npx -y @smarterweather/mcp-onboarding
npx -y @smarterweather/mcp-weather
```

Do **not** append `@preview` — `latest` is the GA bridge. Set
`SMARTERWEATHER_API_KEY` in the process environment for headless weather
calls; set `SMARTERWEATHER_ONBOARDING_AUTH=required` to force onboarding
OAuth for account-scoped tools. Authenticated onboarding uses a
pre-registered public PKCE Clerk client (DCR off); ensure port `3334` is
free for the loopback callback. Prefer the stdio bridge over Cursor's
native `url` OAuth for gated tools (Clerk + `cursor://` is broken).

## Auth and errors

- Prefer `Authorization: Bearer <key>` (not `X-API-Key`).
- Rate-limit headers follow the `RateLimit-*` family (see docs).
- Errors use RFC 9457 problem details (same wire format as RFC 7807);
  `401` / `403` / `429` carry a `next_steps` extension. See
  [docs/errors.md](./docs/errors.md).

## Docs

- [Quickstart](./docs/quickstart.md)
- [Weather MCP](./docs/mcp-weather.md)
- [Onboarding MCP](./docs/mcp-onboarding.md)
- [REST API](./docs/rest-api.md)
- [Agent integration](./docs/agent-integration.md)
- [Errors](./docs/errors.md)

## Do not

- Invent endpoints or tools not listed in OpenAPI / `tools/list`.
- Paste live API keys into committed config files, chat output, or logs;
  read `SMARTERWEATHER_API_KEY` from the environment.
- Edit `openapi.yaml`, `descriptors/mcp-tools.json`, or
  `plugins/smarterweather/skills/` as the source of truth — they are
  mirrored from the private monorepo.
