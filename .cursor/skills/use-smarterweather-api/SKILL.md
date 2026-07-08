---
name: use-smarterweather-api
description: >-
  Helps build integrations against the Smarter Weather developer platform -
  the REST API at api.smarterweather.com and the @smarterweather/mcp-weather
  MCP server. Covers authentication via API key, calling /v1/weather,
  handling the standard error envelope, respecting rate-limit headers, and
  choosing between REST and MCP for the integration. Use when the user
  wants to fetch weather data from Smarter Weather, integrate the Smarter
  Weather REST API or MCP server, mint or use a SMARTERWEATHER_API_KEY,
  install the @smarterweather/mcp-weather package, or write any code that
  calls api.smarterweather.com or mcp.smarterweather.com.
---

# Use the Smarter Weather Developer Platform

> **Preview.** The Smarter Weather public REST API (`api.smarterweather.com`)
> ships in Phase 2 of the platform rollout; the hosted MCP server
> (`mcp.smarterweather.com`) and the real `@smarterweather/mcp-weather`
> implementation ship in Phase 3. Until then, the npm package is a
> placeholder that exits with a status line. The contract shapes below are
> the planned launch shapes; treat them as authoritative for code structure
> and refactor when the spec lands. Roadmap: <https://github.com/smarterweather/developer#roadmap>

This skill teaches an agent how to consume Smarter Weather's developer
APIs correctly and idiomatically. The platform offers two surfaces; pick the
right one for the user's goal:

| Goal | Use |
| --- | --- |
| Code that runs in production and calls weather endpoints from the user's own service | **REST API** (`api.smarterweather.com/v1/*`) |
| An AI agent that calls weather tools live during a chat session | **MCP server** (`@smarterweather/mcp-weather`) wired into the user's MCP client |
| One-time onboarding (account, key minting, client config) | `@smarterweather/mcp-onboarding` MCP — **Phase 4** |

When in doubt, default to REST for code-generation tasks and MCP for
agent-runtime tool calls.

## Authentication — required reading

Every Smarter Weather request is authenticated with an API key. **Never
hard-code keys.** Read them from the environment:

```bash
export SMARTERWEATHER_API_KEY="sw_live_..."
```

Hard rules:

- **Never** paste a key into chat history, prompts, or commit messages.
  Agent platforms persist conversations server-side and any pasted key is
  effectively leaked.
- **Never** commit a key to a repo, even temporarily, even on a private
  branch. Smarter Weather participates in GitHub secret-scanning; leaked
  keys are revoked automatically and the user has to mint a new one.
- **Always** use `sw_test_*` prefixed keys when generating tests, examples,
  or local dev scaffolds. Production code uses `sw_live_*`.
- The user can mint, rotate, and revoke keys at
  <https://smarterweather.com/developers/dashboard/api-keys>. If they don't
  have one yet, point them there rather than trying to mint one
  programmatically.

## REST API

### Shape

| Item | Value |
| --- | --- |
| Base URL | `https://api.smarterweather.com` |
| Versioning | Path-based: `/v1/*` |
| Auth header | `Authorization: Bearer $SMARTERWEATHER_API_KEY` (the `X-API-Key` header is **not** supported) |
| Response content type | `application/json; charset=utf-8` (success), `application/problem+json` (errors) |

### Endpoints (planned launch surface)

- `GET /v1/health` — liveness probe; unauthenticated
- `GET /v1/weather?lat=<lat>&lon=<lon>` — unified response with
  current conditions, hourly forecast, daily forecast, active alerts, and
  radar metadata in one call

The "one call, full picture" shape of `/v1/weather` is intentional: most
integrations need several views of weather at the same point. Prefer it
over fanning out to multiple endpoints.

### Working example — TypeScript

```ts
const apiKey = process.env.SMARTERWEATHER_API_KEY;
if (!apiKey) {
  throw new Error("SMARTERWEATHER_API_KEY is not set");
}

const res = await fetch(
  "https://api.smarterweather.com/v1/weather?lat=41.88&lon=-87.63",
  {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  },
);

if (!res.ok) {
  // Errors are RFC 7807 application/problem+json documents.
  const problem = await res.json().catch(() => ({}));
  throw new Error(
    `SmarterWeather ${res.status}: ${problem?.type ?? "unknown"} - ${problem?.detail ?? res.statusText}`,
  );
}

const weather = await res.json();
```

### Working example — Python

```python
import os
import httpx

api_key = os.environ["SMARTERWEATHER_API_KEY"]

resp = httpx.get(
    "https://api.smarterweather.com/v1/weather",
    params={"lat": 41.88, "lon": -87.63},
    headers={"Authorization": f"Bearer {api_key}", "Accept": "application/json"},
    timeout=10.0,
)
resp.raise_for_status()
weather = resp.json()
```

### Working example — curl

```bash
curl -sS \
  -H "Authorization: Bearer $SMARTERWEATHER_API_KEY" \
  "https://api.smarterweather.com/v1/weather?lat=41.88&lon=-87.63"
```

### Errors

Errors are RFC 7807 `application/problem+json` documents with a stable
shape. Always parse defensively; never `JSON.parse` without a try/catch
around it.

```json
{
  "type": "https://smarterweather.com/errors/bad-request",
  "title": "Bad Request",
  "status": 400,
  "detail": "lat must be between -90 and 90",
  "instance": "/v1/weather"
}
```

| HTTP | Meaning | Retryable? |
| --- | --- | --- |
| 400 | Invalid request shape | No — fix the call |
| 401 | Missing or invalid API key | No — re-mint or check env |
| 403 | Key valid but not authorized for this endpoint or tier | No |
| 404 | Resource not found | No |
| 409 | Idempotency conflict (rare; only on POST endpoints) | No |
| 422 | Semantically invalid (e.g. coordinates outside coverage) | No |
| 429 | Rate-limited | Yes — back off (see below) |
| 5xx | Server error | Yes — exponential backoff with jitter |

When surfacing errors to the user, always include the problem `type` and
`instance` (or the `X-Request-Id` response header) — Smarter Weather
support can look up the instance/request id to explain what happened.

### Rate limits

Every authenticated response carries the IETF draft `RateLimit-*` headers:

- `RateLimit-Limit` — requests allowed in the current per-minute window
- `RateLimit-Remaining` — requests remaining in the current window
- `RateLimit-Reset` — seconds until the window resets
- `RateLimit-Policy` — window + burst policy, e.g. `60;w=60;burst=60`
- `RateLimit-Daily-Limit` / `RateLimit-Daily-Remaining` / `RateLimit-Daily-Reset` — per-day quota

When you hit `429`, respect `Retry-After` (seconds) if present; otherwise
use exponential backoff starting at 1 second with jitter, and never retry
more than 5 times. Production code should also pre-empt 429s by checking
`RateLimit-Remaining` and pacing requests when it drops near zero.

## MCP server (Phase 3)

Skip this section for code-generation tasks; jump back to REST.

When the user is configuring an MCP-capable client (Cursor, Claude Code,
Claude Desktop, Codex), wire the weather server in via the npm bridge:

```jsonc
// ~/.cursor/mcp.json (or equivalent for the client)
{
  "mcpServers": {
    "smarterweather-weather": {
      "command": "npx",
      "args": ["-y", "@smarterweather/mcp-weather@preview"],
      "env": { "SMARTERWEATHER_API_KEY": "<from shell, not pasted here>" }
    }
  }
}
```

Tell the user to set `SMARTERWEATHER_API_KEY` in their shell profile and
let the MCP client inherit it from the process environment — pasting the
key into the JSON config file is functionally fine but commits the key to
disk in cleartext, which is a worse posture than env-var inheritance.

The bridge is a thin stdio-to-streamable-HTTP proxy. All tool
implementations run on `mcp.smarterweather.com`; the bridge does not see
or modify weather data.

## When to file an issue vs. push code

- **Bug in your integration?** Read the [REST API guide][rest-guide] and
  the [error envelope][rest-errors] first; almost every "weird response" is
  a known shape.
- **Bug in the contract?** File an issue using the
  [API contract question][contract-template] template on the public repo —
  do **not** open a PR against `openapi.yaml` directly; the spec is
  read-only and synced from upstream.
- **Missing endpoint?** File a feature request with use case + workaround
  attempted.

[rest-guide]: https://github.com/smarterweather/developer/blob/main/docs/rest-api.md
[rest-errors]: https://github.com/smarterweather/developer/blob/main/docs/rest-api.md#errors
[contract-template]: https://github.com/smarterweather/developer/issues/new?template=api_contract_question.yml

## Anti-patterns to avoid

1. **Hard-coding the API key into source files.** Always read from
   `process.env.SMARTERWEATHER_API_KEY` (or the user's language equivalent).
2. **Calling `/v1/weather` in a tight loop without caching.** Most weather
   data updates on the order of minutes; cache responses with a sane TTL
   (60-300 seconds for current conditions, longer for forecasts).
3. **Treating 5xx as terminal.** Retry server errors with backoff; treat
   only 4xx as caller errors.
4. **Calling the production API from tests.** Use `sw_test_*` keys; mock
   responses where practical.
5. **Inventing endpoints.** If `/v1/<endpoint>` is not in this skill or in
   `docs/rest-api.md`, it doesn't exist yet. Don't fabricate.
6. **Mixing the two MCP packages.** `@smarterweather/mcp-weather` is the
   weather surface (API key auth). `@smarterweather/mcp-onboarding` is the
   one-time onboarding flow (OAuth). Never wire both into a long-lived
   client config.

## Where to learn more

- Public repo (this skill's home): <https://github.com/smarterweather/developer>
- Developer portal: <https://smarterweather.com/developers>
- REST API guide: [`docs/rest-api.md`](https://github.com/smarterweather/developer/blob/main/docs/rest-api.md)
- MCP weather guide: [`docs/mcp-weather.md`](https://github.com/smarterweather/developer/blob/main/docs/mcp-weather.md)
- Agent integration tutorial: [`docs/agent-integration.md`](https://github.com/smarterweather/developer/blob/main/docs/agent-integration.md)
