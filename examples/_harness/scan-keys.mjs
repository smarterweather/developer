#!/usr/bin/env node
// Fails if anything under examples/ looks like a real Smarter Weather key:
// sw_live_, sw_test_ or sw_internal_<surface>_ followed by 8+ key characters.
// Examples use the placeholder YOUR_SMARTERWEATHER_API_KEY, which never
// matches. Short display prefixes such as `sw_live_a1b2` pass.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PATTERN = /sw_(live|test|internal_[a-z]+)_[A-Za-z0-9_-]{8,}/;
const SKIP_DIRS = new Set(["node_modules", ".git", "__pycache__", ".venv", ".next", "dist"]);
const SKIP_FILES = new Set(["package-lock.json"]);
const SELF = fileURLToPath(import.meta.url);
const root = resolve(dirname(SELF), "..");

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory() && !SKIP_DIRS.has(e.name)) yield* walk(full);
    else if (e.isFile() && !SKIP_FILES.has(e.name) && full !== SELF) yield full;
  }
}

const hits = [];
let scanned = 0;
for (const file of walk(root)) {
  if (statSync(file).size > 5 * 1024 * 1024) continue;
  scanned += 1;
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      if (PATTERN.test(line)) hits.push(`${relative(root, file)}:${i + 1}`);
    });
}

if (hits.length > 0) {
  console.error(`scan-keys: key-shaped string(s) at\n${hits.map((h) => `  examples/${h}`).join("\n")}`);
  console.error("Use the placeholder YOUR_SMARTERWEATHER_API_KEY and read SMARTERWEATHER_API_KEY from the environment.");
  process.exit(1);
}
console.log(`scan-keys: ${scanned} files under examples/, no key-shaped strings`);
