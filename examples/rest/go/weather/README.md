# Current weather in one call (Go)

Calls `GET /v1/weather` for Denver, CO with `net/http` and prints the
temperature, the conditions and the data sources. Standard library only; the
struct decodes just the fields it prints.

```go
const apiKey = "YOUR_SMARTERWEATHER_API_KEY" // insert your key here
```

`SMARTERWEATHER_API_KEY` in the environment wins over the constant. The full
program is [`main.go`](./main.go).

## Run it

Needs Go 1.22 or later.

```bash
export SMARTERWEATHER_API_KEY=...   # or edit the placeholder in main.go
go run .
```

```text
58.4°F, Partly Cloudy
Sources: NOAA NBM, HRRR, RTMA, MRMS, NWS, JPL Ephemeris
```

Add fields to the struct (`Hourly`, `Daily`, `Alerts`) to read more of the
same response.

- Route: [`GET /v1/weather`](https://developers.smarterweather.com/api/weather/)
- Test: [`test.json`](./test.json), run by [`../../../_harness`](../../../_harness/)
- License: code [MIT](../../../../LICENSE), prose [CC BY 4.0](../../../../LICENSE-docs)
