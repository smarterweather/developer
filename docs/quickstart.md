# Smarter Weather Developer Platform - Quickstart

Three requests from zero to a live weather call. Nothing to install.
Works for a person with a terminal and for a coding agent acting on
their behalf; agents should also read
[`llms.txt`](https://developers.smarterweather.com/llms.txt) (served
identically as `/AGENTS.md`).

## 0. Agents: start here

Call the API before you have a key. The response tells you what to do:

```bash
curl -sS -D - 'https://api.smarterweather.com/v1/weather?lat=41.66&lon=-91.53'
```

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
    "recommended": "get_key",
    "get_key": { "href": "https://developers.smarterweather.com/dashboard/api-keys?utm_…", "description": "Sign in (free, no card) and mint an API key. …" },
    "quickstart": { "href": "…", "description": "…" },
    "agents": { "href": "…", "description": "…" },
    "onboarding_mcp": { "href": "…", "description": "…" },
    "keyless_x402": { "href": "…", "description": "…" },
    "key_handling": { "href": "…", "description": "…" },
    "errors": { "href": "…", "description": "…" }
  }
}
```

`next_steps.recommended` names the link to take first. Every `401`,
`403`, and `429` carries this block (see [`errors.md`](./errors.md)), so
an agent never has to guess where to go.

## 1. Get an API key

Pick one:

- **Dashboard (recommended when a human is present).** Sign in at
  <https://developers.smarterweather.com/dashboard/api-keys> (free, no
  card) and click **New key**. The key is shown exactly once
  (`sw_live_...` or `sw_test_...`).
- **Onboarding MCP (when the client speaks MCP).** Connect anonymously
  to `https://mcp.developers.smarterweather.com` (Streamable HTTP) and
  call `get_plans` / `sign_up`; after the host completes OAuth 2.1, call
  `create_api_key` (idempotent) then `configure_mcp`. Remove the
  onboarding server from the client config afterwards; it is one-shot.
  See [`mcp-onboarding.md`](./mcp-onboarding.md).
- **Wallet, no account.** Agents holding USDC on Base can pay per call
  on the weather MCP via x402; see
  <https://developers.smarterweather.com/agents#x402>.

**Key handling, every time:** write the key to `.env` as
`SMARTERWEATHER_API_KEY=...`, add `.env` to `.gitignore`, read it from
the environment in code, and never echo it into chat, logs, or a
commit. Use `sw_test_*` keys in CI. If a key ever lands in a
repository, rotate it from the dashboard.

Your key is tied to a **tier** (free, developer, professional,
enterprise) which dictates your rate limit, monthly request allowance,
and overage pricing. See [pricing](https://developers.smarterweather.com/pricing)
for the current numbers.

## 2. Make your first call

Every request carries your key as an HTTP Bearer token in the
`Authorization` header. The base URL is
`https://api.smarterweather.com`. The `X-API-Key` header is **not**
supported — requests that send it instead of `Authorization` are
rejected with `401` (whose `next_steps` will tell you so).

### curl

```bash
curl -sS https://api.smarterweather.com/v1/weather \
  -H "Authorization: Bearer $SMARTERWEATHER_API_KEY" \
  --get \
  --data-urlencode "lat=40.7128" \
  --data-urlencode "lon=-74.0060"
```

### TypeScript (Node 20+ / fetch)

```ts
const res = await fetch(
  `https://api.smarterweather.com/v1/weather?lat=40.7128&lon=-74.0060`,
  {
    headers: {
      Authorization: `Bearer ${process.env.SMARTERWEATHER_API_KEY!}`,
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
import os, requests

res = requests.get(
    "https://api.smarterweather.com/v1/weather",
    params={"lat": 40.7128, "lon": -74.0060},
    headers={
        "Authorization": f"Bearer {os.environ['SMARTERWEATHER_API_KEY']}"
    },
    timeout=10,
)
res.raise_for_status()
print(res.json())
```

## 3. Understand the response shape

Every success response is `Content-Type: application/json` with a
schema documented in [`openapi.yaml`](./openapi.yaml). The shape is
stable within a major version; breaking changes bump the version
prefix (`/v1/...` -> `/v2/...`) and run on an at-least-12-month
overlap.

## 4. Handle rate limits

Every response includes three rate-limit headers:

| Header                 | Meaning                                          |
| ---------------------- | ------------------------------------------------ |
| `RateLimit-Limit`      | Requests per minute allowed at your tier.        |
| `RateLimit-Remaining`  | Requests remaining in the current minute window. |
| `RateLimit-Reset`      | Seconds until the bucket refills.                |
| `RateLimit-Policy`     | Window + burst, e.g. `60;w=60;burst=60`.         |

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
`https://mcp.smarterweather.com`. For clients that only speak stdio:

```bash
SMARTERWEATHER_API_KEY=sw_live_... npx -y @smarterweather/mcp-weather
```

See [`mcp-weather.md`](./mcp-weather.md) for client-specific
configuration snippets and [`mcp-onboarding.md`](./mcp-onboarding.md)
for the agent-driven signup path.

## Next steps

- Error model and recovery: [`errors.md`](./errors.md).
- Full REST reference: [`rest-api.md`](./rest-api.md).
- SDKs: [`sdks.md`](./sdks.md).
- Agent framework integrations: [`agent-integration.md`](./agent-integration.md).
