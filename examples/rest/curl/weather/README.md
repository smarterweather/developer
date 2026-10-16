# Current weather in one call (curl)

Calls `GET /v1/weather` for Denver, CO and prints the temperature, the
conditions and the data sources. One response carries current conditions,
the hourly and daily forecast and active alerts; this prints two lines of it.

```bash
SMARTERWEATHER_API_KEY="${SMARTERWEATHER_API_KEY:-YOUR_SMARTERWEATHER_API_KEY}" # insert your key here

curl -sS --fail-with-body "${SMARTERWEATHER_API_BASE:-https://api.smarterweather.com}/v1/weather?lat=39.74&lon=-104.99" \
  -H "Authorization: Bearer $SMARTERWEATHER_API_KEY" |
  jq -r '"\(.current.temperature)°F, \(.current.conditions)", "Sources: \(.attribution.sources | join(", "))"'
```

## Run it

Needs bash, curl 7.76 or later and [jq](https://jqlang.org/).

```bash
export SMARTERWEATHER_API_KEY=...   # or edit the placeholder in weather.sh
./weather.sh
```

```text
58.4°F, Partly Cloudy
Sources: NOAA NBM, HRRR, RTMA, MRMS, NWS, JPL Ephemeris
```

Drop the `| jq ...` line to see the whole response. Without a valid key the
API answers 401 with a problem body whose `next_steps` says where to get one.

- Route: [`GET /v1/weather`](https://developers.smarterweather.com/api/weather/)
- Test: [`test.json`](./test.json), run by [`../../../_harness`](../../../_harness/)
- License: code [MIT](../../../../LICENSE), prose [CC BY 4.0](../../../../LICENSE-docs)
