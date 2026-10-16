// The browser calls this route; the route calls the API with your key, so the
// key never reaches the browser. Quick local try: paste your key below. Prefer
// SMARTERWEATHER_API_KEY (in .env.local), which wins when set, and never
// commit a real key.
const API_KEY = "YOUR_SMARTERWEATHER_API_KEY"; // insert your key here
const API_BASE = process.env.SMARTERWEATHER_API_BASE || "https://api.smarterweather.com";

// GET /api/weather?location=Boston,+MA -> GET /v1/weather, with only the
// sections the card shows. The status and body pass through unchanged.
export async function GET(request: Request) {
  const location = new URL(request.url).searchParams.get("location") ?? "";
  const query = new URLSearchParams({ location, include: "current,daily,alerts", days: "1" });
  const res = await fetch(`${API_BASE}/v1/weather?${query}`, {
    headers: { Authorization: `Bearer ${process.env.SMARTERWEATHER_API_KEY || API_KEY}` },
    signal: AbortSignal.timeout(10_000),
  });
  return new Response(res.body, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}
