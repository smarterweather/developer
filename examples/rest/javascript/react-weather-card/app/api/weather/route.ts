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
