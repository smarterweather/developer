#!/usr/bin/env node
// Fails if any file git tracks (or has staged) looks like it holds a real
// Smarter Weather key or claim ticket. The prefixes mirror the API's own
// parser: sw_live_, sw_test_, sw_trial_, sw_internal_<audience>_ (audience:
// lowercase letters, digits and hyphens, up to 32) and claim tickets
// sw_claim_, each followed by 8+ base64url characters. The placeholder
// YOUR_SMARTERWEATHER_API_KEY never matches, and short display prefixes such
// as `sw_live_a1b2` pass. A line carrying the marker `log-scrubber-allow`
// (the monorepo's convention) is a documented placeholder and passes.
// Ignored files such as .env are never read. Binary files (a NUL byte in the
// first 8 KB) are skipped.
// Usage: node scan-keys.mjs [root]   (default: the repository root)
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const KEY_PATTERN = /sw_(?:live|test|trial|claim|internal_[a-z0-9-]{1,32})_[A-Za-z0-9_-]{8,}/;
export const ALLOW_MARKER = "log-scrubber-allow";

const isBinary = (buf) => buf.subarray(0, 8192).includes(0);

/** Returns {files, hits: [{file, line}], allowed} for the files git tracks under root. */
export function scan(root) {
  const listed = execFileSync("git", ["-C", root, "ls-files", "-z", "--cached"], { encoding: "utf8" })
    .split("\0")
    .filter(Boolean);
  const hits = [];
  let files = 0;
  let allowed = 0;
  for (const file of listed) {
    const path = join(root, file);
    if (!existsSync(path)) continue; // deleted in the work tree, not yet staged
    const buf = readFileSync(path);
    if (isBinary(buf)) continue;
    files += 1;
    buf
      .toString("utf8")
      .split("\n")
      .forEach((text, i) => {
        if (!KEY_PATTERN.test(text)) return;
        if (text.includes(ALLOW_MARKER)) allowed += 1;
        else hits.push({ file, line: i + 1 });
      });
  }
  return { files, hits, allowed };
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const root = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), "..", ".."));
  const { files, hits, allowed } = scan(root);
  if (hits.length > 0) {
    console.error(`scan-keys: key-shaped string(s) at\n${hits.map((h) => `  ${h.file}:${h.line}`).join("\n")}`);
    console.error(
      `Use the placeholder YOUR_SMARTERWEATHER_API_KEY and read SMARTERWEATHER_API_KEY from the environment. ` +
        `A documented, fake key-shaped example can carry '${ALLOW_MARKER}' on the same line.`,
    );
    process.exit(1);
  }
  console.log(`scan-keys: ${files} tracked text files, no key-shaped strings${allowed ? ` (${allowed} allowlisted)` : ""}`);
}
