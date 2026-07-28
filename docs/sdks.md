# SDKs

> **Not yet shipped.** First-party SDKs are the one part of the developer
> platform that is still ahead of us — the REST API, both MCP servers, and
> both npm stdio bridges are generally available. Until an SDK lands, call
> the API directly; it is a plain JSON HTTP API with Bearer auth, and
> [`quickstart.md`](./quickstart.md) has working snippets in three languages.
> This page describes the planned ergonomics so integrators can plan against
> them.

## Languages and timing

| Language   | Package name (planned)              | Status       |
| ---------- | ----------------------------------- | ------------ |
| TypeScript | `@smarterweather/sdk`               | not shipped  |
| Python     | `smarterweather`                    | not shipped  |
| Go         | `github.com/smarterweather/sdk-go`  | not shipped  |

If you need a language we have not committed to, file an issue with the
"feature request" template - SDK additions are demand-driven.

## Authoring posture

All first-party SDKs follow the same posture:

1. **Generated, not hand-written.** Public SDKs are generated from the
   canonical OpenAPI spec at the root of this repo. Hand-written shims sit
   on top of the generated client where ergonomics demand it (e.g. retry
   defaults, structured logging) but never hide the underlying request
   surface.
2. **No business logic.** SDKs do request/response, auth, retries, and
   pagination. Anything weather-domain stays server-side.
3. **Same versioning as the API.** Major SDK version tracks API major
   version (`v1` -> SDK 1.x). Patch and minor versions track the SDK's own
   changelog.
4. **Permissively licensed.** All SDK source is MIT-licensed (see
   [LICENSE](../LICENSE)).

## Planned ergonomics

### TypeScript

```ts
import { SmarterWeather } from "@smarterweather/sdk";

const sw = new SmarterWeather({
  apiKey: process.env.SMARTERWEATHER_API_KEY,
});

const weather = await sw.weather.get({
  latitude: 41.88,
  longitude: -87.63,
});
```

### Python

```python
from smarterweather import SmarterWeather

sw = SmarterWeather(api_key=os.environ["SMARTERWEATHER_API_KEY"])

weather = sw.weather.get(latitude=41.88, longitude=-87.63)
```

Both SDKs ship typed responses, structured error classes that mirror the
[RFC 7807 error model](./errors.md), and built-in handling of the
`RateLimit-*` headers.

## Until SDKs ship

Make plain HTTPS calls against `https://api.smarterweather.com/v1/*` with
whatever HTTP client your language already provides. The
[REST API guide](./rest-api.md) is the orientation reference and
[`openapi.yaml`](../openapi.yaml) is the canonical contract — generate a
client from it if you want types today.
