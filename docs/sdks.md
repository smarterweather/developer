# SDKs

> **Preview - SDKs not yet shipped.** First-party SDKs land alongside the
> Phase 2 REST API launch (TypeScript first, Python soon after, Go to
> follow). This page reserves the documentation slot and describes the
> planned ergonomics so SDK authors and integrators can plan against them.

## Languages and timing

| Language   | Package name (planned)              | Status       | Phase |
| ---------- | ----------------------------------- | ------------ | ----- |
| TypeScript | `@smarterweather/sdk`               | not shipped  | Phase 2 |
| Python     | `smarterweather`                    | not shipped  | Phase 2/5 |
| Go         | `github.com/smarterweather/sdk-go`  | not shipped  | Phase 5 |

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

Until Phase 2 lands, the recommended path is plain HTTPS calls against
`https://api.smarterweather.com/v1/*` with whatever HTTP client your
language already provides. The [REST API guide](./rest-api.md) is the
canonical contract reference; the OpenAPI spec at the repo root will
become available alongside the Phase 2 launch.
