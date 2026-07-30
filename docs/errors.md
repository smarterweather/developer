# Smarter Weather Developer Platform - Error Model

The Smarter Weather REST API returns errors as [RFC 7807
`application/problem+json`](https://datatracker.ietf.org/doc/html/rfc7807)
documents. This doc covers the canonical `Problem` shape, the stable
error `type` URIs the platform emits, and how clients should react
to each class.

## The `Problem` shape

Every 4xx or 5xx response body is a JSON object with:

| Field       | Type   | Required | Meaning                                                                 |
| ----------- | ------ | -------- | ----------------------------------------------------------------------- |
| `type`      | string | yes      | Stable URI identifying the error class. Clients SHOULD switch on this. |
| `title`     | string | yes      | Short human-readable label. Safe to display to end users as-is.        |
| `status`    | number | yes      | HTTP status code. Matches the response line.                           |
| `detail`    | string | no       | Free-form description with request-specific context. May change between releases. |
| `instance`  | string | no       | The request path the failure occurred on (e.g. `/v1/weather`). Pair it with the `X-Request-Id` response header in support tickets. |

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

## Canonical error `type` URIs

The `type` URI prefix is `https://smarterweather.com/errors/`. These
URIs are stable: new error classes are added over time, but existing
URIs do not change meaning. Compare `type` as an opaque string --
don't fetch it at runtime.

| `type` (URI suffix)     | HTTP | When                                                                                                     | Client reaction                                                                       |
| ----------------------- | ---- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `bad-request`           | 400  | Malformed query string, missing required parameter, invalid lat/lon.                                     | Fix the request. Do not retry.                                                        |
| `unauthorized`          | 401  | `Authorization: Bearer` header missing or malformed, or the key is unrecognized, revoked, or expired.     | Prompt the user to re-paste or re-mint their key. Do not retry. Read `detail` for which case it was. |
| `forbidden`             | 403  | The key authenticates but its scopes or tier do not grant access to the requested resource.               | Surface with an upgrade CTA pointing to `/pricing`.                                   |
| `not-found`             | 404  | The resource does not exist.                                                                             | Treat as permanent.                                                                   |
| `too-many-requests`     | 429  | You exceeded the per-minute or per-day quota for your tier.                                              | Honor `Retry-After`; exponential backoff on subsequent hits.                          |
| `internal`              | 500  | Unhandled server error. Logged with a request id we can look up.                                         | Retry with exponential backoff (max 3); on persistent failure, open a support ticket.  |
| `upstream`              | 502  | A backing data source returned an error or an undecodable response.                                      | Retry with exponential backoff. Usually transient.                                    |
| `service-unavailable`   | 503  | A dependency needed to authorize or serve the request is temporarily unreachable.                        | Retry with exponential backoff. Never treat as an auth failure.                        |
| `timeout`               | 504  | The handler deadline elapsed before a downstream response arrived.                                       | Retry with exponential backoff. Usually transient.                                    |

Note that **401 is a single type**. The API deliberately does not
distinguish "unknown key" from "revoked key" in the `type` URI, because
doing so would let an unauthenticated caller probe which key strings
were once valid. Branch on `detail` for user-facing copy, never for
control flow.

## Retry guidance

| Error class                                                       | Retry? |
| ----------------------------------------------------------------- | ------ |
| `bad-request`, `unauthorized`, `forbidden`, `not-found`            | No     |
| `too-many-requests`                                                | After `Retry-After` (or the `RateLimit-Reset` window). |
| `internal`, `upstream`, `service-unavailable`, `timeout`            | Exponential backoff, max 3 retries. |

Retries SHOULD use at least 250ms of initial backoff and double each
attempt (up to ~2s cap) to avoid thundering-herd restarts after a
transient upstream outage.

## Including errors in support tickets

When contacting support, include the `X-Request-Id` response header
along with the `instance` path from the body. That request id resolves
to the full request trace on our side and cuts triage time from hours
to minutes.
