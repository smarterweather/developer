# Current weather in one call (Python)

Calls `GET /v1/weather` for Denver, CO with
[requests](https://requests.readthedocs.io/) and prints the temperature, the
conditions and the data sources.

```python
import os

import requests

API_KEY = "YOUR_SMARTERWEATHER_API_KEY"  # insert your key here
API_BASE = os.environ.get("SMARTERWEATHER_API_BASE", "https://api.smarterweather.com")

res = requests.get(
    f"{API_BASE}/v1/weather",
    params={"lat": 39.74, "lon": -104.99},
    headers={"Authorization": f"Bearer {os.environ.get('SMARTERWEATHER_API_KEY', API_KEY)}"},
    timeout=10,
)
weather = res.json()
if not res.ok:
    raise SystemExit(f"{res.status_code}: {weather.get('detail')}")

print(f"{weather['current']['temperature']}°F, {weather['current']['conditions']}")
print("Sources:", ", ".join(weather["attribution"]["sources"]))
```

## Run it

Needs Python 3.10 or later.

```bash
python -m pip install -r requirements.txt
export SMARTERWEATHER_API_KEY=...   # or edit the placeholder in weather.py
python weather.py
```

```text
58.4°F, Partly Cloudy
Sources: NOAA NBM, HRRR, RTMA, MRMS, NWS, JPL Ephemeris
```

`weather` holds the whole response: `weather["hourly"]`, `weather["daily"]`
and `weather["alerts"]` are already there.

- Route: [`GET /v1/weather`](https://developers.smarterweather.com/api/weather/)
- Test: [`test.json`](./test.json), run by [`../../../_harness`](../../../_harness/)
- License: code [MIT](../../../../LICENSE), prose [CC BY 4.0](../../../../LICENSE-docs)
