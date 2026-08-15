# AGENTS.md — Smarter Weather developer platform

Guidance for AI agents integrating with Smarter Weather.

## Surfaces

| Surface | Endpoint | Auth |
| ------- | -------- | ---- |
| REST API | `https://api.smarterweather.com` | `Authorization: Bearer sw_live_*` / `sw_test_*` |
| Weather MCP | `https://mcp.smarterweather.com/mcp` | OAuth 2.1 + PKCE, or API key Bearer |
| Onboarding MCP | `https://developers.smarterweather.com/mcp` | Anonymous discovery tools; OAuth for account tools |

Canonical machine-readable contracts:

- OpenAPI: [`openapi.yaml`](./openapi.yaml)
- Weather MCP tool descriptors: [`descriptors/mcp-tools.json`](./descriptors/mcp-tools.json)
- Agent Plugin (skills + MCP config): [`plugins/smarterweather/`](./plugins/smarterweather/)
- Agent doc index: [`llms.txt`](./llms.txt)

## Preferred onboarding path

1. Connect to the **onboarding MCP** with no credentials.
2. Call `get_plans` / `get_documentation` / `sign_up`. The platform is in
   limited preview: `sign_up` returns a request-access URL; the user
   receives an email invitation once approved and creates their account
   from it.
3. Complete Clerk OAuth when the host prompts.
4. Call `create_api_key` (idempotent) and `configure_mcp`.
5. Use the returned key against the weather MCP or REST API.

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
- Errors use RFC 7807 problem details.

## Docs

- [Quickstart](./docs/quickstart.md)
- [Weather MCP](./docs/mcp-weather.md)
- [Onboarding MCP](./docs/mcp-onboarding.md)
- [REST API](./docs/rest-api.md)
- [Agent integration](./docs/agent-integration.md)
- [Errors](./docs/errors.md)

## Do not

- Invent endpoints or tools not listed in OpenAPI / `tools/list`.
- Paste live API keys into committed config files.
- Edit `openapi.yaml`, `descriptors/mcp-tools.json`, or
  `plugins/smarterweather/skills/` as the source of truth — they are
  mirrored from the private monorepo.
