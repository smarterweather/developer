# Current weather in one call (JavaScript)

Calls `GET /v1/weather` for Denver, CO with the built-in `fetch` and prints
the temperature, the conditions and the data sources. No dependencies.

```js
// Quick local try: paste your key below. Prefer the SMARTERWEATHER_API_KEY
// environment variable, which wins when set, and never commit a real key.
const API_KEY = "YOUR_SMARTERWEATHER_API_KEY"; // insert your key here
const API_BASE = process.env.SMARTERWEATHER_API_BASE || "https://api.smarterweather.com";

const res = await fetch(`${API_BASE}/v1/weather?lat=39.74&lon=-104.99`, {
  headers: { Authorization: `Bearer ${process.env.SMARTERWEATHER_API_KEY || API_KEY}` },
  signal: AbortSignal.timeout(10_000),
});
if (!res.ok) {
  console.error(`${res.status}: ${problemText(await res.text())}`);
  process.exit(1);
}
const weather = await res.json();

console.log(`${weather.current.temperature}°F, ${weather.current.conditions}`);
console.log(`Sources: ${weather.attribution.sources.join(", ")}`);

// Errors are RFC 9457 problems (JSON) whose next_steps names a fix; anything
// else, such as a gateway's HTML or JSON error, is shown as its first 200
// characters.
function problemText(body) {
  try {
    const { detail, title, next_steps: next } = JSON.parse(body);
    const text = detail || title;
    if (typeof text === "string") {
      const hint = next?.[next.recommended]?.href;
      return hint ? `${text}\nNext step: ${hint}` : text;
    }
  } catch {}
  return body.slice(0, 200);
}
```

## Run it

Needs Node.js 20 or later.

```bash
export SMARTERWEATHER_API_KEY=...   # or edit the placeholder in weather.mjs
node weather.mjs
```

```text
58.4°F, Partly Cloudy
Sources: NOAA NBM, HRRR, RTMA, MRMS, NWS, JPL Ephemeris
```

On an error it prints the status, the problem's `detail` and its recommended
next step (or the first 200 characters of a body that is not a problem) and
exits 1; it gives up after 10 seconds. `weather` holds the whole response: `weather.hourly`, `weather.daily` and
`weather.alerts` are already there.

- Route: [`GET /v1/weather`](https://developers.smarterweather.com/api/weather/)
- Test: `npm test` runs [`test.json`](./test.json) through [`../../../_harness`](../../../_harness/)
- License: code [MIT](../../../../LICENSE), prose [CC BY 4.0](../../../../LICENSE-docs)
