# Smarter Weather Developer Platform - Error Model

The Smarter Weather REST API returns errors as [RFC 9457
`application/problem+json`](https://www.rfc-editor.org/rfc/rfc9457)
documents (RFC 9457 obsoletes RFC 7807 with the same wire format). This
doc covers the canonical `Problem` shape, the `next_steps` extension
that tells you what to do about a `401`, `402`, `403`, or `429`, the stable
error `type` URIs the platform emits, and how clients should react to
each class.

## The `Problem` shape

Every 4xx or 5xx response body is a JSON object with:

| Field       | Type   | Required | Meaning                                                                 |
| ----------- | ------ | -------- | ----------------------------------------------------------------------- |
| `type`      | string | yes      | Stable URI identifying the error class. Clients SHOULD switch on this. |
| `title`     | string | yes      | Short human-readable label. Safe to display to end users as-is.        |
| `status`    | number | yes      | HTTP status code. Matches the response line.                           |
| `detail`    | string | no       | Free-form description with request-specific context. May change between releases. |
| `instance`  | string | no       | The request path the failure occurred on (e.g. `/v1/weather`). Pair it with the `X-Request-Id` response header in support tickets. |

Extension members beyond these five may appear (RFC 9457 §3.2); today
`401`, `402`, `403`, and `429` carry `next_steps` (below). Ignore members you
do not understand.

Errors sw-api itself returns are **`application/problem+json`**.
Responses that never reach it (an unknown route, a wrong method, a
gateway or throttling error in front of it) can be `text/plain` or
`application/json`, so accept both: branch on the HTTP status, then
parse the body as a problem when `Content-Type` says
`application/problem+json`.

Example, a key over its per-minute limit (`next_steps` links other than
the recommended one shortened to their `href`):

<!-- generated:example 429-rpm -->

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json
RateLimit-Daily-Limit: 1000
RateLimit-Daily-Remaining: 970
RateLimit-Daily-Reset: 21600
RateLimit-Limit: 30
RateLimit-Policy: 30;w=30
RateLimit-Remaining: 0
RateLimit-Reset: 30
Retry-After: 1

{
  "type": "https://smarterweather.com/errors/rate-limit-exceeded",
  "title": "Too Many Requests",
  "status": 429,
  "detail": "You have exceeded your API rate limit. Slow your request rate. Retry after the Retry-After / RateLimit-Reset headers.",
  "instance": "/v1/weather",
  "next_steps": {
    "recommended": "upgrade",
    "upgrade": {
      "href": "https://developers.smarterweather.com/dashboard/billing?utm_campaign=429&utm_medium=problem-json&utm_source=api",
      "description": "Raise your rate limit and quota by upgrading the plan on this key's account."
    },
    "errors": {
      "href": "https://developers.smarterweather.com/errors?utm_campaign=429&utm_medium=problem-json&utm_source=api"
    },
    "pricing": {
      "href": "https://developers.smarterweather.com/pricing?utm_campaign=429&utm_medium=problem-json&utm_source=api"
    },
    "usage": {
      "href": "https://developers.smarterweather.com/dashboard/usage?utm_campaign=429&utm_medium=problem-json&utm_source=api"
    }
  }
}
```

<!-- /generated -->

## `next_steps`: the error tells you what to do

<a id="next-steps"></a>A `401`, `402`, `403`, or `429` is where a first
integration most often stalls, so those statuses carry a `next_steps`
extension member: a map of link relations, each `{ href, description }`
plus optional grant fields, plus `recommended` naming the one to take
first. When present, `if_no_human_present` names the relation an
autonomous agent should take if nobody can act on `recommended` right
now. Relations today: `device_flow` (401 recommended; also carries
`command`, `client_id`, `device_authorization_endpoint`, `token_endpoint`,
`api_keys_endpoint`), `trial` (on `401` while trial keys are enabled, as
`if_no_human_present`; carries `command`, `challenge_endpoint`,
`mint_endpoint`), `get_key`, `quickstart`, `agents`,
`onboarding_mcp`, `keyless_x402`, `key_handling`, `errors` (on `401`;
`403` recommends `get_key`), `claim` (on `402` and trial-route `403`),
and `upgrade`, `pricing`, `usage`, `errors` (on `429`). New relations
may be added; ignore unknown ones. Every `href` carries
`utm_source=api&utm_medium=problem-json&utm_campaign=<status>`. Grant
endpoints on `device_flow` do not get UTM. When a trial key's free value
ends, the response is `402` with `next_steps.recommended = claim` (see
[ADR 071](../developer/adr/071-agent-first-developer-onboarding.md)); the
per-key claim href uses a claim ticket in the URL fragment
(`https://developers.smarterweather.com/claim#ticket=<ticket>`).
The raw trial mint (`POST /developer/keys/trial`) also carries
`next_steps` on its `400` (`recommended = trial`, the exact mint recipe),
`429` and `503` (`recommended = device_flow`).

The keyless `401` (links other than the recommended one shortened to
their `href`):

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

`401` and `403` also carry an [RFC 6750](https://www.rfc-editor.org/rfc/rfc6750#section-3)
`WWW-Authenticate: Bearer` challenge. A request with no credentials gets
the bare `realm` (§3.1); otherwise `error` is `invalid_request`
(malformed header), `invalid_token` (unknown, revoked, or expired key),
or `insufficient_scope` (with `scope` naming what the route needs), and
`error_uri` points at this page.

## Canonical error `type` URIs

The `type` URI prefix is `https://smarterweather.com/errors/`. These
URIs are stable: new error classes are added over time, but existing
URIs do not change meaning. Compare `type` as an opaque string --
don't fetch it at runtime. Each one redirects to its row below when a
human does open it.

| `type` (URI suffix)     | HTTP | When                                                                                                     | Client reaction                                                                       |
| ----------------------- | ---- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| <a id="bad-request"></a>`bad-request` | 400  | Malformed query string, missing required parameter, invalid lat/lon.                                     | Fix the request. Do not retry.                                                        |
| <a id="invalid-request"></a>`invalid-request` | 400 | A key-API request body is malformed: not JSON, not an object, or a field is missing or has the wrong shape. `field` names the offending field (for example `client.name`) when there is one. | Fix the body. On the trial mint, start from the challenge's `request_example` (set `accept_terms` to `true` once you accept the terms). Do not retry as-is. |
| <a id="trial-challenge-invalid"></a>`trial-challenge-invalid` | 400 | Trial mint: the challenge token is invalid, expired, or bound to another IP, or the proof-of-work solution is wrong. | GET a fresh challenge, solve it, and mint again. |
| <a id="terms-not-accepted"></a>`terms-not-accepted` | 400 | Trial mint or claim: `accept_terms` is not `true`. | Read the terms (the challenge's `terms_url`) and send `"accept_terms": true`. |
| <a id="unauthorized"></a>`unauthorized` | 401  | `Authorization: Bearer` header missing or malformed, or the key is unrecognized, revoked, or expired.     | Follow `next_steps.recommended` (get a key at the dashboard, or one of the agent paths). Do not retry. Read `detail` for which case it was. |
| <a id="trial-ended"></a>`trial-ended` | 402  | A trial key's free value ended (lifetime call cap spent or key clock expired) while the claim window is still open. Body carries `reason` (`exhausted` \| `expired`), `claim_expires_at`, and `next_steps.recommended = claim`. | Follow `next_steps.claim` (portal page with a claim ticket in the URL fragment). Do not treat as a rate limit; a wait will not restore free value. |
| <a id="payment-required"></a>`payment-required` | 402 | MCP only: a keyless call to a paid tool carried no valid [x402](https://www.x402.org/) payment. The text block also carries the x402 `PaymentRequired` members (`x402Version`, `accepts`, `resource`), and `structuredContent` is the bare `PaymentRequired`; a payment proof the server cannot use gets the same, re-quoted, with the reason in `detail`. `next_steps` names the free-key paths. | Pay one of `accepts` and retry with the payment, or follow `next_steps` for a key. Do not retry as-is. |
| <a id="forbidden"></a>`forbidden` | 403  | The key authenticates but its scopes or tier do not grant access to the requested resource.               | Surface with an upgrade CTA; `next_steps` carries the links. |
| <a id="trial-route-not-allowed"></a>`trial-route-not-allowed` | 403  | A trial key authenticated but is not allowed to call this route. `next_steps.recommended = claim`. | Claim the key for full API access, or call a trial-allowed route (`/v1/weather`, `/v1/geocode`, `/v1/alerts`, and `/v1/catalog`, which spends no trial call). A trial key minted before `/v1/catalog` opened to trials gets this error on `/v1/catalog`: mint a new trial key. |
| <a id="not-found"></a>`not-found` | 404  | The resource does not exist.                                                                             | Treat as permanent.                                                                   |
| <a id="outside-coverage"></a>`outside-coverage` | 404 | The point or place is outside the 50 US states and DC. | Do not retry; follow `next_steps.coverage`. |
| <a id="too-many-requests"></a>`too-many-requests` | 429 | Generic per-minute or per-day quota exhaustion on surfaces that are not key-scoped. | Honor `Retry-After`; exponential backoff on subsequent hits. |
| <a id="rate-limit-exceeded"></a>`rate-limit-exceeded` | 429 | Your API key exceeded its per-minute or per-day limit. `RateLimit-*` headers say which; `next_steps` says how to lift it. | Honor `Retry-After` / `RateLimit-Reset`; follow `next_steps.upgrade` to raise the limit. |
| <a id="trial-mint-rate-limited"></a>`trial-mint-rate-limited` | 429 | Trial mint: this IP reached its daily trial-mint cap. `Retry-After` counts down to UTC midnight. | Reuse the trial key you already minted, or follow `next_steps.recommended` (`device_flow`) to get a regular key. |
| <a id="payload-too-large"></a>`payload-too-large` | 413 | The request body exceeded the endpoint's cap (1 MiB on `POST /v1/pois/exposure`). | Split the request. Do not retry as-is. |
| <a id="conflict"></a>`conflict` | 409 | The write conflicts with current state (for example an App Attest key already registered). | Re-read state and retry once if the conflict is stale. |
| <a id="flag-disabled"></a>`flag-disabled` | 403 | The endpoint exists but is behind a feature flag that is off for your account or tier. | Treat as not available for this key. |
| <a id="internal"></a>`internal` | 500  | Unhandled server error. Logged with a request id we can look up.                                         | Retry with exponential backoff (max 3); on persistent failure, open a support ticket.  |
| <a id="upstream"></a>`upstream` | 502  | A backing data source returned an error or an undecodable response.                                      | Retry with exponential backoff. Usually transient.                                    |
| <a id="service-unavailable"></a>`service-unavailable` | 503  | A dependency needed to authorize or serve the request is temporarily unreachable.                        | Retry with exponential backoff. Never treat as an auth failure.                        |
| <a id="trial-mint-unavailable"></a>`trial-mint-unavailable` | 503 | Trial mint: the global daily trial-mint cap is reached. `Retry-After: 3600`. | Follow `next_steps.recommended` (`device_flow`) for a regular key, or retry after `Retry-After`. |
| <a id="timeout"></a>`timeout` | 504  | The handler deadline elapsed before a downstream response arrived.                                       | Retry with exponential backoff. Usually transient.                                    |

Note that **401 is a single type**. The API deliberately does not
distinguish "unknown key" from "revoked key" in the `type` URI, because
doing so would let an unauthenticated caller probe which key strings
were once valid. Branch on `detail` for user-facing copy, never for
control flow.

## Retry guidance

| Error class                                                       | Retry? |
| ----------------------------------------------------------------- | ------ |
| `bad-request`, `unauthorized`, `forbidden`, `trial-ended`, `trial-route-not-allowed`, `not-found` | No |
| `payment-required` | Once, with a payment for one of `accepts`. |
| `invalid-request`, `terms-not-accepted` | No; fix the body first. |
| `trial-challenge-invalid` | Once, with a fresh challenge. |
| `too-many-requests`, `rate-limit-exceeded`, `trial-mint-rate-limited` | After `Retry-After` (or the `RateLimit-Reset` window). |
| `trial-mint-unavailable` | After `Retry-After`. |
| `payload-too-large`, `flag-disabled` | No |
| `conflict` | Once, after re-reading state. |
| `internal`, `upstream`, `service-unavailable`, `timeout`            | Exponential backoff, max 3 retries. |

Retries SHOULD use at least 250ms of initial backoff and double each
attempt (up to ~2s cap) to avoid thundering-herd restarts after a
transient upstream outage.

## Rate-limit headers

<a id="rate-limit-headers"></a>

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

## On MCP

<a id="mcp"></a>The Smarter Weather MCP server (`mcp.smarterweather.com`) uses
this same model. A failed `tools/call` is a result with `isError: true`
whose first text block is one of these `Problem` objects, serialized as
JSON, with the same `type` URIs. It carries no `structuredContent`, with one
exception: on `payment-required` the text block also carries the x402
`PaymentRequired` members and `structuredContent` is the bare
`PaymentRequired`, the two places x402 clients read it. There is no HTTP
status per tool call, so key on `type`, then `status`.

- Argument errors (a value that fails the tool's input schema, or a
  precondition such as an ambiguous place name) are `bad-request` with the
  reason in `detail`; an unknown tool is `not-found`.
- A `400` or `404` problem from the API behind a tool reaches you as the
  API sent it, `next_steps` included (for example `outside-coverage`).
- Every `5xx` carries a fixed, generic `detail`.
- `get_path_exposure` returns `flag-disabled` (`403`, no `next_steps`)
  when civic place counts are not enabled for the caller, without calling
  the API behind it. A second text block tells a model not to retry. The
  `detail` says "this caller" rather than "this API key", because an MCP
  caller may have no key. `search_locations` does not fail in that case: it
  returns place and ZIP rows without address or POI rows.
- `next_steps` appears on `401`, `402` (`trial-ended`, `payment-required`),
  `403` (trial keys), `429` (`rate-limit-exceeded`) and on the `503` a
  keyless x402 call gets while the payment rail is unavailable.
- `rate-limit-exceeded` covers a key over its limit and a keyless x402
  wallet over its per-minute limit; it carries `retry_after_seconds` in
  place of the `Retry-After` header and no `PaymentRequired`, so x402
  clients do not treat it as payable.
- When one of several sources inside a successful result fails, that entry
  carries `error` (the problem's `detail`) and `error_type` (its `type`)
  instead of failing the call.

Retry by the table above.

## Including errors in support tickets

When contacting support, include the `X-Request-Id` response header
along with the `instance` path from the body. That request id resolves
to the full request trace on our side and cuts triage time from hours
to minutes.
