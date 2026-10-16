# Examples

Small programs that call Smarter Weather, one directory each. Every one runs
as-is once you put your key in it, and CI runs every one on each change.

## The bar

One call, one object, one key constant.

`GET /v1/weather` returns current conditions, the hourly and daily forecast,
active alerts, outlooks and sun and moon times in a single response, the way
Apple's WeatherKit hands back one `Weather` value from one call. Each example:

- shows a real result in the fewest lines its language allows;
- never needs a second call to be useful;
- opens with one placeholder key constant and nothing else to configure;
- prints or renders `attribution.sources`, the data sources behind the answer.

The first example in each language is the shortest useful call: the key, the
request, the print. Everything else builds on it.

## Start here

| Language | Example | Run |
| --- | --- | --- |
| curl | [rest/curl/weather](./rest/curl/weather/) | `./weather.sh` |
| JavaScript (Node.js 20+) | [rest/javascript/weather](./rest/javascript/weather/) | `node weather.mjs` |
| Python 3.10+ | [rest/python/weather](./rest/python/weather/) | `python weather.py` |
| Go | [rest/go/weather](./rest/go/weather/) | `go run .` |
| Claude Desktop (MCP) | [mcp/claude-desktop](./mcp/claude-desktop/) | add the config, ask the prompt |
| Cursor (MCP) | [mcp/cursor](./mcp/cursor/) | add the config, ask the prompt |

Each prints something like:

```text
58.4°F, Partly Cloudy
Sources: NOAA NBM, HRRR, RTMA, MRMS, NWS, JPL Ephemeris
```

Coverage is the 50 US states and DC.

## Your key

Get a free key at <https://developers.smarterweather.com/dashboard/api-keys>,
or run `npx -y @smarterweather/mcp-onboarding@latest login`, which writes it to
`.env` as `SMARTERWEATHER_API_KEY` and never prints it.

Every REST example starts with one line to edit:

```js
const API_KEY = "YOUR_SMARTERWEATHER_API_KEY"; // insert your key here
```

The `SMARTERWEATHER_API_KEY` environment variable wins over that constant, so
you can leave the file alone and export the variable instead. Never commit a
real key; if one leaks, revoke it in the dashboard and mint another. No key of
any kind lives in this repository, and CI fails on anything that looks like
one.

Browser code never holds the key. The API answers cross-origin requests only
from Smarter Weather's own sites, so a web page calls your server and your
server calls the API with the key.

## Layout

```text
examples/
  index.json            one entry per example and language (schema: index.schema.json)
  rest/<language>/<example>/
  mcp/<client>/
  sdk/                  reserved for when an SDK ships
  _harness/             the mock, the recording proxy and the checks CI runs
```

`index.json` is what the developer portal reads to list examples. An example
written in several languages is several entries that share an `id`, and
`(id, language)` is unique. A new set of examples, such as an SDK, is a new
`surface` value and a directory; nothing else changes.

## How CI checks examples without a key

[`examples-ci`](../.github/workflows/examples-ci.yml) never calls the real
API and uses no secret:

1. [Prism](https://github.com/stoplightio/prism) 5.14.2 mocks the API from
   [`openapi.yaml`](../openapi.yaml). It answers 401 when the
   `Authorization` header is missing and the documented example otherwise.
2. [`_harness/record-proxy.mjs`](./_harness/record-proxy.mjs) sits in front
   of the mock and records each request's method, path, query and whether a
   `Bearer` token was sent (never the token).
3. For every `index.json` entry with a `test`, the example runs with
   `SMARTERWEATHER_API_BASE` pointed at the proxy and a fake key, and
   [`_harness/expect-run.mjs`](./_harness/expect-run.mjs) checks its exit
   code, its output and the recorded request against the example's
   `test.json`. A second run goes through a path where the proxy drops the
   header; the mock must answer 401 and the example must fail.
4. [`_harness/validate-index.mjs`](./_harness/validate-index.mjs) checks
   `index.json` against its schema, the READMEs' relative links and the key
   constant; [`_harness/scan-keys.mjs`](./_harness/scan-keys.mjs) looks for
   anything shaped like a key.

Run the same thing locally (Node.js 20+, plus Python, Go and jq for those
examples):

```bash
cd examples/_harness
npm ci
npm run validate && npm run scan
npm test               # every example
./with-mock.sh node run-all.mjs python   # one language
```

## Contributing an example

Open an issue first ([CONTRIBUTING](../CONTRIBUTING.md), Tier 2). An example
is a directory with a `README.md`, the code, a `test.json` and an
`index.json` entry. Keep it to the bar above, US locations only.

## License

Code in this directory is [MIT](../LICENSE). README prose is
[CC BY 4.0](../LICENSE-docs).
