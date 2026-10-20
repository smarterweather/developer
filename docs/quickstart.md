# Smarter Weather Developer Platform - Quickstart

Three requests from zero to a live forecast call. Nothing to install for REST.
Works for a person with a terminal and for a coding agent acting on
their behalf; agents should also read
[`llms.txt`](https://developers.smarterweather.com/llms.txt) (served
identically as `/AGENTS.md`).

Coverage: Smarter Weather covers the 50 US states and DC only. The US
territories (Puerto Rico, the US Virgin Islands, Guam, the Northern
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
[`outside-coverage`](https://developers.smarterweather.com/errors#outside-coverage)
response.

## 0. Agents: start here

Call the API before you have a key. The response tells you what to do:

```bash
curl -sS -D - 'https://api.smarterweather.com/v1/weather?lat=42.3601&lon=-71.0589'
```

The answer (links other than the recommended one shortened to their
`href`):

<!-- generated:example 401 -->

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/problem+json
WWW-Authenticate: Bearer realm="api.smarterweather.com"

{
  "type": "https://smarterweather.com/errors/unauthorized",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Missing Authorization header. Pass your API key as 'Authorization: Bearer sw_live_*'.",
  "instance": "/v1/weather",
  "next_steps": {
    "recommended": "device_flow",
    "device_flow": {
      "href": "https://developers.smarterweather.com/quickstart?utm_campaign=401&utm_medium=problem-json&utm_source=api#device-flow",
      "description": "Human present: run the `command` below. It shows the human a verification URL and code, writes SMARTERWEATHER_API_KEY to ./.env (0600, gitignored), and prints only a key prefix. Without Node: device grant at the endpoints below, then POST api_keys_endpoint and write only the response's key field to .env as a SMARTERWEATHER_API_KEY= line (e.g. pipe through jq -r .key). Never print the key or access token.",
      "command": "npx -y @smarterweather/mcp-onboarding@latest login",
      "client_id": "k2h05BUoTP393zcD",
      "device_authorization_endpoint": "https://clerk.smarterweather.com/oauth/device_authorization",
      "token_endpoint": "https://clerk.smarterweather.com/oauth/token",
      "api_keys_endpoint": "https://api.smarterweather.com/developer/keys"
    },
    "agents": {
      "href": "https://developers.smarterweather.com/llms.txt?utm_campaign=401&utm_medium=problem-json&utm_source=api"
    },
    "errors": {
      "href": "https://developers.smarterweather.com/errors?utm_campaign=401&utm_medium=problem-json&utm_source=api"
    },
    "get_key": {
      "href": "https://developers.smarterweather.com/dashboard/api-keys?utm_campaign=401&utm_medium=problem-json&utm_source=api"
    },
    "key_handling": {
      "href": "https://developers.smarterweather.com/agents?utm_campaign=401&utm_medium=problem-json&utm_source=api#key-handling"
    },
    "keyless_x402": {
      "href": "https://developers.smarterweather.com/agents?utm_campaign=401&utm_medium=problem-json&utm_source=api#x402"
    },
    "onboarding_mcp": {
      "href": "https://developers.smarterweather.com/agents?utm_campaign=401&utm_medium=problem-json&utm_source=api"
    },
    "quickstart": {
      "href": "https://developers.smarterweather.com/quickstart?utm_campaign=401&utm_medium=problem-json&utm_source=api"
    }
  }
}
```

<!-- /generated -->

<!-- generated:example 401-trial-delta -->

When trial keys are enabled, the 401's `next_steps` also carries `if_no_human_present` and `trial` (`if_no_human_present` names the link an agent with no human present should take):

```json
{
  "if_no_human_present": "trial",
  "trial": {
    "href": "https://developers.smarterweather.com/agents?utm_campaign=401&utm_medium=problem-json&utm_source=api#trial",
    "description": "No human present: run the `command` below. It mints a trial key, writes SMARTERWEATHER_API_KEY to ./.env (0600, gitignored), prints only a key prefix and claim link. Without Node: GET challenge_endpoint, solve the SHA-256 proof-of-work, then POST mint_endpoint with the JSON body {\"challenge_token\": \"<from the challenge>\", \"solution\": \"<decimal string>\", \"accept_terms\": <true only once the terms are accepted>, \"client\": {\"name\": \"<your app name>\"}}. Set accept_terms to true only after reading the terms at https://developers.smarterweather.com/legal/terms (newer challenge responses carry them as terms_url, plus a request_example whose accept_terms stays false until you change it). Its api_key field is the bearer; write only that field to .env as a SMARTERWEATHER_API_KEY= line and never print it. Claim into a free account before claim_expires_at.",
    "command": "npx -y @smarterweather/mcp-onboarding@latest trial",
    "challenge_endpoint": "https://api.smarterweather.com/developer/keys/trial/challenge",
    "mint_endpoint": "https://api.smarterweather.com/developer/keys/trial"
  }
}
```

<!-- /generated -->

`next_steps.recommended` names the link to take first. Every `401`,
`402`, `403`, and `429` carries this block (see [errors](https://developers.smarterweather.com/errors)), so
an agent never has to guess where to go.

## 1. Get an API key

Pick one:

- **Human present (recommended).**
  `npx -y @smarterweather/mcp-onboarding@latest login` — RFC 8628 device
  grant; writes `SMARTERWEATHER_API_KEY` to `./.env` (0600, gitignored)
  and prints only a key prefix. Named by `next_steps.device_flow.command`.
- **No human present.**
  `npx -y @smarterweather/mcp-onboarding@latest trial` (or stdio
  `start_trial`) — same sink; named by `next_steps.trial.command` when
  trial is advertised. Its terms (calls, rate, claim window) are in
  [`llms.txt`](https://developers.smarterweather.com/llms.txt) and on
  the [quickstart page](https://developers.smarterweather.com/quickstart).
- **Dashboard.** Sign in at
  <https://developers.smarterweather.com/dashboard/api-keys> (free, no
  card) and click **New key**. Write the shown-once value straight to
  `.env`.
- **Onboarding MCP.** Connect anonymously to
  `https://mcp.developers.smarterweather.com`; after OAuth, via the stdio
  bridge `create_api_key` sinks into `.env`. Call `configure_mcp` for
  paste-ready Cursor (`envFile`) / Claude Desktop configs. See
  [the onboarding MCP](https://developers.smarterweather.com/agents).
- **Wallet, no account.** Agents holding USDC on Base can pay per call
  on the weather MCP via x402 (MCP-only; the REST API always needs a
  key); see <https://developers.smarterweather.com/agents#x402>.
- **Raw HTTP (curl / conformance only).** `POST /developer/keys` and
  `POST /developer/keys/trial` return the bearer in the body (`key` /
  `api_key`) — write only that field to `.env` as
  `SMARTERWEATHER_API_KEY=`; never print it. Recipe:
  <https://developers.smarterweather.com/quickstart#device-flow>.

**Key handling, every time:** keep the key only in `.env` as
`SMARTERWEATHER_API_KEY=...`, read it from the environment in code, and
never echo it into chat, logs, or a commit. Use `sw_test_*` keys in CI.
If a key ever lands in a repository, rotate it from the dashboard.

Your key is tied to a **tier** (free, developer, professional,
enterprise) which dictates your rate limit, monthly request allowance,
and overage pricing. See [pricing](https://developers.smarterweather.com/pricing)
for the current numbers.

## 2. Make your first call

Every request carries your key as an HTTP Bearer token in the
`Authorization` header. The base URL is
`https://api.smarterweather.com`. The `X-API-Key` header is **not**
supported — requests that send it instead of `Authorization` are
rejected with `401` (whose `next_steps` will tell you so). Each sample
reads `SMARTERWEATHER_API_KEY` from the environment and shows how to
load it from `.env`.

### curl

The first line reads only the key from `.env` (never `source` it as
shell) and keeps a key you already exported. If the key is still unset,
the call stops with a message instead of sending an empty token.

```bash
[ -n "$SMARTERWEATHER_API_KEY" ] || export SMARTERWEATHER_API_KEY="$(sed -n 's/^\(export \)\{0,1\}SMARTERWEATHER_API_KEY=//p' .env | tail -n 1 | tr -d "\r\"' ")"
curl -sS https://api.smarterweather.com/v1/weather \
  -H "Authorization: Bearer ${SMARTERWEATHER_API_KEY:?set SMARTERWEATHER_API_KEY first, see developers.smarterweather.com/quickstart}" \
  --get \
  --data-urlencode "lat=42.3601" \
  --data-urlencode "lon=-71.0589"
```

### JavaScript (Node 20.6+ / fetch)

```js
// Save as app.mjs; run: node --env-file=.env app.mjs
const res = await fetch(
  `https://api.smarterweather.com/v1/weather?lat=42.3601&lon=-71.0589`,
  {
    headers: {
      Authorization: `Bearer ${process.env.SMARTERWEATHER_API_KEY}`,
    },
  },
);
if (!res.ok) {
  throw new Error(`smarterweather ${res.status}: ${await res.text()}`);
}
const weather = await res.json();
console.log(weather);
```

### Python (requests)

```python
# pip install requests python-dotenv
import os, requests
from dotenv import load_dotenv

load_dotenv(".env")  # ./.env in the current directory; variables already set are kept

res = requests.get(
    "https://api.smarterweather.com/v1/weather",
    params={"lat": 42.3601, "lon": -71.0589},
    headers={
        "Authorization": f"Bearer {os.environ['SMARTERWEATHER_API_KEY']}"
    },
    timeout=10,
)
res.raise_for_status()
print(res.json())
```

## 3. Understand the response shape

Every success response is JSON (`application/json`, or
`application/geo+json` on the routes that return map features) with a
schema documented in [`openapi.yaml`](https://developers.smarterweather.com/openapi.yaml). The shape is
stable within a major version; breaking changes bump the version
prefix (`/v1/...` -> `/v2/...`) and run on an at-least-12-month
overlap. Every `/v1/weather` field, with its type and whether it can
be null, is in the [Weather field reference](https://developers.smarterweather.com/build-a-weather-app#fields).

## 4. Handle rate limits

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

When you exceed the limit the API returns **HTTP 429** with a
`Retry-After` header (seconds) and a `next_steps` block whose
`recommended` link (`upgrade`) is how to raise the limit. Your client
should back off for that many seconds before retrying. Don't retry
tighter than the header says; repeated violations surface as a support
flag.

```ts
if (res.status === 429) {
  const wait = Number(res.headers.get("retry-after") ?? "1") * 1000;
  await new Promise((r) => setTimeout(r, wait));
  // retry once, then surface the error if it still 429s.
}
```

## 5. Give your agent weather tools (optional)

If you're integrating with Cursor, Claude Desktop, Claude Code, or any
MCP-compatible client, the same key works on the hosted weather MCP at
`https://mcp.smarterweather.com`. For clients that only speak stdio, run
the bridge from the project whose `.env` holds the key. It reads
`SMARTERWEATHER_API_KEY`, then `SMARTERWEATHER_ENV_FILE`, then `./.env`:

```bash
npx -y @smarterweather/mcp-weather@latest
```

See the [MCP setup guide](https://developers.smarterweather.com/mcp-server/setup) for client-specific
configuration snippets and [the onboarding MCP](https://developers.smarterweather.com/agents)
for the agent-driven signup path.

## Next steps

- Build a weather app (your own backend, caching, times, icons and attribution): [developers.smarterweather.com/build-a-weather-app](https://developers.smarterweather.com/build-a-weather-app).
- Error model and recovery: [developers.smarterweather.com/errors](https://developers.smarterweather.com/errors).
- Full REST reference: [developers.smarterweather.com/api](https://developers.smarterweather.com/api).
- SDKs: [`sdks.md`](https://github.com/smarterweather/developer/blob/main/docs/sdks.md).
- Agent framework integrations: [`agent-integration.md`](https://github.com/smarterweather/developer/blob/main/docs/agent-integration.md).
