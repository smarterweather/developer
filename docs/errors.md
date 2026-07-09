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
| `instance`  | string | no       | Unique URI for this occurrence (e.g. a request id). Include this in support tickets. |

The `Content-Type` header on any error response is
**`application/problem+json`**, never `application/json`. Test
harnesses that sniff on `Content-Type` must accept both.

Example:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json
Retry-After: 12

{
  "type": "https://errors.smarterweather.com/rate-limit-exceeded",
  "title": "Rate limit exceeded",
  "status": 429,
  "detail": "Your key has exceeded 60 requests per minute at the free tier.",
  "instance": "/requests/01J9FRH7X8QM2H0N"
}
```

## Canonical error `type` URIs

These URIs are stable. New error classes are added over time; existing
URIs do not change meaning.

| `type` (URI suffix)                | HTTP | When                                                                                                  | Client reaction                                                                            |
| ---------------------------------- | ---- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `bad-request`                      | 400  | Malformed query string, missing required parameter, invalid lat/lon.                                  | Fix the request. Do not retry.                                                              |
| `invalid-api-key`                  | 401  | `X-API-Key` missing, malformed, or not recognized.                                                    | Prompt the user to re-paste their key. Do not retry.                                        |
| `api-key-revoked`                  | 401  | The key was explicitly revoked by its owner or by support.                                            | Surface as "key invalidated"; prompt the user to mint a new one.                            |
| `forbidden`                        | 403  | The key authenticates, but the tier does not grant access to the requested resource.                 | Surface with an upgrade CTA pointing to `/pricing`.                                         |
| `not-found`                        | 404  | The resource does not exist. Not used for coverage gaps (see `coverage-unavailable`).                 | Treat as permanent.                                                                         |
| `rate-limit-exceeded`              | 429  | You hit the per-minute RPM cap for your tier.                                                         | Honor `Retry-After`; exponential backoff on subsequent hits.                                 |
| `monthly-quota-exceeded`           | 429  | You hit your monthly request allowance on a plan without overage.                                     | Surface upgrade or wait-for-reset UX; do not retry until month rolls over.                  |
| `coverage-unavailable`             | 503  | Coordinate or timestamp is outside current coverage. Useful for marine / polar / historical gaps.     | Treat as a soft-fail; show "no data in this region/time" UX, do not pound the endpoint.     |
| `internal`                         | 500  | Unhandled server error. Logged with a request id we can look up.                                      | Retry with exponential backoff (max 3); on persistent failure, open a support ticket.        |
| `upstream-unavailable`             | 502 or 504 | A backing data source is down or timed out.                                                           | Retry with exponential backoff. Usually transient.                                          |

The `type` URI prefix is `https://errors.smarterweather.com/`. The
full URI is documented and resolvable; it returns human-readable
context for the error class. Clients should **not** attempt to
fetch the URL at runtime -- compare it as an opaque string.

## Retry guidance

| Error class                        | Retry? |
| ---------------------------------- | ------ |
| `bad-request`, `invalid-api-key`, `api-key-revoked`, `forbidden`, `not-found` | No     |
| `rate-limit-exceeded`, `monthly-quota-exceeded`                               | After `Retry-After` header (or reset window). |
| `internal`, `upstream-unavailable`                                            | Exponential backoff, max 3 retries. |
| `coverage-unavailable`                                                        | No -- treat as permanent for that coordinate/timestamp. |

Retries SHOULD use at least 250ms of initial backoff and double each
attempt (up to ~2s cap) to avoid thundering-herd restarts after a
transient upstream outage.

## Including errors in support tickets

When contacting support, include the `instance` URI (or the
`X-Request-Id` response header, which is the same identifier).
That ID resolves to the full request trace on our side and cuts
triage time from hours to minutes.
