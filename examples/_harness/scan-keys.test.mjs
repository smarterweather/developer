// node --test examples/_harness/
// Fixtures are built by concatenation so this file never holds a key-shaped
// literal itself (the repo-wide scan reads it too).
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { KEY_PATTERN, scan } from "./scan-keys.mjs";

const body = "Ab3_x-9Zq7Lm";
const key = (prefix) => `sw_${prefix}_${body}`;

test("matches every key format the API accepts", () => {
  for (const prefix of ["live", "test", "trial", "internal_" + "ops", "internal_" + "app-attest", "internal_" + "ios2"]) {
    assert.match(key(prefix), KEY_PATTERN, prefix);
    assert.match(`Authorization: Bearer ${key(prefix)}`, KEY_PATTERN, `${prefix} in a header`);
  }
});

test("passes the placeholder, display prefixes and prose", () => {
  for (const text of [
    "YOUR_SMARTERWEATHER_API_KEY",
    'const API_KEY = "YOUR_SMARTERWEATHER_API_KEY"; // insert your key here',
    "sw_" + "live_a1b2",
    "Authorization: Bearer sw_" + "live_*",
    "sw_" + "internal_<audience>_*",
    "sw_" + "prod_" + body,
  ]) {
    assert.doesNotMatch(text, KEY_PATTERN, text);
  }
});

test("scan reports the file and line of a key", () => {
  const dir = mkdtempSync(join(tmpdir(), "scan-keys-"));
  writeFileSync(join(dir, "ok.md"), "YOUR_SMARTERWEATHER_API_KEY\n");
  writeFileSync(join(dir, "leak.env"), `A=1\nSMARTERWEATHER_API_KEY=${key("trial")}\n`);
  const { hits } = scan(dir);
  assert.deepEqual(hits, [{ file: "leak.env", line: 2 }]);
});
