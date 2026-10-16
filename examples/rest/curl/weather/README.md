# Current weather in one call (curl)

Calls `GET /v1/weather` for Denver, CO and prints the temperature, the
conditions and the data sources. One response carries current conditions,
the hourly and daily forecast and active alerts; this prints two lines of it.

```bash
# Quick local try: paste your key below. Prefer exporting SMARTERWEATHER_API_KEY,
# which wins when set, and never commit a real key.
API_KEY="YOUR_SMARTERWEATHER_API_KEY" # insert your key here

body="$(mktemp)"
trap 'rm -f "$body"' EXIT
status="$(curl -sS -o "$body" -w '%{http_code}' \
  "${SMARTERWEATHER_API_BASE:-https://api.smarterweather.com}/v1/weather?lat=39.74&lon=-104.99" \
  -H "Authorization: Bearer ${SMARTERWEATHER_API_KEY:-$API_KEY}")"

if [[ "$status" != 2?? ]]; then
  # Errors are RFC 9457 problems (JSON) whose next_steps names a fix; anything else is shown as text.
  jq -r --arg status "$status" '"\($status): \(.detail // .title)",
    (.next_steps // {} | .[.recommended // ""].href // empty | "Next step: \(.)")' "$body" >&2 2>/dev/null ||
    echo "$status: $(head -c 200 "$body")" >&2
  exit 1
fi

jq -r '"\(.current.temperature)°F, \(.current.conditions)", "Sources: \(.attribution.sources | join(", "))"' "$body"
```

## Run it

Needs bash, curl and [jq](https://jqlang.org/).

```bash
export SMARTERWEATHER_API_KEY=...   # or edit the placeholder in weather.sh
./weather.sh
```

```text
58.4°F, Partly Cloudy
Sources: NOAA NBM, HRRR, RTMA, MRMS, NWS, JPL Ephemeris
```

`cat "$body"` instead of the last `jq` shows the whole response. On an error
the script prints the status, the problem's `detail` and its recommended next
step to stderr and exits 1; without a valid key that step says where to get
one.

- Route: [`GET /v1/weather`](https://developers.smarterweather.com/api/weather/)
- Test: [`test.json`](./test.json), run by [`../../../_harness`](../../../_harness/)
- License: code [MIT](../../../../LICENSE), prose [CC BY 4.0](../../../../LICENSE-docs)
