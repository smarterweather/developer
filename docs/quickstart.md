# Get an API key and call the API

Create a key, make one request, and read the forecast it returns. REST
needs nothing installed. Working through a coding agent? Step 5 is
written for it, and
[`llms.txt`](https://developers.smarterweather.com/llms.txt) (served
identically as `/AGENTS.md`) covers the whole platform.

Smarter Weather covers the 50 US states and DC only. The US territories
(Puerto Rico, the US Virgin Islands, Guam, the Northern Mariana Islands
and American Samoa) and other countries are outside it. A point outside
returns 404 outside-coverage; see
[coverage details](https://developers.smarterweather.com/errors#outside-coverage).

<a id="get-api-key"></a>

## 1. Get an API key

Create a key in the dashboard. You need a free account; no card.

1. Create a free account at
   <https://developers.smarterweather.com/sign-up>.
2. Verify your email if the dashboard asks. Until you do, creating a key
   returns `403 email_not_verified`.
3. Open [API keys](https://developers.smarterweather.com/dashboard/api-keys)
   in the dashboard and click **Create key**. Name the key, then click
   **Create**.
4. Copy the key; the dashboard shows it once. Add it to `.env` as
   `SMARTERWEATHER_API_KEY=sw_live_...` and add `.env` to `.gitignore`.

Result: `.env` holds your live key.

**From a terminal.** Run
`npx -y @smarterweather/mcp-onboarding@latest login`. You need Node.js 22 or later. It
shows a link and a code to approve in the browser, then writes the key
to `.env` (mode `0600`, gitignored). It prints only a key prefix, never
the key ([key handling](https://developers.smarterweather.com/agents#key-handling)).

**No account yet.** Run
`npx -y @smarterweather/mcp-onboarding@latest trial` for a trial key
with no account and no browser step. It writes `.env` the same way.
A trial key allows 300 requests over 72 hours, 10 a minute (burst 5); `/v1/catalog` requests don't count toward the 300.

Keep the key only in `.env`, read it from the environment in code, and
never echo it into chat, logs, or a commit. Use `sw_test_*` keys in CI.
If a key lands in a repository, rotate it from the dashboard. Your key
belongs to a plan, which sets its rate limits and daily cap, and on paid
plans its monthly credits and overage price; see
[pricing](https://developers.smarterweather.com/pricing).

<a id="call-with-key"></a>

## 2. Call the weather endpoint

Run this from the folder that holds `.env`. The first line reads
`SMARTERWEATHER_API_KEY` from `.env` without running the file, and keeps
a key you already exported.

```bash
[ -n "$SMARTERWEATHER_API_KEY" ] || export SMARTERWEATHER_API_KEY="$(sed -n 's/^\(export \)\{0,1\}SMARTERWEATHER_API_KEY=//p' .env | tail -n 1 | tr -d "\r\"' ")"
curl -sS 'https://api.smarterweather.com/v1/weather?lat=42.3601&lon=-71.0589' \
  -H "Authorization: Bearer ${SMARTERWEATHER_API_KEY:?set SMARTERWEATHER_API_KEY first, see developers.smarterweather.com/quickstart}"
```

Result: HTTP 200 with the forecast for Boston. Any other status returns a
problem document whose `next_steps` says what to do. Send the key as a
Bearer token in the `Authorization` header; a request that sends
`X-API-Key` instead gets a `401`.

## 3. Call it from your code

The same request in JavaScript, Python, or Go. Each reads
`SMARTERWEATHER_API_KEY` from the environment. To look a place up by
name, pass `location=City, ST` instead of `lat` and `lon`. The response
then adds `country`, `zip`, and `gis.population`, at the geocoder's
centroid for the place. A `lat`/`lon` call adds the nearest radar and
station.

```bash
curl "https://api.smarterweather.com/v1/weather?lat=42.3601&lon=-71.0589" \
  -H "Authorization: Bearer ${SMARTERWEATHER_API_KEY:?set SMARTERWEATHER_API_KEY first, see developers.smarterweather.com/quickstart}"
```

```js
// save as sample.mjs; run: node --env-file=.env sample.mjs (Node 20.6+, ESM top-level await)
const res = await fetch(
  "https://api.smarterweather.com/v1/weather?lat=42.3601&lon=-71.0589",
  { headers: { Authorization: `Bearer ${process.env.SMARTERWEATHER_API_KEY}` } },
);
if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
const data = await res.json();
console.log(JSON.stringify(data, null, 2));
```

```python
# pip install requests python-dotenv
import os, sys, requests
from dotenv import load_dotenv

load_dotenv(".env")  # ./.env in the current directory; variables already set are kept

r = requests.get(
    "https://api.smarterweather.com/v1/weather",
    params={"lat":"42.3601","lon":"-71.0589"},
    headers={"Authorization": f"Bearer {os.environ['SMARTERWEATHER_API_KEY']}"},
)
if not r.ok:
    sys.exit(f"{r.status_code} {r.text}")
data = r.json()
print(data)
```

```go
package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
)

func main() {
	req, err := http.NewRequest("GET", "https://api.smarterweather.com/v1/weather?lat=42.3601&lon=-71.0589", nil)
	if err != nil {
		log.Fatal(err)
	}
	req.Header.Set("Authorization", "Bearer "+os.Getenv("SMARTERWEATHER_API_KEY"))
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Fatal(err)
	}
	defer res.Body.Close()
	body, err := io.ReadAll(res.Body)
	if err != nil {
		log.Fatal(err)
	}
	if res.StatusCode < 200 || res.StatusCode > 299 {
		log.Fatalf("%s %s", res.Status, body)
	}
	fmt.Println(string(body))
}
```

Result: the same JSON as step 2.

## 4. Give your agent weather tools

If your agent runs in an MCP client, give it the onboarding skill
(<https://developers.smarterweather.com/.well-known/skills/smarterweather-onboarding/SKILL.md>).
It signs you up, creates an API key, and sets up the Weather MCP in your
client. You approve once in the browser.

The same key works on the hosted Weather MCP at
`https://mcp.smarterweather.com`. For clients that only speak stdio, run
the bridge from the project whose `.env` holds the key. It reads
`SMARTERWEATHER_API_KEY`, then `SMARTERWEATHER_ENV_FILE`, then `./.env`:

```bash
npx -y @smarterweather/mcp-weather@latest
```

Agents with a wallet can pay per call on the Weather MCP with
[x402](https://developers.smarterweather.com/agents#x402) instead. The
REST API always needs a key. Client set-up:
[MCP setup guide](https://developers.smarterweather.com/mcp-server/setup).

Result: the Weather MCP tools show up in your client.

<a id="device-flow"></a>

## 5. Let an agent get the key

An agent can start with no key: the API answers with a 401 that says
what to do next.

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
`402`, `403`, and `429` carries this block (see
[errors](https://developers.smarterweather.com/errors)).

**A person is present.** Run
`npx -y @smarterweather/mcp-onboarding@latest login` in the background
or with a long shell timeout, and relay the link and code it prints. It
blocks until the person approves, then writes `SMARTERWEATHER_API_KEY`
to `./.env` (mode `0600`, gitignored) and prints only a key prefix. The
401's `next_steps.device_flow.command` names this command. You need Node.js 22 or later.

Without Node.js, use the device grant directly. Write only the `key`
field of the `POST api_keys_endpoint` response to `.env` as
`SMARTERWEATHER_API_KEY=`, and never print the key or the access token.

```bash
npx -y @smarterweather/mcp-onboarding@latest login
# Preferred: the one command above. Shows the human a URL, writes ./.env
# (0600, gitignored), prints only a key prefix.

# Raw recipe (no Node): reference only, not a runnable script; step 2 needs
# your own poll loop. Stop if .env already has SMARTERWEATHER_API_KEY.
# 1. Ask Clerk for a device code (client_id is public; it is in the 401 body).
curl -sS -X POST 'https://clerk.smarterweather.com/oauth/device_authorization' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'client_id=k2h05BUoTP393zcD' \
  --data-urlencode 'scope=openid email'

# 2. Show the human verification_uri + user_code. Poll until they approve.
#    grant_type=urn:ietf:params:oauth:grant-type:device_code
#    handle authorization_pending / slow_down / expired_token.

# 3. Create a key and write ONLY its key field to .env. Nothing reaches the terminal.
# (umask 077; curl -sS -X POST 'https://api.smarterweather.com/developer/keys' \
#   -H "Authorization: Bearer $ACCESS_TOKEN" \
#   -H "Idempotency-Key: $(uuidgen)" \
#   -H 'Content-Type: application/json' \
#   -d '{"name":"cli my-project","origin":{"channel":"device_flow"}}' \
#   | jq -er '"SMARTERWEATHER_API_KEY=" + .key' >> .env)
# grep -qx '.env' .gitignore 2>/dev/null || echo .env >> .gitignore

# 4. Discard the access token (unset ACCESS_TOKEN).
```

**No one is present.** Run
`npx -y @smarterweather/mcp-onboarding@latest trial`, named by
`next_steps.trial.command`. A trial key allows 300 requests over 72 hours, 10 a minute (burst 5); `/v1/catalog` requests don't count toward the 300. A person can claim the key later
from the printed claim link. Without Node.js, follow the `trial` link's
`description` above: solve the challenge, POST to `mint_endpoint`, and
write only the `api_key` field to `.env`.

Result: `.env` holds a key and the terminal shows only its prefix.

## Response shape

Every success response is JSON (`application/json`, or
`application/geo+json` on the routes that return map features) with a
schema documented in [`openapi.yaml`](https://developers.smarterweather.com/openapi.yaml). The shape is
stable within a major version; breaking changes bump the version
prefix (`/v1/...` -> `/v2/...`) and follow the notice periods in the
[Developer Terms, "Deprecation and breaking changes"](https://developers.smarterweather.com/legal/terms#deprecation). Every `/v1/weather`
field, with its type and whether it can be null, is in the [Weather field reference](https://developers.smarterweather.com/build-a-weather-app#fields).

## Rate limits

<!-- generated:example rate-limit-headers -->

A request with a valid key gets these headers (the `RateLimit-Daily-*` ones only when the key has a daily cap). A response to a request without a valid key, such as a `401`, carries none. The examples are a free key after its first call; `Retry-After` is from a `429`:

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
`recommended` link (`upgrade`) is how to raise the limit. Back off for
that many seconds before you retry. Don't retry sooner than the header
says; repeated violations raise a support flag.

```ts
if (res.status === 429) {
  const wait = Number(res.headers.get("retry-after") ?? "1") * 1000;
  await new Promise((r) => setTimeout(r, wait));
  // retry once, then surface the error if it still 429s.
}
```

## Next steps

- Build a weather app (your own backend, caching, times, icons and attribution): [developers.smarterweather.com/build-a-weather-app](https://developers.smarterweather.com/build-a-weather-app).
- Error model and recovery: [developers.smarterweather.com/errors](https://developers.smarterweather.com/errors).
- Full REST reference: [developers.smarterweather.com/api](https://developers.smarterweather.com/api).
- SDKs: [`sdks.md`](https://github.com/smarterweather/developer/blob/main/docs/sdks.md).
- Agent framework integrations: [`agent-integration.md`](https://github.com/smarterweather/developer/blob/main/docs/agent-integration.md).
