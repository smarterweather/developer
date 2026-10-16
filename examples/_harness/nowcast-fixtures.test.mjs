// node --test examples/_harness/
// The rain-next-hour fixtures must be shapes the API can return: 12
// five-minute points from generated_at + 5 min, and a summary that follows
// the API's rule from those points (onset: the first of two wet steps in a
// row; already_occurring: the onset is the first step; ends_at: the end of
// the last wet step, set only once two dry steps follow, else null).
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { EXAMPLES } from "./test-spec.mjs";

const dir = join(EXAMPLES, "rest/_fixtures/rain-next-hour");
const RANK = { none: 0, light: 1, moderate: 2, heavy: 3 };
const at = (ms) => new Date(ms).toISOString().replace(".000Z", "Z");

function summarize(points, step) {
  const wet = points.map((p) => p.intensity !== "none");
  const onset = wet.findIndex((w, i) => w && wet[i + 1]);
  if (onset < 0) return { type: "none", peak_intensity: "none", already_occurring: false };
  let peak = points[onset].intensity;
  let end = null;
  for (let i = onset, dry = 0; i < points.length; i++) {
    if (wet[i]) {
      dry = 0;
      if (RANK[points[i].intensity] > RANK[peak]) peak = points[i].intensity;
    } else if (++dry >= 2) {
      end = i - 2;
      break;
    }
  }
  const startsAt = points[onset].time;
  const endsAt = end === null ? null : at(Date.parse(points[end].time) + step);
  return {
    starts_at: startsAt,
    ends_at: endsAt,
    duration_minutes: endsAt && (Date.parse(endsAt) - Date.parse(startsAt)) / 60_000,
    type: points[onset].type,
    peak_intensity: peak,
    already_occurring: onset === 0,
  };
}

for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  test(`${file} is a nowcast the API can return`, () => {
    const { nowcast } = JSON.parse(readFileSync(join(dir, file), "utf8"));
    const step = nowcast.interval_seconds * 1000;
    assert.equal(nowcast.points.length, 12);
    nowcast.points.forEach((p, i) => assert.equal(p.time, at(Date.parse(nowcast.generated_at) + (i + 1) * step), `point ${i}`));
    assert.deepEqual(nowcast.summary, summarize(nowcast.points, step));
  });
}
