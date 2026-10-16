# Fixtures

Response bodies the harness serves through
[`record-proxy.mjs`](../../_harness/record-proxy.mjs) (`/_fixture/<file>`)
for answers the mock's one example body cannot give. An example's `test.json`
lists them under `fixtures`, with the output each must produce (see
[`test-spec.mjs`](../../_harness/test-spec.mjs)). They are generated in
the API's response shape, not recorded, and keep only the sections the
examples read.

## rain-next-hour

Each fixture is a nowcast the API can return, with the request time in
`meta.generated_at`. The radar frame is 22:15Z (3:15 PM in Seattle), the
12 five-minute leads run from 22:20Z to 23:15Z, and the request is at
22:21:40Z, except where noted. The summary follows the API's documented rule
(`NowcastSummary` in `openapi.yaml`):

- `starts_at` is the first of two consecutive wet points, and `type` is that
  point's type (`unknown` for an unrecognized radar code).
- A missing lead is not wet: wet points on either side of it are not
  consecutive, and it counts as dry toward the end, including the leads after
  the last point up to the window's end (`generated_at` + 60 minutes).
- The episode ends at two consecutive dry steps; one does not end it.
  `ends_at` is the last wet point's time plus `interval_seconds` (the most
  common gap between points), and `duration_minutes` runs from `starts_at`
  to it. Both are omitted while it runs to the end of the window.
- `already_occurring` is `true` when `starts_at` is at or before the request
  time. Otherwise it is omitted.
- `peak_intensity` covers the onset to the episode's end; a later episode
  does not count.
- With no onset the summary is just `{"type": "none", "peak_intensity": "none"}`.

[`nowcast-fixtures.test.mjs`](../../_harness/nowcast-fixtures.test.mjs)
checks every fixture against that rule.

| File | Points | Answer |
| --- | --- | --- |
| `no-rain.json` | all dry | No rain expected in the next 60 minutes. |
| `rain-starting.json` | light rain 22:40Z-23:05Z | Light rain starting around 3:40 PM, ending around 4:10 PM. |
| `wet-then-onset.json` | one wet point at 22:20Z, two dry, light rain 22:35Z-22:55Z | Light rain starting around 3:35 PM, ending around 4:00 PM. |
| `heavy-rain-arriving.json` | heavy rain from 23:00Z to the end | Heavy rain starting around 4:00 PM. |
| `mix-all-hour.json` | moderate wintry mix on every point | Moderate wintry mix now. |
| `snow-ending.json` | light snow 22:20Z-22:45Z | Light snow now, ending around 3:50 PM. |
| `no-timezone.json` | as `rain-starting.json`, with `location.timezone` empty | the same, in the machine's time zone |
| `one-dry-gap.json` | light rain 22:20Z-22:35Z, one dry point, light rain 22:45Z-22:55Z, two dry, heavy rain 23:10Z-23:15Z | Light rain now, ending around 4:00 PM. |
| `request-before-first-point.json` | light rain 22:20Z-22:45Z; request at 22:17Z | Light rain starting around 3:20 PM, ending around 3:50 PM. |
| `dropped-points.json` | wet 22:20Z, 22:25Z missing, light rain 22:30Z-22:40Z, 22:45Z missing, dry, heavy rain 22:55Z-23:00Z | Light rain starting around 3:30 PM, ending around 3:45 PM. |
| `unknown-type.json` | `unknown` type, moderate, 22:35Z-22:50Z | Moderate precipitation starting around 3:35 PM, ending around 3:55 PM. |
| `started-after-first-point.json` | dry 22:20Z, light rain 22:25Z-22:45Z; request at 22:27Z | Light rain now, ending around 3:50 PM. |
| `trailing-missing.json` | light rain 22:50Z-23:05Z, then the 23:10Z and 23:15Z leads missing | Light rain starting around 3:50 PM, ending around 4:10 PM. |
| `boston-reference.json` | the API's `WeatherNowcastRain` example, verbatim (Boston; frame 15:00Z, request 15:06:40Z) | Heavy rain now, ending around 11:35 AM. |
