#!/usr/bin/env node
// Runs the `test` command of every examples/index.json entry that has one,
// in that entry's directory. Pass a language to run only those entries:
//   ./with-mock.sh node run-all.mjs [language]
// When a selected entry is Python and neither CI nor an active venv provides
// one, it creates _harness/.venv (uv when installed, else python3 -m venv)
// and puts it first on PATH, so requirements never land in the system Python.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const examples = join(here, "..");

export function selectEntries(index, only) {
  return index.examples.filter((entry) => entry.test && (!only || entry.language === only));
}

/** True when the selection runs Python and nothing else provides an environment for it. */
export function needsVenv(entries, env) {
  return entries.some((entry) => entry.language === "python") && !env.GITHUB_ACTIONS && !env.VIRTUAL_ENV;
}

function ensureVenv(dir) {
  if (!existsSync(join(dir, "bin", "python3"))) {
    const hasUv = !spawnSync("uv", ["--version"], { stdio: "ignore" }).error;
    const [cmd, ...args] = hasUv ? ["uv", "venv", "--quiet", "--seed", dir] : ["python3", "-m", "venv", dir];
    const made = spawnSync(cmd, args, { stdio: "inherit" });
    if (made.status !== 0) throw new Error(`could not create ${dir} with ${cmd}`);
  }
  return { VIRTUAL_ENV: dir, PATH: `${join(dir, "bin")}${delimiter}${process.env.PATH}` };
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const entries = selectEntries(JSON.parse(readFileSync(join(examples, "index.json"), "utf8")), process.argv[2]);
  const env = { ...process.env, ...(needsVenv(entries, process.env) ? ensureVenv(join(here, ".venv")) : {}) };

  const failed = [];
  for (const entry of entries) {
    const name = `${entry.dir} (${entry.language})`;
    if (env.GITHUB_ACTIONS) console.log(`::group::${name}`);
    else console.log(`\n# ${name}`);
    const result = spawnSync("sh", ["-c", entry.test], { cwd: join(examples, entry.dir), stdio: "inherit", env });
    if (env.GITHUB_ACTIONS) console.log("::endgroup::");
    if (result.status !== 0) failed.push(name);
  }

  console.log(`\n${entries.length - failed.length}/${entries.length} examples passed`);
  if (entries.length === 0) process.exit(1);
  if (failed.length > 0) {
    console.error(`failed: ${failed.join(", ")}`);
    process.exit(1);
  }
}
