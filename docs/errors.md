# Smarter Weather Developer Platform - Error Model

The Smarter Weather REST API returns errors as [RFC 9457
`application/problem+json`](https://www.rfc-editor.org/rfc/rfc9457)
documents (RFC 9457 obsoletes RFC 7807 with the same wire format). This
doc covers the canonical `Problem` shape, the `next_steps` extension
that tells you what to do about a `401`, `403`, or `429`, the stable
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

The `Content-Type` header on any error response is
**`application/problem+json`**, never `application/json`. Test
harnesses that sniff on `Content-Type` must accept both.

Example:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json
Retry-After: 12

{
  "type": "https://smarterweather.com/errors/too-many-requests",
  "title": "Too Many Requests",
  "status": 429,
  "detail": "Rate limit exceeded. Retry after 12 seconds.",
  "instance": "/v1/weather"
}
```

## `next_steps`: the error tells you what to do

<a id="next-steps"></a>A `401`, `402`, `403`, or `429` is where a first
integration most often stalls, so those statuses carry a `next_steps`
extension member: a map of link relations, each `{ href, description }`
plus optional grant fields, plus `recommended` naming the one to take
first. When present, `if_no_human_present` names the relation an
autonomous agent should take if nobody can act on `recommended` right
now. Relations today: `device_flow` (401 recommended; also carries
`client_id`, `device_authorization_endpoint`, `token_endpoint`,
`api_keys_endpoint`), `get_key`, `quickstart`, `agents`,
`onboarding_mcp`, `keyless_x402`, `key_handling`, `errors` (on `401`;
`403` recommends `get_key`), `claim` (on `402` and trial-route `403`),
and `upgrade`, `pricing`, `usage`, `errors` (on `429`). New relations
may be added; ignore unknown ones. Every `href` carries
`utm_source=api&utm_medium=problem-json&utm_campaign=<status>`. Grant
endpoints on `device_flow` do not get UTM. When a trial key's free value
ends, the response is `402` with `next_steps.recommended = claim` (see
[ADR 071](../developer/adr/071-agent-first-developer-onboarding.md)); the
per-key claim href puts the raw bearer in the URL fragment
(`https://developers.smarterweather.com/claim#key=<bearer>`).
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
      "description": "No install, no loopback port: POST device_authorization_endpoint, show the human the code, poll, then GET /developer/keys.",
      "client_id": "k2h05BUoTP393zcD",
      "device_authorization_endpoint": "https://clerk.smarterweather.com/oauth/device_authorization",
      "token_endpoint": "https://clerk.smarterweather.com/oauth/token",
      "api_keys_endpoint": "https://api.smarterweather.com/developer/keys"
    },
    "get_key": {
      "href": "https://developers.smarterweather.com/dashboard/api-keys?utm_campaign=401&utm_medium=problem-json&utm_source=api",
      "description": "Sign in (free, no card) and mint an API key. Pass it as 'Authorization: Bearer sw_live_*'."
    },
    "quickstart": { "href": "…", "description": "…" },
    "agents": { "href": "…", "description": "…" },
    "onboarding_mcp": { "href": "…", "description": "…" },
    "keyless_x402": { "href": "…", "description": "…" },
    "key_handling": { "href": "…", "description": "…" },
    "errors": { "href": "…", "description": "…" }
  }
}
```

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
| <a id="unauthorized"></a>`unauthorized` | 401  | `Authorization: Bearer` header missing or malformed, or the key is unrecognized, revoked, or expired.     | Follow `next_steps.recommended` (get a key at the dashboard, or one of the agent paths). Do not retry. Read `detail` for which case it was. |
| <a id="trial-ended"></a>`trial-ended` | 402  | A trial key's free value ended (lifetime call cap spent or key clock expired) while the claim window is still open. Body carries `reason` (`exhausted` \| `expired`), `claim_expires_at`, and `next_steps.recommended = claim`. | Follow `next_steps.claim` (portal page with the key in the URL fragment). Do not treat as a rate limit; a wait will not restore free value. |
| <a id="forbidden"></a>`forbidden` | 403  | The key authenticates but its scopes or tier do not grant access to the requested resource.               | Surface with an upgrade CTA; `next_steps` carries the links. |
| <a id="trial-route-not-allowed"></a>`trial-route-not-allowed` | 403  | A trial key authenticated but is not allowed to call this route. `next_steps.recommended = claim`. | Claim the key for full API access, or call a trial-allowed route (`/v1/weather`, `/v1/geocode`, `/v1/alerts`). |
| <a id="not-found"></a>`not-found` | 404  | The resource does not exist.                                                                             | Treat as permanent.                                                                   |
| <a id="too-many-requests"></a>`too-many-requests` | 429 | Generic per-minute or per-day quota exhaustion on surfaces that are not key-scoped. | Honor `Retry-After`; exponential backoff on subsequent hits. |
| <a id="rate-limit-exceeded"></a>`rate-limit-exceeded` | 429 | Your API key exceeded its per-minute or per-day limit. `RateLimit-*` headers say which; `next_steps` says how to lift it. | Honor `Retry-After` / `RateLimit-Reset`; follow `next_steps.upgrade` to raise the limit. |
| <a id="payload-too-large"></a>`payload-too-large` | 413 | The request body exceeded the endpoint's cap (1 MiB on `POST /v1/pois/exposure`). | Split the request. Do not retry as-is. |
| <a id="conflict"></a>`conflict` | 409 | The write conflicts with current state (for example an App Attest key already registered). | Re-read state and retry once if the conflict is stale. |
| <a id="flag-disabled"></a>`flag-disabled` | 404 | The endpoint exists but is behind a feature flag that is off for your account or tier. | Treat as not available; check `/pricing` for tier gating. |
| <a id="internal"></a>`internal` | 500  | Unhandled server error. Logged with a request id we can look up.                                         | Retry with exponential backoff (max 3); on persistent failure, open a support ticket.  |
| <a id="upstream"></a>`upstream` | 502  | A backing data source returned an error or an undecodable response.                                      | Retry with exponential backoff. Usually transient.                                    |
| <a id="service-unavailable"></a>`service-unavailable` | 503  | A dependency needed to authorize or serve the request is temporarily unreachable.                        | Retry with exponential backoff. Never treat as an auth failure.                        |
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
| `too-many-requests`, `rate-limit-exceeded` | After `Retry-After` (or the `RateLimit-Reset` window). |
| `payload-too-large`, `flag-disabled` | No |
| `conflict` | Once, after re-reading state. |
| `internal`, `upstream`, `service-unavailable`, `timeout`            | Exponential backoff, max 3 retries. |

Retries SHOULD use at least 250ms of initial backoff and double each
attempt (up to ~2s cap) to avoid thundering-herd restarts after a
transient upstream outage.

## Including errors in support tickets

When contacting support, include the `X-Request-Id` response header
along with the `instance` path from the body. That request id resolves
to the full request trace on our side and cuts triage time from hours
to minutes.
