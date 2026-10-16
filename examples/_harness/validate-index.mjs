#!/usr/bin/env node
// Checks examples/index.json and the tree it describes. Behaviour comes from
// the data (kind, test, the directory layout), never from surface or language
// names, so a new surface or language needs no change here:
// - the index matches index.schema.json and is unique on (id, surface, language);
// - entries sharing an id share a title (the portal renders one page per id);
// - each dir sits under its surface, has a README.md, and every example dir
//   with a README.md is in the index (a top-level dir is a surface and may
//   have its own README);
// - `kind: code` entries carry the placeholder key constant;
// - relative links in every README resolve, and every JSON file parses.
import Ajv2020 from "ajv/dist/2020.js";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const examples = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PLACEHOLDER = "YOUR_SMARTERWEATHER_API_KEY";
const SKIP = new Set(["node_modules", "__pycache__", ".venv", ".next"]);
const errors = [];

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const index = readJson(join(examples, "index.json"));
const schema = readJson(join(examples, "index.schema.json"));

const ajv = new Ajv2020({ allErrors: true });
if (!ajv.validate(schema, index)) {
  for (const e of ajv.errors) errors.push(`index.json${e.instancePath}: ${e.message}`);
}
const entries = Array.isArray(index.examples) ? index.examples : [];

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else yield full;
  }
}
const files = [...walk(examples)].map((f) => relative(examples, f));

const seen = new Set();
const titles = new Map();
for (const entry of entries) {
  const key = `${entry.id}/${entry.surface}/${entry.language}`;
  if (seen.has(key)) errors.push(`index.json: duplicate (id, surface, language) ${key}`);
  seen.add(key);

  if (!titles.has(entry.id)) titles.set(entry.id, entry.title);
  else if (titles.get(entry.id) !== entry.title) errors.push(`index.json: ${key} title differs from other ${entry.id} entries`);

  if (!entry.dir?.startsWith(`${entry.surface}/`)) errors.push(`index.json: ${key} dir ${entry.dir} is not under ${entry.surface}/`);
  if (!existsSync(join(examples, entry.dir ?? "", "README.md"))) errors.push(`${entry.dir}: missing README.md`);

  if (entry.kind === "code") {
    const own = files.filter((f) => f.startsWith(`${entry.dir}/`) && !f.endsWith(".md"));
    if (!own.some((f) => readFileSync(join(examples, f), "utf8").includes(PLACEHOLDER))) {
      errors.push(`${entry.dir}: kind code, but no file carries the placeholder key constant ${PLACEHOLDER}`);
    }
  }
}

const indexed = new Set(entries.map((e) => e.dir));
for (const f of files.filter((f) => f.endsWith("README.md"))) {
  const dir = dirname(f);
  if (dir === "." || !dir.includes("/") || dir.startsWith("_harness")) continue;
  if (!indexed.has(dir)) errors.push(`${dir}: has a README.md but no index.json entry`);
}

for (const f of files.filter((f) => f.endsWith(".md"))) {
  const text = readFileSync(join(examples, f), "utf8");
  for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const path = target.split("#")[0];
    if (!existsSync(resolve(examples, dirname(f), path))) errors.push(`${f}: broken link ${target}`);
  }
}

for (const f of files.filter((f) => f.endsWith(".json"))) {
  try {
    readJson(join(examples, f));
  } catch (err) {
    errors.push(`${f}: ${err.message}`);
  }
}

if (errors.length > 0) {
  console.error(`examples: ${errors.length} problem(s)\n${errors.map((e) => `  ${e}`).join("\n")}`);
  process.exit(1);
}
console.log(`examples: index.json v${index.version} valid (${entries.length} entries, ${titles.size} ids), READMEs and JSON files check out`);
