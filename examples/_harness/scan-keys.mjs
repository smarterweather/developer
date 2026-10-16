#!/usr/bin/env node
// Fails if any file in the repository looks like it holds a real Smarter
// Weather key. The prefixes mirror the API's own parser: sw_live_, sw_test_,
// sw_trial_ and sw_internal_<audience>_ (audience: lowercase letters, digits
// and hyphens, up to 32), each followed by 8+ base64url characters. The
// placeholder YOUR_SMARTERWEATHER_API_KEY never matches, and short display
// prefixes such as `sw_live_a1b2` pass.
// Usage: node scan-keys.mjs [root]   (default: the repository root)
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const KEY_PATTERN = /sw_(?:live|test|trial|internal_[a-z0-9-]{1,32})_[A-Za-z0-9_-]{8,}/;

const SKIP_DIRS = new Set([".git", "node_modules", "dist", "build", "out", ".next", "coverage", ".venv", "__pycache__", ".cache"]);
const SKIP_FILES = new Set(["package-lock.json"]);
const SKIP_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip", ".tgz", ".gz", ".woff", ".woff2", ".ttf"]);
const MAX_BYTES = 5 * 1024 * 1024;

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) yield* walk(full);
    } else if (e.isFile() && !SKIP_FILES.has(e.name) && !SKIP_EXTS.has(extname(e.name).toLowerCase())) {
      yield full;
    }
  }
}

/** Returns [{file, line}] for every line under root that looks like a key. */
export function scan(root) {
  const hits = [];
  let files = 0;
  for (const file of walk(root)) {
    if (statSync(file).size > MAX_BYTES) continue;
    files += 1;
    readFileSync(file, "utf8")
      .split("\n")
      .forEach((text, i) => {
        if (KEY_PATTERN.test(text)) hits.push({ file: relative(root, file), line: i + 1 });
      });
  }
  return { files, hits };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), "..", ".."));
  const { files, hits } = scan(root);
  if (hits.length > 0) {
    console.error(`scan-keys: key-shaped string(s) at\n${hits.map((h) => `  ${h.file}:${h.line}`).join("\n")}`);
    console.error("Use the placeholder YOUR_SMARTERWEATHER_API_KEY and read SMARTERWEATHER_API_KEY from the environment.");
    process.exit(1);
  }
  console.log(`scan-keys: ${files} files, no key-shaped strings`);
}
