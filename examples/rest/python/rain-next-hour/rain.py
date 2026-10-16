import os
from datetime import datetime
from zoneinfo import ZoneInfo

import requests

# Quick local try: paste your key below. Prefer the SMARTERWEATHER_API_KEY
# environment variable, which wins when set, and never commit a real key.
API_KEY = "YOUR_SMARTERWEATHER_API_KEY"  # insert your key here
API_BASE = os.environ.get("SMARTERWEATHER_API_BASE") or "https://api.smarterweather.com"
PRECIP = {"rain": "rain", "snow": "snow", "freezing_rain": "freezing rain", "wintry_mix": "wintry mix"}


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


def clock(timestamp, timezone):
    """2026-10-16T22:40:00Z -> 3:40 PM, in the location's time zone."""
    t = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    return t.astimezone(ZoneInfo(timezone) if timezone else None).strftime("%I:%M %p").lstrip("0")


def answer(weather):
    """One sentence from nowcast.summary: the radar's next 60 minutes."""
    summary = (weather.get("nowcast") or {}).get("summary")
    if summary is None:
        return "No radar nowcast for this location right now."
    if not summary.get("starts_at"):
        return "No rain expected in the next 60 minutes."
    timezone = (weather.get("location") or {}).get("timezone")
    what = f"{summary['peak_intensity']} {PRECIP.get(summary['type'], 'precipitation')}".capitalize()
    when = "now" if summary.get("already_occurring") else f"starting around {clock(summary['starts_at'], timezone)}"
    until = f", ending around {clock(summary['ends_at'], timezone)}" if summary.get("ends_at") else ""
    return f"{what} {when}{until}."


res = requests.get(
    f"{API_BASE}/v1/weather",
    params={"lat": 47.61, "lon": -122.33, "include": "nowcast,location"},
    headers={"Authorization": f"Bearer {os.environ.get('SMARTERWEATHER_API_KEY') or API_KEY}"},
    timeout=10,
)
if not res.ok:
    raise SystemExit(f"{res.status_code}: {problem_text(res)}")
weather = res.json()

print(answer(weather))
print("Sources:", ", ".join(weather["attribution"]["sources"]))
