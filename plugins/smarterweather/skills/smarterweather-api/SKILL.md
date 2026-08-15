---
name: smarterweather-api
description: >-
  Build integrations against the Smarter Weather developer platform — the
  REST API at api.smarterweather.com. Covers authentication via API key,
  calling /v1/weather, /v1/alerts/{id}, /v1/geocode/{search,autosuggest,reverse},
  and /v1/storm-tracks,
  handling the RFC 7807 error envelope, respecting RateLimit-* headers,
  and choosing between REST and MCP for the integration. Use when the
  user wants to fetch weather data from Smarter Weather, integrate the
  Smarter Weather REST API, mint or use a SMARTERWEATHER_API_KEY, or
  write any code that calls api.smarterweather.com.
license: MIT
metadata:
  canonical: https://developers.smarterweather.com/.well-known/skills/smarterweather-api/SKILL.md
---

# Use the Smarter Weather REST API

The platform offers two surfaces; pick the right one for the user's goal:

| Goal | Use |
| --- | --- |
| Code that runs in production and calls weather endpoints from the user's own service | **REST API** (`api.smarterweather.com/v1/*`) — this skill |
| An AI agent that calls weather tools live during a chat session | **MCP servers** — see the `smarterweather-mcp` skill |
| One-time onboarding (account, key minting, client config) | `@smarterweather/mcp-onboarding` MCP — see the `smarterweather-mcp` skill |

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
- **Never** commit a key to a repo, even temporarily. Smarter Weather
  participates in GitHub secret scanning; leaked keys are revoked
  automatically.
- **Always** use `sw_test_*` prefixed keys in tests, examples, and local
  dev scaffolds. Production code uses `sw_live_*`.
- Keys are minted, rotated, and revoked at
  <https://developers.smarterweather.com/dashboard/api-keys>, or by an
  agent through the onboarding MCP (`create_api_key`).

## REST API

### Shape

| Item | Value |
| --- | --- |
| Base URL | `https://api.smarterweather.com` |
| Versioning | Path-based: `/v1/*` |
| Auth header | `Authorization: Bearer $SMARTERWEATHER_API_KEY` (the `X-API-Key` header is **not** supported) |
| Response content type | `application/json; charset=utf-8` (success), `application/problem+json` (errors) |
| Machine-readable contract | <https://developers.smarterweather.com/openapi.yaml> |

The OpenAPI document above is canonical. If an endpoint is not in it, the
endpoint does not exist — don't fabricate.

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

The "one call, full picture" shape of `/v1/weather` is intentional: it
returns current conditions, hourly and daily forecasts, active alerts,
and radar metadata in one response. Prefer it over fanning out to
multiple endpoints.

### Errors

Errors are RFC 7807 `application/problem+json` documents with a stable
shape. Always parse defensively.

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
| 422 | Semantically invalid (e.g. coordinates outside coverage) | No |
| 429 | Rate-limited | Yes — back off (see below) |
| 5xx | Server error | Yes — exponential backoff with jitter |

When surfacing errors to the user, include the problem `type` and
`instance` (or the `X-Request-Id` response header) so support can look
up what happened.

### Rate limits

Every authenticated response carries the IETF draft `RateLimit-*` headers:

- `RateLimit-Limit` / `RateLimit-Remaining` / `RateLimit-Reset` — the
  per-minute window
- `RateLimit-Policy` — window + burst policy, e.g. `60;w=60;burst=60`
- `RateLimit-Daily-Limit` / `RateLimit-Daily-Remaining` /
  `RateLimit-Daily-Reset` — per-day quota

On `429`, respect `Retry-After` (seconds) if present; otherwise use
exponential backoff starting at 1 second with jitter, capped at 5
retries. Production code should pre-empt 429s by pacing requests when
`RateLimit-Remaining` drops near zero.

## Anti-patterns to avoid

1. **Hard-coding the API key into source files.** Read from
   `process.env.SMARTERWEATHER_API_KEY` (or the language equivalent).
2. **Calling `/v1/weather` in a tight loop without caching.** Cache with
   a sane TTL (60-300 seconds for current conditions, longer for
   forecasts).
3. **Treating 5xx as terminal.** Retry server errors with backoff; treat
   only 4xx as caller errors.
4. **Calling the production API from tests.** Use `sw_test_*` keys; mock
   responses where practical.
5. **Inventing endpoints.** The canonical contract is
   <https://developers.smarterweather.com/openapi.yaml>.

## Where to learn more

- Developer portal: <https://developers.smarterweather.com>
- Quickstart: <https://developers.smarterweather.com/quickstart>
- REST API reference: <https://developers.smarterweather.com/api/reference>
- Agent-oriented doc index: <https://developers.smarterweather.com/llms.txt>
- MCP integration: the `smarterweather-mcp` skill at
  <https://developers.smarterweather.com/.well-known/skills/smarterweather-mcp/SKILL.md>
