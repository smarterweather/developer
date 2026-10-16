# Current weather in one call (JavaScript)

Calls `GET /v1/weather` for Denver, CO with the built-in `fetch` and prints
the temperature, the conditions and the data sources. No dependencies.

```js
const API_KEY = "YOUR_SMARTERWEATHER_API_KEY"; // insert your key here
const API_BASE = process.env.SMARTERWEATHER_API_BASE ?? "https://api.smarterweather.com";

const res = await fetch(`${API_BASE}/v1/weather?lat=39.74&lon=-104.99`, {
  headers: { Authorization: `Bearer ${process.env.SMARTERWEATHER_API_KEY ?? API_KEY}` },
});
const weather = await res.json();
if (!res.ok) throw new Error(`${res.status}: ${weather.detail}`);

console.log(`${weather.current.temperature}°F, ${weather.current.conditions}`);
console.log(`Sources: ${weather.attribution.sources.join(", ")}`);
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

`weather` holds the whole response: `weather.hourly`, `weather.daily` and
`weather.alerts` are already there.

- Route: [`GET /v1/weather`](https://developers.smarterweather.com/api/weather/)
- Test: `npm test` runs [`test.json`](./test.json) through [`../../../_harness`](../../../_harness/)
- License: code [MIT](../../../../LICENSE), prose [CC BY 4.0](../../../../LICENSE-docs)
