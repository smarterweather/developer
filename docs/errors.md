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
  "type": "https://smarterweather.com/errors/rate-limit-exceeded",
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
| `unauthorized`                     | 401  | Bearer token missing, malformed, not recognized, or revoked.                                          | Prompt the user to check/re-mint their key. Do not retry.                                   |
| `forbidden`                        | 403  | The key authenticates, but its tier or scopes do not grant access to the requested resource.          | Surface with an upgrade CTA pointing to `/pricing`.                                         |
| `not-found`                        | 404  | The resource does not exist.                                                                          | Treat as permanent.                                                                         |
| `rate-limit-exceeded`              | 429  | You hit the per-minute or per-day cap for your tier.                                                  | Honor `Retry-After`; exponential backoff on subsequent hits.                                 |
| `too-many-requests`                | 429  | Generic request-rate rejection outside the tier limiter.                                              | Honor `Retry-After`; exponential backoff.                                                    |
| `internal`                         | 500  | Unhandled server error. Logged with a request id we can look up.                                      | Retry with exponential backoff (max 3); on persistent failure, open a support ticket.        |
| `upstream`                         | 502  | A backing data source is down or returned an invalid response.                                        | Retry with exponential backoff. Usually transient.                                          |
| `service-unavailable`              | 503  | An auth or platform dependency is unavailable (fail-closed).                                          | Retry with exponential backoff. Usually transient.                                          |
| `timeout`                          | 504  | The request deadline elapsed before a downstream response.                                            | Retry with exponential backoff. Usually transient.                                          |

The `type` URI prefix is `https://smarterweather.com/errors/`. Clients
should **not** attempt to fetch the URL at runtime -- compare it as an
opaque string.

## Retry guidance

| Error class                        | Retry? |
| ---------------------------------- | ------ |
| `bad-request`, `unauthorized`, `forbidden`, `not-found`                       | No     |
| `rate-limit-exceeded`, `too-many-requests`                                    | After `Retry-After` header (or reset window). |
| `internal`, `upstream`, `service-unavailable`, `timeout`                      | Exponential backoff, max 3 retries. |

Retries SHOULD use at least 250ms of initial backoff and double each
attempt (up to ~2s cap) to avoid thundering-herd restarts after a
transient upstream outage.

## Including errors in support tickets

When contacting support, include the `instance` URI (or the
`X-Request-Id` response header, which is the same identifier).
That ID resolves to the full request trace on our side and cuts
triage time from hours to minutes.
