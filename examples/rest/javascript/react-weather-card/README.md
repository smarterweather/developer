# A React weather card

A `useWeather` hook and a `<WeatherCard location />` component that show the
temperature and conditions now, today's forecast in one line, the first
active alert and the data sources. A Next.js route handler holds your key and
makes the one call, `GET /v1/weather`.

![The card for Boston, MA: 58°F, Partly Cloudy, today's high and low, and the data sources](./screenshot.png)

```tsx
<WeatherCard location="Boston, MA" />
```

| File | What it is |
| --- | --- |
| [`components/WeatherCard.tsx`](./components/WeatherCard.tsx) | The card. Plain React. |
| [`hooks/useWeather.ts`](./hooks/useWeather.ts) | `useWeather(location, { endpoint })` returns `{ data, error, loading }`, aborts on unmount and drops a response for an old location. Plain React. |
| [`lib/weather.ts`](./lib/weather.ts) | How a response becomes the card's lines or its error. Plain TypeScript, shared by the hook, the card and the tests. |
| [`app/api/weather/route.ts`](./app/api/weather/route.ts) | The server route the hook calls. It holds the key. |
| [`app/page.tsx`](./app/page.tsx) | The page that renders the card. |

## Why the key lives in a route

The API answers cross-origin requests only from Smarter Weather's own sites,
so a browser on your origin cannot call it directly, and a key shipped to a
browser is a key anyone can copy. The browser calls `/api/weather?location=...`
on your server, and the route calls the API with the key:

```ts
// The browser calls this route; the route calls the API with your key, so the
// key never reaches the browser. Quick local try: paste your key below. Prefer
// SMARTERWEATHER_API_KEY (in .env.local), which wins when set, and never
// commit a real key.
const API_KEY = "YOUR_SMARTERWEATHER_API_KEY"; // insert your key here
const API_BASE = process.env.SMARTERWEATHER_API_BASE || "https://api.smarterweather.com";
// Response headers passed on to the browser: the body's type, the auth
// challenge on a 401, and the rate-limit headers.
const FORWARD = /^(content-type|www-authenticate|retry-after|ratelimit-.+)$/i;

// GET /api/weather?location=Boston,+MA -> GET /v1/weather, with only the
// sections the card shows. The status, the body and the headers above pass
// through; a timeout or network error becomes a 504 or 502 problem.
export async function GET(request: Request) {
  const location = new URL(request.url).searchParams.get("location") ?? "";
  const query = new URLSearchParams({ location, include: "current,daily,alerts", days: "1" });
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/v1/weather?${query}`, {
      headers: { Authorization: `Bearer ${process.env.SMARTERWEATHER_API_KEY || API_KEY}` },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    const timedOut = (err as Error)?.name === "TimeoutError";
    const status = timedOut ? 504 : 502;
    const detail = timedOut ? "The weather API did not answer within 10 seconds." : "Could not reach the weather API.";
    return Response.json({ title: timedOut ? "Gateway Timeout" : "Bad Gateway", status, detail }, { status, headers: { "content-type": "application/problem+json" } });
  }
  return new Response(res.body, { status: res.status, headers: [...res.headers].filter(([name]) => FORWARD.test(name)) });
}
```

The hook, the card and `lib/weather.ts` import nothing from Next.js (a test
checks this), so they drop into any React app. Point `endpoint` at whatever server route you
have, in any framework or language, as long as it answers with the
`/v1/weather` JSON:

```tsx
<WeatherCard location="Denver, CO" endpoint="/my/weather" />
```

The route asks only for the sections the card shows (`include=current,daily,alerts`,
`days=1`). Drop those two parameters to get the whole response: the hourly
forecast, ten days, outlooks, and sun and moon times.

## Run it

Needs Node.js 22.22 or later, which the tests need (the app alone runs on
any Node.js that Next.js 16 supports).

```bash
npm install
echo "SMARTERWEATHER_API_KEY=..." > .env.local   # or edit the placeholder in the route
npm run dev
```

Open <http://localhost:3000>. An error shows in the card as `<status>: ` and
the problem's `detail` with a link to its recommended next step, or the start
of a body that is not a problem or not JSON. The route gives up after 10
seconds and then answers 504; if it cannot reach the API it answers 502.

- Route: [`GET /v1/weather`](https://developers.smarterweather.com/api/weather/)
- Test: `npm test` builds the app, then runs the Vitest suite in
  [`test/`](./test/). It renders the card through the route against the mock,
  covers the error and missing-data states, the route's timeout, network
  error and forwarded headers, and the hook dropping a stale response. Last,
  it runs [`test.json`](./test.json) through
  [`../../../_harness`](../../../_harness/): `test/call-route.mjs` starts the
  built app and prints the card's lines through `lib/weather.ts`, so the
  harness's five runs go through the route and the card's own formatting.
  Run it through `_harness/with-mock.sh`, which supplies the mock.
- The screenshot is the card rendering the API's documented example response
  from the mock, not live data.
- License: code [MIT](../../../../LICENSE), prose [CC BY 4.0](../../../../LICENSE-docs)
