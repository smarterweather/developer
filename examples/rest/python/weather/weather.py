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
