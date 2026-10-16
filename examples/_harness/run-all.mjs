#!/usr/bin/env node
// Runs the `test` command of every examples/index.json entry that has one,
// in that entry's directory. Pass a language to run only those entries:
//   ./with-mock.sh node run-all.mjs [language]
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const examples = join(dirname(fileURLToPath(import.meta.url)), "..");
const only = process.argv[2];
const entries = JSON.parse(readFileSync(join(examples, "index.json"), "utf8")).filter(
  (entry) => entry.test && (!only || entry.language === only),
);

const failed = [];
for (const entry of entries) {
  const name = `${entry.dir} (${entry.language})`;
  if (process.env.GITHUB_ACTIONS) console.log(`::group::${name}`);
  else console.log(`\n# ${name}`);
  const result = spawnSync("sh", ["-c", entry.test], { cwd: join(examples, entry.dir), stdio: "inherit" });
  if (process.env.GITHUB_ACTIONS) console.log("::endgroup::");
  if (result.status !== 0) failed.push(name);
}

console.log(`\n${entries.length - failed.length}/${entries.length} examples passed`);
if (entries.length === 0) process.exit(1);
if (failed.length > 0) {
  console.error(`failed: ${failed.join(", ")}`);
  process.exit(1);
}
