// node --test examples/_harness/
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { needsVenv, selectEntries } from "./run-all.mjs";

const index = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "index.json"), "utf8"));

test("selects entries with a test, optionally one language", () => {
  assert.ok(selectEntries(index).every((e) => e.test));
  assert.deepEqual(new Set(selectEntries(index, "go").map((e) => e.language)), new Set(["go"]));
});

test("a venv is made only for a Python selection outside CI and outside an active venv", () => {
  assert.equal(needsVenv(selectEntries(index, "javascript"), {}), false);
  assert.equal(needsVenv(selectEntries(index, "json"), {}), false);
  assert.equal(needsVenv(selectEntries(index, "python"), {}), true);
  assert.equal(needsVenv(selectEntries(index), {}), true);
  assert.equal(needsVenv(selectEntries(index), { GITHUB_ACTIONS: "true" }), false);
  assert.equal(needsVenv(selectEntries(index), { VIRTUAL_ENV: "/tmp/venv" }), false);
});
