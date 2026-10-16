// node --test examples/_harness/
// The rain-next-hour fixtures must be shapes the API can return. Their points
// are leads on one grid after nowcast.generated_at, up to 60 minutes; a lead
// may be missing (a null value keeps its place on the grid and is left out of
// points). interval_seconds is the grid step, the most common gap between
// lead times (here, between points). The summary is what the API's
// documented rule (openapi.yaml, NowcastSummary) gives for those points at
// the request time in meta.generated_at:
// - the onset is the first of two consecutive wet points; a missing lead is
//   not wet, so wet points either side of it are not consecutive;
// - the episode ends at two consecutive dry steps after the onset; a missing
//   lead counts as dry, including the leads after the last point up to the
//   window's end; one dry step does not end it;
// - ends_at is the last wet point's time plus the interval, and
//   duration_minutes runs from starts_at to it; both are omitted while the
//   episode runs to the end of the window;
// - already_occurring: starts_at is at or before the request time; omitted
//   otherwise;
// - peak_intensity covers the onset to the episode's end; type is the onset's;
// - with no onset the summary is just { type: "none", peak_intensity: "none" }.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { EXAMPLES } from "./test-spec.mjs";

const dir = join(EXAMPLES, "rest/_fixtures/rain-next-hour");
const RANK = { none: 0, light: 1, moderate: 2, heavy: 3 };
const at = (ms) => new Date(ms).toISOString().replace(".000Z", "Z");

// The most common gap between points (the smallest on a tie), else 5 minutes.
function intervalOf(times) {
  const gaps = times.slice(1).map((t, i) => t - times[i]).filter((gap) => gap > 0);
  const count = (g) => gaps.filter((x) => x === g).length;
  return gaps.length ? [...new Set(gaps)].sort((a, b) => count(b) - count(a) || a - b)[0] : 300_000;
}

function summarize(points, now, windowEnd) {
  const times = points.map((p) => Date.parse(p.time));
  const step = intervalOf(times);
  const missing = (a, b) => Math.max(Math.floor((b - a + step / 2) / step) - 1, 0);
  const wet = points.map((p) => p.intensity !== "none");
  const onset = wet.findIndex((w, i) => w && wet[i + 1] && missing(times[i], times[i + 1]) === 0);
  if (onset < 0) return { type: "none", peak_intensity: "none" };
  const summary = { starts_at: points[onset].time, type: points[onset].type, peak_intensity: points[onset].intensity };
  if (times[onset] <= now) summary.already_occurring = true;
  let last = onset;
  let ended = false;
  let dry = 0;
  for (let i = onset + 1; i < points.length && !ended; i++) {
    dry += missing(times[i - 1], times[i]);
    if (dry >= 2) ended = true;
    else if (wet[i]) {
      dry = 0;
      last = i;
      if (RANK[points[i].intensity] > RANK[summary.peak_intensity]) summary.peak_intensity = points[i].intensity;
    } else ended = ++dry >= 2;
  }
  if (!ended) ended = dry + missing(times.at(-1), windowEnd + step) >= 2; // the leads after the last point
  if (ended) {
    summary.ends_at = at(times[last] + step);
    summary.duration_minutes = (times[last] + step - times[onset]) / 60_000;
  }
  return summary;
}

for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  test(`${file} is a nowcast the API can return`, () => {
    const { nowcast, meta } = JSON.parse(readFileSync(join(dir, file), "utf8"));
    const times = nowcast.points.map((p) => Date.parse(p.time));
    const step = intervalOf(times);
    assert.equal(nowcast.interval_seconds * 1000, step, "interval_seconds is the most common gap between points");
    const leads = times.map((t) => (t - Date.parse(nowcast.generated_at)) / step);
    assert.ok(leads.every((n, i) => Number.isInteger(n) && n >= 1 && n * step <= 60 * 60_000 && (i === 0 || n > leads[i - 1])), `leads ${leads}`);
    assert.ok(meta?.generated_at, "meta.generated_at (the request time) is set");
    const windowEnd = Date.parse(nowcast.generated_at) + 60 * 60_000;
    assert.deepEqual(nowcast.summary, summarize(nowcast.points, Date.parse(meta.generated_at), windowEnd));
  });
}
