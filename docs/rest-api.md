# REST API guide

This page is the orientation guide. The canonical, complete contract is
[`openapi.yaml`](../openapi.yaml) — if an endpoint is not in there, it does
not exist.

## At a glance

| Item | Value |
| ---- | ----- |
| Base URL | `https://api.smarterweather.com` |
| Versioning | Path-based: `/v1/*` |
| Auth | API key as an HTTP Bearer token: `Authorization: Bearer sw_live_*` / `sw_test_*` |
| Content type | `application/json; charset=utf-8` (success), `application/problem+json` (errors) |
| Compression | `gzip`, `br` |
| Spec | [`openapi.yaml`](../openapi.yaml), also served at <https://developers.smarterweather.com/openapi.yaml> |
| Interactive reference | <https://developers.smarterweather.com/api/reference> |

The path-based versioning policy (`/v1/`) and deprecation timelines are
formalized in ADR 001 in the private repo; the commitments it makes are
restated under [Stability promise](#stability-promise) below.

## Authentication

Every request requires an API key minted from the developer dashboard,
passed as an HTTP Bearer token ([RFC 6750](https://datatracker.ietf.org/doc/html/rfc6750)):

```bash
curl -H "Authorization: Bearer $SMARTERWEATHER_API_KEY" \
  "https://api.smarterweather.com/v1/weather?lat=41.88&lon=-87.63"
```

The `X-API-Key` header is **not** supported — requests carrying it
without a Bearer token are rejected with a hint to switch.

Keys are scoped to a single account and a single tier. Mint, rotate, and
revoke them at <https://developers.smarterweather.com/dashboard/api-keys>,
or let an agent do it through the onboarding MCP server's `create_api_key`
and `rotate_api_key` tools.

## Endpoints

The full list — with parameters, schemas, and examples — is in
[`openapi.yaml`](../openapi.yaml). The ones worth knowing before you read
it:

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `GET`  | `/v1/weather` | Unified weather response: current conditions, hourly + daily forecasts, alerts, radar metadata. |
| `POST` | `/v1/weather/batch` | The same response for many locations in one request. |
| `GET`  | `/v1/alerts/{id}` | A single NWS alert by identifier. |
| `GET`  | `/v1/observations`, `/v1/observations/nearest` | Station observations. |
| `GET`  | `/v1/geocode/search`, `/v1/geocode/reverse`, `/v1/geocode/autosuggest` | Place-name and coordinate lookup. |
| `GET`  | `/v1/storm-tracks`, `/v1/storm-reports`, `/v1/tropical`, `/v1/outlooks` | Severe and tropical products. |
| `GET`  | `/v1/status` | Data-freshness status per source; unauthenticated. |
| `GET`  | `/v1/health` | Liveness probe; unauthenticated. |

The "one request, full picture" shape of `/v1/weather` is deliberate: most
consumer integrations need several views of weather at the same point, and
calling 5+ endpoints to assemble them is the most common complaint about
incumbent APIs.

## Errors

Errors return [RFC 7807 `application/problem+json`](https://datatracker.ietf.org/doc/html/rfc7807)
documents with a stable shape:

```json
{
  "type": "https://smarterweather.com/errors/bad-request",
  "title": "Bad Request",
  "status": 400,
  "detail": "lat must be between -90 and 90",
  "instance": "/v1/weather"
}
```

Switch on `type`, never on `detail` — `detail` is free-form and changes
between releases.

The full error-type catalog, retry guidance, and HTTP status mapping are
in [`errors.md`](./errors.md); the wire schema is `Problem` in
[`openapi.yaml`](../openapi.yaml).

## Rate limits

Every authenticated response carries the IETF draft `RateLimit-*` headers:

- `RateLimit-Limit` - requests allowed in the current per-minute window
- `RateLimit-Remaining` - requests remaining in the current window
- `RateLimit-Reset` - seconds until the window resets
- `RateLimit-Policy` - window + burst policy line, e.g. `60;w=60;burst=60`
- `RateLimit-Daily-Limit` / `RateLimit-Daily-Remaining` / `RateLimit-Daily-Reset` - the per-day quota

On `429`, honor the `Retry-After` header (seconds) before retrying.

Exact limits per tier are published at
<https://developers.smarterweather.com/pricing>.

## Stability promise

- 6 months notice before any `/v1/*` endpoint is removed.
- 90 days notice before a breaking request- or response-shape change.
- Non-breaking additions (new fields, endpoints, error types) ship
  immediately.

Notice clocks start when the change appears in
`https://api.smarterweather.com/.well-known/deprecations`, when the affected
endpoints begin returning `Deprecation` and `Sunset` headers, and when it is
posted in this repository — whichever is last.
