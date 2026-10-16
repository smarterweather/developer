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
