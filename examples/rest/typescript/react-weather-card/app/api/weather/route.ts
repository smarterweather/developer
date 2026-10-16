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
// through. No location is a 400 without calling the API; a timeout (10 s,
// body included) is a 504 and a network error a 502. If the browser goes
// away, the API call is cancelled.
export async function GET(request: Request) {
  const location = new URL(request.url).searchParams.get("location") ?? "";
  if (!location.trim()) return problem(400, "Bad Request", "Pass a location, such as ?location=Boston,+MA.");
  const query = new URLSearchParams({ location, include: "current,daily,alerts", days: "1" });
  try {
    const res = await fetch(`${API_BASE}/v1/weather?${query}`, {
      headers: { Authorization: `Bearer ${process.env.SMARTERWEATHER_API_KEY || API_KEY}` },
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(10_000)]),
    });
    const body = await res.arrayBuffer();
    return new Response(body, { status: res.status, headers: [...res.headers].filter(([name]) => FORWARD.test(name)) });
  } catch (err) {
    if ((err as Error)?.name === "TimeoutError") return problem(504, "Gateway Timeout", "The weather API did not answer within 10 seconds.");
    return problem(502, "Bad Gateway", "Could not reach the weather API.");
  }
}

function problem(status: number, title: string, detail: string) {
  return Response.json({ title, status, detail }, { status, headers: { "content-type": "application/problem+json" } });
}
