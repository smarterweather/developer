// node --test examples/_harness/
// Fixtures are built by concatenation so this file never holds a key-shaped
// literal itself (the repo-wide scan reads it too).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { ALLOW_MARKER, KEY_PATTERN, scan } from "./scan-keys.mjs";

const body = "Ab3_x-9Zq7Lm";
const key = (prefix) => `sw_${prefix}_${body}`;

test("matches every key and claim-ticket format the API accepts", () => {
  for (const prefix of ["live", "test", "trial", "claim", "internal_" + "ops", "internal_" + "app-attest", "internal_" + "ios2"]) {
    assert.match(key(prefix), KEY_PATTERN, prefix);
    assert.match(`Authorization: Bearer ${key(prefix)}`, KEY_PATTERN, `${prefix} in a header`);
  }
});

test("passes the placeholder, display prefixes and prose", () => {
  for (const text of [
    "YOUR_SMARTERWEATHER_API_KEY",
    'const API_KEY = "YOUR_SMARTERWEATHER_API_KEY"; // insert your key here',
    "sw_" + "live_a1b2",
    "sw_" + "claim_*",
    "Authorization: Bearer sw_" + "live_*",
    "sw_" + "internal_<audience>_*",
    "sw_" + "prod_" + body,
  ]) {
    assert.doesNotMatch(text, KEY_PATTERN, text);
  }
});

function repo(files, { stage = Object.keys(files) } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "scan-keys-"));
  execFileSync("git", ["init", "-q", dir]);
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(join(dir, name, ".."), { recursive: true });
    writeFileSync(join(dir, name), content);
  }
  if (stage.length > 0) execFileSync("git", ["-C", dir, "add", "--", ...stage]);
  return dir;
}

test("reports the file and line of a key in a tracked file", () => {
  const dir = repo({ "ok.md": "YOUR_SMARTERWEATHER_API_KEY\n", "src/leak.js": `const a = 1;\nconst k = "${key("trial")}";\n` });
  assert.deepEqual(scan(dir).hits, [{ file: "src/leak.js", line: 2 }]);
});

test("reads only what git tracks: an ignored .env and an untracked file are skipped", () => {
  const dir = repo(
    { ".gitignore": ".env\n", ".env": `SMARTERWEATHER_API_KEY=${key("live")}\n`, "scratch.txt": key("test") },
    { stage: [".gitignore"] },
  );
  const result = scan(dir);
  assert.deepEqual(result.hits, []);
  assert.equal(result.files, 1);
});

test("skips binary files", () => {
  const dir = repo({ "logo.bin": Buffer.concat([Buffer.from([0, 1, 2]), Buffer.from(key("live"))]) });
  assert.deepEqual(scan(dir).hits, []);
});

test("the allow marker passes a documented fake on the same line only", () => {
  const dir = repo({
    "docs.md": `Example: ${key("claim")} <!-- ${ALLOW_MARKER} -->\n${key("claim")}\n`,
  });
  const result = scan(dir);
  assert.deepEqual(result.hits, [{ file: "docs.md", line: 2 }]);
  assert.equal(result.allowed, 1);
});
