# Fixtures

Response bodies the harness serves through
[`record-proxy.mjs`](../../_harness/record-proxy.mjs) (`/_fixture/<file>`)
for answers the mock's one example body cannot give. An example's `test.json`
lists them under `fixtures`, with the output each must produce (see
[`test-spec.mjs`](../../_harness/test-spec.mjs)). They are hand-written in
the API's response shape, not recordings, and keep only the fields the
examples read.

## rain-next-hour

Each `nowcast.summary` is what the API's summary rule gives for the
five-minute steps noted below. The radar frame (`generated_at`) is 22:15Z
(3:15 PM in Seattle), and the 13 steps run from 22:15Z to 23:15Z. The rule
works like this:

- `starts_at` is the first of two wet steps in a row.
- `ends_at` is the last wet step before two dry ones, and is absent if the
  event runs past the hour.
- `already_occurring` is set when the 22:15Z step is wet.

| File | Steps | Answer |
| --- | --- | --- |
| `no-rain.json` | all dry | No rain expected in the next 60 minutes. |
| `rain-starting.json` | light rain 22:40Z-23:05Z | Light rain starting around 3:40 PM, ending around 4:10 PM. |
| `heavy-rain-arriving.json` | heavy rain from 23:00Z | Heavy rain starting around 4:00 PM. |
| `mix-all-hour.json` | moderate wintry mix on every step | Moderate wintry mix now. |
| `snow-ending.json` | light snow 22:15Z-22:45Z | Light snow now, ending around 3:50 PM. |
| `wet-then-onset.json` | one wet step at 22:15Z, dry, then light rain 22:30Z-22:50Z | Light rain starting around 3:30 PM, ending around 3:55 PM. |
