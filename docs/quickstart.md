# Smarter Weather Developer Platform - Quickstart

Get a live weather call going in under five minutes. Works for curl,
TypeScript, or Python.

## 1. Mint an API key

1. Sign up at <https://developers.smarterweather.com>.
2. Open **Dashboard -> API keys** and click **New key**.
3. Copy the key once; it's shown exactly one time (`sw_live_...` or
   `sw_test_...`). Store it in a password manager and your app's
   secret store.

Your key is tied to a **tier** (free, developer, professional,
enterprise) which dictates your rate limit, monthly request allowance,
and overage pricing. See [pricing](https://developers.smarterweather.com/pricing)
for the current numbers.

## 2. Make your first call

Every request carries `Authorization: Bearer $SMARTERWEATHER_API_KEY`.
The base URL is `https://api.smarterweather.com`.

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
`Retry-After` header (seconds). Your client should back off for
that many seconds before retrying. Don't retry tighter than the
header says; repeated violations surface as a support flag.

```ts
if (res.status === 429) {
  const wait = Number(res.headers.get("retry-after") ?? "1") * 1000;
  await new Promise((r) => setTimeout(r, wait));
  // retry once, then surface the error if it still 429s.
}
```

## 5. Use the MCP server instead (optional)

If you're integrating with Cursor, Claude Desktop, or any
MCP-compatible client, you can skip curl entirely and use the
published MCP server:

```bash
npx -y @smarterweather/mcp-weather
```

Set `SMARTERWEATHER_API_KEY` in the process environment (or your host
secret store). REST calls still use
`Authorization: Bearer $SMARTERWEATHER_API_KEY`. See
[`mcp-weather.md`](./mcp-weather.md) for client-specific configuration
snippets.

## Next steps

- Error model and recovery: [`errors.md`](./errors.md).
- Full REST reference: [`rest-api.md`](./rest-api.md).
- SDKs: [`sdks.md`](./sdks.md).
- Agent framework integrations: [`agent-integration.md`](./agent-integration.md).
