# Examples

Small programs and client configs for Smarter Weather, one directory each.
Every REST example runs as-is once `SMARTERWEATHER_API_KEY` is set. On each
change, CI runs every REST example against a mock of the API and checks every
MCP config statically (see [below](#how-ci-checks-examples-without-a-key)).

## The bar

One call, one object, one key constant.

`GET /v1/weather` returns current conditions, the hourly and daily forecast,
active alerts, outlooks and sun and moon times in a single response, the way
Apple's WeatherKit hands back one `Weather` value from one call. Each example:

- shows a real result in the fewest lines its language allows;
- never needs a second call to be useful;
- reads the key from `SMARTERWEATHER_API_KEY`, with one placeholder constant
  as the fallback for a quick local try, and needs nothing else configured;
- prints or renders `attribution.sources`, the data sources behind the answer.

The first example in each language is the shortest useful call: the key, the
request, the print. Everything else builds on it.

## Start here

| Language | Example | Run |
| --- | --- | --- |
| curl | [rest/curl/weather](./rest/curl/weather/) | `./weather.sh` |
| JavaScript (Node.js 20+) | [rest/javascript/weather](./rest/javascript/weather/) | `node weather.mjs` |
| Python 3.10+ | [rest/python/weather](./rest/python/weather/) | `python3 weather.py` |
| Go | [rest/go/weather](./rest/go/weather/) | `go run .` |
| Claude Desktop (MCP) | [mcp/claude-desktop](./mcp/claude-desktop/) | add the config, ask the prompt |
| Cursor (MCP) | [mcp/cursor](./mcp/cursor/) | add the config, ask the prompt |

Each prints something like:

```text
58.4°F, Partly Cloudy
Sources: NOAA NBM, HRRR, RTMA, MRMS, NWS, JPL Ephemeris
```

Coverage is the 50 US states and DC.

## Build on it

| Example | Language | Run |
| --- | --- | --- |
| [Will it rain in the next hour?](./rest/python/rain-next-hour/): one sentence from the radar nowcast | Python 3.11+, [JavaScript](./rest/javascript/rain-next-hour/) (Node.js 20+) | `python3 rain.py`, `node rain.mjs` |

## Your key

Get a free key at <https://developers.smarterweather.com/dashboard/api-keys>,
or run `npx -y @smarterweather/mcp-onboarding@latest login`, which writes it to
`.env` as `SMARTERWEATHER_API_KEY` and never prints it.

Set it in the environment; every example reads `SMARTERWEATHER_API_KEY`
first:

```bash
export SMARTERWEATHER_API_KEY=...   # or source the .env that login wrote
```

For a quick local try without the variable, each REST example also opens with
one placeholder constant you can paste the key into:

```js
const API_KEY = "YOUR_SMARTERWEATHER_API_KEY"; // insert your key here
```

The variable wins whenever it is set and not empty. Never commit a real key;
if one leaks, revoke it in the dashboard and mint another. No key of any kind
lives in this repository, and CI fails on any file in it that looks like one.
The MCP configs hold no key at all: the bridge reads it from a `.env` file.

Browser code never holds the key. The API answers cross-origin requests only
from Smarter Weather's own sites, so a web page calls your server and your
server calls the API with the key.

## Layout

```text
examples/
  index.json            {version, examples[]}: one entry per example, surface and language
  index.schema.json     its JSON Schema
  rest/<language>/<example>/
  rest/_fixtures/       response bodies some examples' tests share
  mcp/<client>/
  sdk/                  reserved for when an SDK ships
  _harness/             the mock, the recording proxy and the checks CI runs
```

`index.json` is what the developer portal reads to list examples. An example
written in several languages, or on several surfaces (the REST call and, one
day, the same thing with an SDK), is several entries that share an `id`;
`(id, surface, language)` is unique. `kind` says what the entry is: `code`
(a program, which must carry the placeholder constant) or `config` (which
must hold no key). An entry with a `test` is run by CI; one without is only
listed.

The index grows additively. `surface` and `language` are open values (in use:
`rest`, `mcp`, `sdk`; `curl`, `javascript`, `typescript`, `python`, `go`,
`json`), and readers ignore fields they do not know, so a new set of examples,
such as an SDK, is new entries and a directory, and the file stays valid for
every version-1 reader. `version` changes only when an existing field changes
meaning. `kind` and `level` are closed lists: a new kind needs new checks.

## How CI checks examples without a key

[`examples-ci`](../.github/workflows/examples-ci.yml) never calls the real
API and uses no secret. For REST examples (`kind: code`):

1. [Prism](https://github.com/stoplightio/prism) 5.14.2 mocks the API from
   [`openapi.yaml`](../openapi.yaml). It answers 401 when the
   `Authorization` header is missing and the documented example otherwise.
2. [`_harness/record-proxy.mjs`](./_harness/record-proxy.mjs) sits in front
   of the mock and records each request's method, path and query, whether a
   `Bearer` token was sent, and whether it was the fake key from the
   environment or the placeholder (never the token itself).
3. [`_harness/expect-run.mjs`](./_harness/expect-run.mjs) runs the example
   five times, plus once per fixture, with `SMARTERWEATHER_API_BASE` pointed at the proxy:
   - with the fake key in `SMARTERWEATHER_API_KEY`: it must exit 0, print
     what its `test.json` expects, and send exactly the request listed
     there, with that key as the bearer;
   - with `SMARTERWEATHER_API_KEY` set but empty: it must fall back to the
     placeholder constant;
   - through a path where the proxy drops the header: the mock answers 401,
     and the example must exit non-zero and print a line `401: <detail>`
     from the problem, then its recommended next step;
   - through paths where the proxy answers 502 with an HTML page and 504
     with `{"message":"Endpoint request timed out"}` (JSON, but not a
     problem): the example must exit non-zero and print `<status>: ` and the
     start of the body, not a parse error.
   - once for each body listed under `fixtures` in its `test.json`, through
     a path where the proxy answers 200 with that body: the example must exit
     0, print what the fixture expects, and send the same request with the
     env key as in the first run. Fixtures are small hand-written responses
     in the API's shape (see [`rest/_fixtures`](./rest/_fixtures/)), for
     answers the mock's one example body cannot give: it has no radar
     nowcast, for instance.

Every example waits at most 10 seconds for the API: for the whole call in
curl, JavaScript and Go, and for the connection and each read in Python
(`requests`' `timeout` applies per step, not to the whole call).

For MCP configs (`kind: config`),
[`_harness/check-mcp-config.mjs`](./_harness/check-mcp-config.mjs) applies
the rules of the client the directory is named after, with no network call:

- Claude Desktop: stdio servers only and no `${...}` interpolation.
- Cursor: a stdio server, or a remote one (`url` + `headers`) with no stdio
  fields; `${env:NAME}`, `${workspaceFolder}` and `envFile` are allowed.
- A stdio server must be `npx -y @smarterweather/mcp-weather@latest`, whose
  default URL is the hosted `https://mcp.smarterweather.com`. Any URL
  override, and any remote `url`, must be that too.
- The key comes from a source the bridge reads: `SMARTERWEATHER_ENV_FILE`,
  Cursor's `envFile`, `SMARTERWEATHER_API_KEY` as a client interpolation
  (never a literal), or `./.env` in the working directory.
- No value is a key, looks like one, or is the placeholder.

For everything, [`_harness/validate-index.mjs`](./_harness/validate-index.mjs)
checks `index.json` against its schema, every `test.json` against
[`_harness/test-spec.mjs`](./_harness/test-spec.mjs), the READMEs' relative
links and the key constant. Separately, [`key-scan`](../.github/workflows/key-scan.yml)
runs [`_harness/scan-keys.mjs`](./_harness/scan-keys.mjs) on every pull
request and push to `main`. It checks every file git tracks for API keys
(`sw_live_`, `sw_test_`, `sw_trial_`, `sw_internal_<audience>_`) and claim
tickets (`sw_claim_`). A documented fake can carry `log-scrubber-allow` on
the same line.

Run the same thing locally (Node.js 20+, plus Python 3.11+, Go and jq for
those examples):

```bash
cd examples/_harness
npm ci
npm run validate && npm run scan && npm run test:unit
npm test                                 # every example
./with-mock.sh node run-all.mjs python   # one language
```

When the selection includes a Python example, `run-all.mjs` creates a venv in
`_harness/.venv` (with `uv` when it is installed, otherwise `python3 -m venv`)
and puts it first on `PATH`, so requirements never land in your system
Python. An already active venv is used as is, and a run without Python
examples needs no Python at all. CI uses `actions/setup-python` instead.

## Contributing an example

Open an issue first ([CONTRIBUTING](../CONTRIBUTING.md), Tier 2). An example
is a directory with a `README.md`, the code or config, an `index.json`
entry and, for code, a `test.json`. Keep it to the bar above, US locations only.

## License

Code in this directory is [MIT](../LICENSE). README prose is
[CC BY 4.0](../LICENSE-docs).
