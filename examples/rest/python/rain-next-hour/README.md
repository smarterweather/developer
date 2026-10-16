# Will it rain in the next hour? (Python)

Calls `GET /v1/weather?include=nowcast,location` for Seattle, WA with
[requests](https://requests.readthedocs.io/) and answers in one sentence from
the radar nowcast, in the location's local time.

```python
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


def clock(timestamp, tz):
    """2026-10-16T22:40:00Z -> 3:40 PM, in the location's time zone."""
    time = datetime.fromisoformat(timestamp).astimezone(ZoneInfo(tz) if tz else None)
    return time.strftime("%I:%M %p").lstrip("0")


def answer(weather):
    """One sentence from nowcast.summary: the radar's next 60 minutes."""
    summary = (weather.get("nowcast") or {}).get("summary")
    if summary is None:
        return "No radar nowcast for this location right now."
    if not summary.get("starts_at"):
        return "No rain expected in the next 60 minutes."
    tz = (weather.get("location") or {}).get("timezone")
    what = f"{summary['peak_intensity']} {PRECIP.get(summary['type'], 'precipitation')}".capitalize()
    when = "now" if summary.get("already_occurring") else f"starting around {clock(summary['starts_at'], tz)}"
    until = f", ending around {clock(summary['ends_at'], tz)}" if summary.get("ends_at") else ""
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
```

## Run it

Needs Python 3.11 or later.

```bash
python3 -m pip install -r requirements.txt   # in a venv
export SMARTERWEATHER_API_KEY=...   # or edit the placeholder in rain.py
python3 rain.py
```

```text
Light rain starting around 3:40 PM, ending around 4:10 PM.
Sources: NOAA NBM, HRRR, RTMA, MRMS, NWS, JPL Ephemeris
```

Other answers look like `No rain expected in the next 60 minutes.`,
`Heavy rain starting around 4:00 PM.`, `Light snow now, ending around 3:50 PM.`
or `Moderate wintry mix now.`

It reads `nowcast.summary`, which the API computes from the radar's next 60
minutes in 5-minute steps (`nowcast.points`):

| Field | Used for |
| --- | --- |
| `starts_at` | When it starts: the first of two wet steps in a row. Absent when nothing falls in the hour |
| `already_occurring` | `true` when it is falling now (the event starts at the first step) |
| `ends_at` | When it stops: the end of the last wet step. `null` while it continues past the hour |
| `peak_intensity` | `light`, `moderate` or `heavy`, the strongest in the event |
| `type` | `rain`, `snow`, `freezing_rain` or `wintry_mix` |

Times print in the location's time zone, `location.timezone` (the
machine's when it is missing), which `include=location` adds. `include` replaces the default sections, so the
response carries only the nowcast, the location and the attribution. The
nowcast covers the contiguous US; elsewhere, or when the radar has no frame
for the point, `nowcast` is absent and the script says so.

On an error it prints the status, the problem's `detail` and its recommended
next step (or the first 200 characters of a body that is not a problem) and
exits 1. It waits up to 10 seconds to connect and up to 10 seconds for each
read (requests' `timeout` is per step, not a total). Seattle is a placeholder: change
`lat` and `lon`, or send `zip` or `location` instead.

- Route: [`GET /v1/weather`](https://developers.smarterweather.com/api/weather/)
- Test: [`test.json`](./test.json), run by [`../../../_harness`](../../../_harness/),
  including each answer above from the shared bodies in
  [`../../_fixtures/rain-next-hour/`](../../_fixtures/rain-next-hour/)
- License: code [MIT](../../../../LICENSE), prose [CC BY 4.0](../../../../LICENSE-docs)
