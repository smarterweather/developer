# Will it rain in the next hour? (JavaScript)

Calls `GET /v1/weather?include=nowcast,location` for Seattle, WA with the
built-in `fetch` and answers in one sentence from the radar nowcast, in the
location's local time. No dependencies.

```js
// Quick local try: paste your key below. Prefer the SMARTERWEATHER_API_KEY
// environment variable, which wins when set, and never commit a real key.
const API_KEY = "YOUR_SMARTERWEATHER_API_KEY"; // insert your key here
const API_BASE = process.env.SMARTERWEATHER_API_BASE || "https://api.smarterweather.com";
const PRECIP = { rain: "rain", snow: "snow", freezing_rain: "freezing rain", wintry_mix: "wintry mix" };

const res = await fetch(`${API_BASE}/v1/weather?lat=47.61&lon=-122.33&include=nowcast,location`, {
  headers: { Authorization: `Bearer ${process.env.SMARTERWEATHER_API_KEY || API_KEY}` },
  signal: AbortSignal.timeout(10_000),
});
if (!res.ok) {
  console.error(`${res.status}: ${problemText(await res.text())}`);
  process.exit(1);
}
const weather = await res.json();

console.log(answer(weather));
console.log(`Sources: ${weather.attribution.sources.join(", ")}`);

// One sentence from nowcast.summary: the radar's next 60 minutes.
function answer({ nowcast, location }) {
  const summary = nowcast?.summary;
  if (!summary) return "No radar nowcast for this location right now.";
  if (!summary.starts_at) return "No rain expected in the next 60 minutes.";
  const what = `${summary.peak_intensity} ${PRECIP[summary.type] ?? "precipitation"}`;
  const when = summary.already_occurring ? "now" : `starting around ${clock(summary.starts_at, location?.timezone)}`;
  const until = summary.ends_at ? `, ending around ${clock(summary.ends_at, location?.timezone)}` : "";
  return `${what[0].toUpperCase()}${what.slice(1)} ${when}${until}.`;
}

// 2026-10-16T22:40:00Z -> 3:40 PM, in the location's time zone.
function clock(timestamp, timeZone) {
  const time = new Date(timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone });
  return time.replace(" ", " ");
}

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
export SMARTERWEATHER_API_KEY=...   # or edit the placeholder in rain.mjs
node rain.mjs
```

```text
Light rain starting around 3:40 PM, ending around 4:05 PM.
Sources: NOAA NBM, HRRR, RTMA, MRMS, NWS, JPL Ephemeris
```

Other answers look like `No rain expected in the next 60 minutes.`,
`Heavy rain starting around 4:00 PM.` or `Moderate wintry mix now, ending
around 4:20 PM.`

It reads `nowcast.summary`, which the API computes from the radar's next 60
minutes in 5-minute steps (`nowcast.points`):

| Field | Used for |
| --- | --- |
| `starts_at` | When it starts; absent when nothing falls in the hour |
| `ends_at` | When it stops, if it stops inside the hour |
| `already_occurring` | `true` when it is falling now |
| `peak_intensity` | `light`, `moderate` or `heavy`, the strongest in the event |
| `type` | `rain`, `snow`, `freezing_rain` or `wintry_mix` |

Times print in the location's time zone, `location.timezone`, which
`include=location` adds. `include` replaces the default sections, so the
response carries only the nowcast, the location and the attribution. The
nowcast covers the contiguous US; elsewhere, or when the radar has no frame
for the point, `nowcast` is absent and the script says so.

On an error it prints the status, the problem's `detail` and its recommended
next step (or the first 200 characters of a body that is not a problem) and
exits 1; it gives up after 10 seconds. Seattle is a placeholder: change
`lat` and `lon`, or send `zip` or `location` instead.

- Route: [`GET /v1/weather`](https://developers.smarterweather.com/api/weather/)
- Test: `npm test` runs [`test.json`](./test.json) through [`../../../_harness`](../../../_harness/),
  including each answer above from the bodies in [`fixtures/`](./fixtures/)
- License: code [MIT](../../../../LICENSE), prose [CC BY 4.0](../../../../LICENSE-docs)
