# Fixtures

Response bodies the harness serves through
[`record-proxy.mjs`](../../_harness/record-proxy.mjs) (`/_fixture/<file>`)
for answers the mock's one example body cannot give. An example's `test.json`
lists them under `fixtures`, with the output each must produce (see
[`test-spec.mjs`](../../_harness/test-spec.mjs)). They are generated in
the API's response shape, not recorded, and keep only the sections the
examples read.

## rain-next-hour

Each fixture is a nowcast the API can return: 12 five-minute points from
`generated_at` + 5 minutes (the radar frame is 22:15Z, 3:15 PM in Seattle),
and a `summary` that follows the API's rule from those points:

- `starts_at` is the first of two wet steps in a row.
- `already_occurring` is true when that is the first step.
- `ends_at` is the end of the last wet step, set once two dry steps follow,
  and `null` (as is `duration_minutes`) while it continues past the hour.

[`nowcast-fixtures.test.mjs`](../../_harness/nowcast-fixtures.test.mjs)
checks every fixture against that rule.

| File | Points | Answer |
| --- | --- | --- |
| `no-rain.json` | all dry | No rain expected in the next 60 minutes. |
| `rain-starting.json` | light rain 22:40Z-23:05Z | Light rain starting around 3:40 PM, ending around 4:10 PM. |
| `wet-then-onset.json` | one wet step at 22:20Z, two dry, light rain 22:35Z-22:55Z | Light rain starting around 3:35 PM, ending around 4:00 PM. |
| `heavy-rain-arriving.json` | heavy rain from 23:00Z to the end | Heavy rain starting around 4:00 PM. |
| `mix-all-hour.json` | moderate wintry mix on every step | Moderate wintry mix now. |
| `snow-ending.json` | light snow 22:20Z-22:45Z | Light snow now, ending around 3:50 PM. |
| `no-timezone.json` | as `rain-starting.json`, with `location.timezone` empty | the same, in the machine's time zone |
