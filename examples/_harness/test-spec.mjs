// The shape of an example's test.json, checked by validate-index.mjs (for
// every example) and by expect-run.mjs (before it runs one):
//   run       command and arguments, e.g. ["node", "weather.mjs"]
//   requests  [{method, path, query}] the example must send, in order
//   stdout    patterns its output must match with the env key
//   fixtures  optional [{body, stdout}]: body is a JSON file under examples/,
//             relative to the test.json, that record-proxy.mjs serves as a
//             200; stdout is what the example must then print
import { existsSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const EXAMPLES = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const isStrings = (v) => Array.isArray(v) && v.length > 0 && v.every((s) => typeof s === "string" && s.length > 0);
const isPatterns = (v) => isStrings(v) && v.every((p) => { try { new RegExp(p); return true; } catch { return false; } });

/** Problems with the test.json at path (already parsed as spec), as strings. */
export function checkTestSpec(spec, path) {
  const errors = [];
  const at = relative(EXAMPLES, path);
  if (!isStrings(spec?.run)) errors.push(`${at}: run must be a non-empty array of strings`);
  if (!Array.isArray(spec?.requests) || spec.requests.length === 0) errors.push(`${at}: requests must be a non-empty array`);
  else spec.requests.forEach((r, i) => {
    if (typeof r?.method !== "string" || typeof r?.path !== "string" || typeof r?.query !== "object" || r.query === null) {
      errors.push(`${at}: requests[${i}] needs method, path and query`);
    }
  });
  if (!isPatterns(spec?.stdout)) errors.push(`${at}: stdout must be a non-empty array of regular expressions`);
  if (spec?.fixtures !== undefined) {
    if (!Array.isArray(spec.fixtures) || spec.fixtures.length === 0) errors.push(`${at}: fixtures, when present, must be a non-empty array`);
    else spec.fixtures.forEach((f, i) => {
      const body = typeof f?.body === "string" ? fixturePath(path, f.body) : null;
      if (!body) errors.push(`${at}: fixtures[${i}].body must be a path to a .json file under examples/`);
      else if (!existsSync(join(EXAMPLES, body))) errors.push(`${at}: fixtures[${i}].body ${f.body} does not exist`);
      if (!isPatterns(f?.stdout)) errors.push(`${at}: fixtures[${i}].stdout must be a non-empty array of regular expressions`);
    });
  }
  return errors;
}

/** path (absolute, or relative to examples/) as a path relative to examples/,
 * or null unless it is a .json file inside examples/. */
export function jsonInsideExamples(path) {
  const rel = relative(EXAMPLES, resolve(EXAMPLES, path));
  return rel.startsWith("..") || isAbsolute(rel) || !rel.endsWith(".json") ? null : rel;
}

/** A fixture body, given relative to its test.json, as a path relative to examples/ (or null). */
export function fixturePath(testJson, body) {
  return jsonInsideExamples(resolve(dirname(testJson), body));
}
