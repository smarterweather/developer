// Quick local try: paste your key below. Prefer the SMARTERWEATHER_API_KEY
// environment variable, which wins when set, and never commit a real key.
const API_KEY = "YOUR_SMARTERWEATHER_API_KEY"; // insert your key here
const API_BASE = process.env.SMARTERWEATHER_API_BASE || "https://api.smarterweather.com";

const res = await fetch(`${API_BASE}/v1/weather?lat=39.74&lon=-104.99`, {
  headers: { Authorization: `Bearer ${process.env.SMARTERWEATHER_API_KEY || API_KEY}` },
});
if (!res.ok) {
  console.error(`${res.status}: ${problemText(await res.text())}`);
  process.exit(1);
}
const weather = await res.json();

console.log(`${weather.current.temperature}°F, ${weather.current.conditions}`);
console.log(`Sources: ${weather.attribution.sources.join(", ")}`);

// Errors are RFC 9457 problems (JSON) whose next_steps names a fix; anything
// else, such as a proxy's HTML page, is shown as text.
function problemText(body) {
  try {
    const { detail, title, next_steps: next } = JSON.parse(body);
    const hint = next?.[next.recommended]?.href;
    return hint ? `${detail ?? title}\nNext step: ${hint}` : String(detail ?? title);
  } catch {
    return body.slice(0, 200);
  }
}
