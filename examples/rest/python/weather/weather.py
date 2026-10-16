import os

import requests

# Quick local try: paste your key below. Prefer the SMARTERWEATHER_API_KEY
# environment variable, which wins when set, and never commit a real key.
API_KEY = "YOUR_SMARTERWEATHER_API_KEY"  # insert your key here
API_BASE = os.environ.get("SMARTERWEATHER_API_BASE") or "https://api.smarterweather.com"


def problem_text(res):
    """Errors are RFC 9457 problems (JSON) whose next_steps names a fix;
    anything else, such as a gateway's HTML or JSON error, is shown as its
    first 200 characters."""
    try:
        problem = res.json()
        text = problem.get("detail") or problem.get("title")
        next_steps = problem.get("next_steps") or {}
        hint = (next_steps.get(next_steps.get("recommended")) or {}).get("href")
    except (ValueError, AttributeError):
        text = None
    if not isinstance(text, str):
        return res.text[:200]
    return f"{text}\nNext step: {hint}" if hint else text


res = requests.get(
    f"{API_BASE}/v1/weather",
    params={"lat": 39.74, "lon": -104.99},
    headers={"Authorization": f"Bearer {os.environ.get('SMARTERWEATHER_API_KEY') or API_KEY}"},
    timeout=10,
)
if not res.ok:
    raise SystemExit(f"{res.status_code}: {problem_text(res)}")
weather = res.json()

print(f"{weather['current']['temperature']}°F, {weather['current']['conditions']}")
print("Sources:", ", ".join(weather["attribution"]["sources"]))
