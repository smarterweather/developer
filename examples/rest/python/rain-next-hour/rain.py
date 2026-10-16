import os
from datetime import datetime, timedelta, timezone
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


def parse(timestamp):
    return datetime.fromisoformat(timestamp.replace("Z", "+00:00"))


def clock(time, tz):
    """A UTC datetime -> 3:40 PM, in the location's time zone."""
    return time.astimezone(ZoneInfo(tz) if tz else None).strftime("%I:%M %p").lstrip("0")


def answer(weather):
    """One sentence from nowcast.summary: the radar's next 60 minutes."""
    nowcast = weather.get("nowcast") or {}
    summary = nowcast.get("summary")
    if summary is None:
        return "No radar nowcast for this location right now."
    if not summary.get("starts_at"):
        return "No rain expected in the next 60 minutes."
    tz = (weather.get("location") or {}).get("timezone")
    radar_time = parse(nowcast["generated_at"]) if nowcast.get("generated_at") else datetime.now(timezone.utc)
    step = timedelta(seconds=nowcast.get("interval_seconds") or 300)
    starts = parse(summary["starts_at"])
    what = f"{summary['peak_intensity']} {PRECIP.get(summary['type'], 'precipitation')}".capitalize()
    when = "now" if starts <= radar_time else f"starting around {clock(starts, tz)}"
    # ends_at is the start of the last wet step, so it stops about a step later.
    until = f", ending around {clock(parse(summary['ends_at']) + step, tz)}" if summary.get("ends_at") else ""
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
