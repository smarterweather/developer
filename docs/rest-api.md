# REST API guide

> **Preview - API not yet generally available.** The Smarter Weather public
> REST API at `https://api.smarterweather.com` ships in **Phase 2** of the
> [public roadmap](../README.md#roadmap). This page describes the planned
> shape so SDK authors and integrators can plan against it; final shapes,
> error envelopes, and rate-limit headers will be locked in alongside the
> first published `openapi.yaml`.

## At a glance

| Item | Planned value |
| ---- | ------------- |
| Base URL | `https://api.smarterweather.com` |
| Versioning | Path-based: `/v1/*` |
| Auth | API key as an HTTP Bearer token: `Authorization: Bearer sw_live_*` |
| Content type | `application/json; charset=utf-8` (success), `application/problem+json` (errors) |
| Compression | `gzip`, `br` |
| Spec | `openapi.yaml` at the root of this repo (Phase 2) |

The path-based versioning policy (`/v1/`) and deprecation timelines are
formalized in [ADR 001 (private repo)][adr-001]. Public mirrors of relevant
ADRs land in this repo as part of the Phase 2 cutover.

[adr-001]: https://github.com/smarterweather/developer/issues/2 "Phase 1b: ADR mirroring tracking issue"

## Authentication

Every request requires an API key minted from the developer dashboard,
passed as an HTTP Bearer token ([RFC 6750](https://datatracker.ietf.org/doc/html/rfc6750)):

```bash
curl -H "Authorization: Bearer $SMARTERWEATHER_API_KEY" \
  "https://api.smarterweather.com/v1/weather?lat=41.88&lon=-87.63"
```

The `X-API-Key` header is **not** supported — requests carrying it
without a Bearer token are rejected with a hint to switch.

Keys are scoped to a single account and a single tier. Scoping rules,
rotation, and revocation flows are documented in
<https://smarterweather.com/developers/keys>.

## Planned endpoints (Phase 2)

The Phase 2 launch surface is intentionally minimal. Additional endpoints
land in subsequent phases (alerts, history, point-and-click radar metadata,
ensemble guidance) and will be added here as they ship.

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `GET`  | `/v1/health` | Liveness probe; unauthenticated. |
| `GET`  | `/v1/weather` | Unified weather response: current conditions, hourly + daily forecasts, alerts, radar metadata. |

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
<https://smarterweather.com/developers/limits>.

## Stability promise

Once the API is GA, breaking changes follow the deprecation policy in
[ADR 001][adr-001]:

- 6 months notice before any `/v1/*` endpoint is removed.
- 90 days notice before a breaking response-shape change.
- Non-breaking additions ship immediately.

Until GA, the surface is allowed to change without notice; track the
[Phase 2 epic](https://github.com/smarterweather/developer/issues) for the
GA cutover.
