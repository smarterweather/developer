---
name: smarterweather-api
description: >-
  Build integrations against the Smarter Weather developer platform — the
  REST API at api.smarterweather.com. Covers authentication via API key,
  calling /v1/weather and the other routes in the OpenAPI contract,
  handling the RFC 9457 error envelope, respecting RateLimit-* headers,
  retrying safely, and choosing between REST and MCP for the integration. Use when the
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

**Coverage:** Smarter Weather covers the 50 US states and DC only. The
US territories (Puerto Rico, the US Virgin Islands, Guam, the Northern
Mariana Islands and American Samoa) and other countries are outside it.
Every route that takes a point (lat and lon, zip or location) returns
404 outside-coverage for a point outside the 50 states and DC.
/v1/alerts and /v1/observations return it for a bounding box that
touches no US domain (CONUS, Alaska, Hawaii); a box that touches one may
still include area outside the US. /v1/weather/batch reports it per item
as outside_coverage, and /v1/point with points and /v1/series/batch mark
such points out_of_domain, as they do a point the check could not reach
in time (retry it). If the location lookup is unavailable, the check can
briefly fail open. Routes keyed by a station, radar site, forecast
office or alert id, and nationwide lists, are not filtered by point, so
do not treat an empty result as an all-clear. Do not retry an
outside-coverage response.

## Authentication — required reading

Every Smarter Weather request is authenticated with an API key. **Never
hard-code keys.** Keep the key in the project's `.env` (mode 0600,
gitignored) and read it from the environment in server-side code:

```bash
# .env -- written for you by `login` / `trial` below
SMARTERWEATHER_API_KEY=sw_live_...
```

Load it before the samples below run:

- Node 20.6+: `node --env-file=.env app.mjs`.
- Python: `pip install python-dotenv`, then `from dotenv import
  load_dotenv` and `load_dotenv(".env")` at startup (reads `./.env` in
  the current directory; variables already set are kept).
- curl: read only the key, never `source` the file as shell (the last
  `KEY=` or `export KEY=` line wins; CR and quotes are stripped):

```bash
export SMARTERWEATHER_API_KEY="$(sed -n 's/^\(export \)\{0,1\}SMARTERWEATHER_API_KEY=//p' .env | tail -n 1 | tr -d "\r\"' ")"
```

The key is a server-side secret: call the API from your backend, never
from a browser bundle or mobile app.

Hard rules:

- **Prefer** `npx -y @smarterweather/mcp-onboarding@latest login` (human
  present) or `… trial` / stdio `start_trial` (no human). They write
  `.env` and return only a prefix.
- **Never** paste a key into chat history, prompts, or commit messages.
- **Never** commit a key to a repo, even temporarily. Smarter Weather
  participates in GitHub secret scanning; leaked keys are revoked
  automatically.
- **Always** use `sw_test_*` prefixed keys in tests, examples, and local
  dev scaffolds. Production code uses `sw_live_*`.
- Keys are also minted at
  <https://developers.smarterweather.com/dashboard/api-keys>, or by an
  agent through the onboarding MCP (stdio bridge sinks
  `create_api_key` into `.env`).

## REST API

### Shape

| Item | Value |
| --- | --- |
| Base URL | `https://api.smarterweather.com` |
| Versioning | Path-based: `/v1/*` |
| Auth header | `Authorization: Bearer $SMARTERWEATHER_API_KEY` (the `X-API-Key` header is **not** supported) |
| Response content type | `application/json` or `application/geo+json` by route (success; the operation in the OpenAPI document says which), `application/problem+json` (errors) |
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
  // Errors are RFC 9457 application/problem+json documents.
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

To keep that response small, shape it instead of trimming it client-side:
`view=concise` keeps a documented core set of hourly and daily columns
(rows are never dropped), `hourly_step=3&hourly_step_from=24` keeps the
first day hourly and every third hour after it, and `fields` selects exact
row members, e.g. `fields=hourly.temperature,hourly.precip_probability,daily.high,daily.low`.
An unknown `fields` name is a `400` that lists the valid names; `fields`
never adds sections, so keep the matching `include`. When thinning dropped
rows, `meta.hourly_sampling` (`{"step_hours":3,"from_hour":24}`) says so;
read it before treating the series as complete. The same parameters apply
to every row of `POST /v1/weather/batch`.

### Errors

Errors are RFC 9457 `application/problem+json` documents with a stable
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
| 404 | `type` `https://smarterweather.com/errors/not-found`: resource or place not found | No |
| 404 | `type` `https://smarterweather.com/errors/outside-coverage`: the point is outside the 50 US states and DC | No — follow `next_steps.coverage` |
| 429 | Rate-limited | Yes — after `Retry-After` (see below) |
| 503 | A dependency is briefly unreachable | Yes — after `Retry-After` if present, else backoff |
| other 5xx | Server error | Yes — exponential backoff, max 3 retries |

Two problems share `404`, so branch on the problem `type`, not the
status.

When surfacing errors to the user, include the problem `type` and
`instance` (or the `X-Request-Id` response header) so support can look
up what happened.

### Rate limits

<!-- generated:example rate-limit-headers -->

A request with a valid key gets these headers (the `RateLimit-Daily-*` ones only when the key has a daily cap). A response to a request without a valid key, such as a `401`, carries none, and neither does one for a first-party key that is exempt from rate limiting. The examples are a free key after its first call; `Retry-After` is from a `429`:

| Header | Example | Meaning |
| ------ | ------- | ------- |
| `RateLimit-Limit` | `30` | Burst size: requests you can send back to back. |
| `RateLimit-Remaining` | `29` | Requests left in the burst right now. |
| `RateLimit-Reset` | `1` | Seconds until the burst is fully refilled. |
| `RateLimit-Policy` | `30;w=30` | Burst and refill window as limit;w=seconds. The sustained rate is limit x 60 / w per minute. |
| `RateLimit-Daily-Limit` | `1000` | Requests per UTC day for this key. |
| `RateLimit-Daily-Remaining` | `999` | Requests left today. |
| `RateLimit-Daily-Reset` | `21600` | Seconds until the daily count resets at UTC midnight. |
| `Retry-After` | `1` (from a 429) | 429 only: seconds to wait before the next request. |

<!-- /generated -->

### Retry policy

The retry table at
<https://developers.smarterweather.com/errors> ("Retry guidance") is
authoritative; branch on the problem `type`. In short:

- Do not retry a `4xx` as-is: fix the request or follow `next_steps`.
  Examples of the exceptions: `429` (wait, below); `409` `conflict`
  (re-read state, retry once if the conflict was stale); `400`
  `trial-challenge-invalid` (fetch a fresh challenge, retry once);
  `402` `payment-required` on the MCP (retry once with a payment for one
  of `accepts`).
- On `429`, wait the `Retry-After` seconds. Without the header, wait
  `RateLimit-Daily-Reset` when `RateLimit-Daily-Remaining` is `0`,
  otherwise `RateLimit-Reset`.
- On `503` `trial-mint-unavailable` (the global trial cap), follow
  `next_steps.recommended` (`device_flow`) for a regular key instead of
  sleeping out the hour-long `Retry-After`. On another `503`, wait
  `Retry-After` when present.
- On other `5xx`, and on a `503` without `Retry-After`, back off
  exponentially: start at 250 ms or more, double each attempt, add
  jitter, and stop after 3 retries.
- Pre-empt `429`s by pacing requests when `RateLimit-Remaining` drops
  near zero.

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
5. **Inventing endpoints.** The route list is the canonical contract at
   <https://developers.smarterweather.com/openapi.yaml>; read it instead
   of guessing a path.

## Where to learn more

- Developer portal: <https://developers.smarterweather.com>
- Quickstart: <https://developers.smarterweather.com/quickstart>
- REST API reference: <https://developers.smarterweather.com/api/reference>
- Agent-oriented doc index: <https://developers.smarterweather.com/llms.txt>
- MCP integration: the `smarterweather-mcp` skill at
  <https://developers.smarterweather.com/.well-known/skills/smarterweather-mcp/SKILL.md>
