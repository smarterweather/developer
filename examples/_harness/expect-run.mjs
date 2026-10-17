#!/usr/bin/env node
// Runs one example five times against the mock, plus once per fixture, all
// through record-proxy.mjs:
//   1. key from the environment: exits 0, prints what test.json expects, and
//      sends exactly the requests test.json lists (method, path, query) with
//      `Authorization: Bearer <the env key>`, each answered 2xx;
//   2. SMARTERWEATHER_API_KEY set but empty: treated as unset, so the
//      example falls back to its placeholder constant and still runs;
//   3. through /_noauth (the proxy drops the header): the mock answers 401,
//      the example exits non-zero, and a line starting `401: ` shows the
//      problem's detail, followed by its recommended next step;
//   4. through /_502 (an HTML error page) and
//   5. through /_504json (JSON that is not a problem): the example exits
//      non-zero and a line starting `<status>: ` shows the start of the body,
//      without a parse error;
//   6. once per entry in test.json's optional `fixtures`, through
//      /_fixture/<file> (the proxy answers 200 with that JSON file): exits 0,
//      prints what the entry's `stdout` expects, and sends the same requests
//      as run 1, with the env key. Fixtures give answers the mock's one
//      example body cannot (see test-spec.mjs for the shape).
// Run from an example directory: node ../../../_harness/expect-run.mjs
import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { checkTestSpec, fixturePath } from "./test-spec.mjs";

const specPath = resolve(process.argv[2] ?? "test.json");
const spec = JSON.parse(readFileSync(specPath, "utf8"));
const specErrors = checkTestSpec(spec, specPath);
ok(specErrors.length === 0, `invalid test.json:\n  ${specErrors.join("\n  ")}`);
const base = process.env.SMARTERWEATHER_API_BASE?.replace(/\/$/, "");
const log = process.env.SMARTERWEATHER_CI_LOG;
ok(base && log && process.env.SMARTERWEATHER_API_KEY, "run through with-mock.sh (it sets the base, the log and a fake key)");
const name = spec.run.join(" ");
const PARSE_ERRORS = /SyntaxError|Traceback|JSONDecodeError|invalid character|parse error/;

const logLines = () =>
  existsSync(log) ? readFileSync(log, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line)) : [];

function run(env) {
  const before = logLines().length;
  const [command, ...args] = spec.run;
  const result = spawnSync(command, args, { encoding: "utf8", env: { ...process.env, ...env }, timeout: 120_000 });
  if (result.error) throw result.error;
  return { ...result, output: result.stdout + result.stderr, requests: logLines().slice(before) };
}

const show = (label, r) => `${name}: ${label}\n--- stdout\n${r.stdout}--- stderr\n${r.stderr}`;
const is2xx = (status) => status >= 200 && status < 300;

// Exit 0, the expected output, and exactly the listed requests with the env key.
function expectSuccess(r, patterns, label) {
  strictEqual(r.status, 0, show(`${label}exited ${r.status}`, r));
  for (const pattern of patterns) ok(new RegExp(pattern, "m").test(r.stdout), show(`${label}stdout does not match /${pattern}/m`, r));
  strictEqual(r.requests.length, spec.requests.length, `${name}: ${label}expected ${spec.requests.length} request(s), saw ${JSON.stringify(r.requests)}`);
  spec.requests.forEach((want, i) => {
    const got = r.requests[i];
    deepStrictEqual({ method: got.method, path: got.path, query: got.query }, want, `${name}: ${label}request ${i + 1}`);
    ok(got.bearer, `${name}: ${label}request ${i + 1} has no Authorization: Bearer header`);
    ok(got.token_matches_env, `${name}: ${label}request ${i + 1} did not send SMARTERWEATHER_API_KEY from the environment`);
    ok(is2xx(got.status), `${name}: ${label}request ${i + 1} got ${got.status}`);
  });
}

// 1. The env key.
expectSuccess(run({}), spec.stdout, "");

// 2. An empty env var counts as unset.
const empty = run({ SMARTERWEATHER_API_KEY: "" });
strictEqual(empty.status, 0, show("exited non-zero with SMARTERWEATHER_API_KEY empty", empty));
ok(empty.requests.length >= 1, `${name}: no request with SMARTERWEATHER_API_KEY empty`);
ok(empty.requests[0].token_is_placeholder, `${name}: with SMARTERWEATHER_API_KEY empty, the bearer was not the placeholder constant`);

// 3. No Authorization header: the mock's 401 problem must reach the user.
const first = spec.requests[0];
const problemUrl = `${base}/_noauth${first.path}?${new URLSearchParams(first.query)}`;
const problem = await (await fetch(problemUrl, { method: first.method })).json();
const hint = problem.next_steps?.[problem.next_steps?.recommended]?.href;
const denied = run({ SMARTERWEATHER_API_BASE: `${base}/_noauth` });
ok(denied.status !== 0, show("exited 0 on a 401", denied));
strictEqual(denied.requests.at(-1)?.status, 401, `${name}: the mock did not answer 401 without the Authorization header`);
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
ok(new RegExp(`^401: ${escape(problem.detail)}$`, "m").test(denied.output), show(`no line "401: ${problem.detail}"`, denied));
if (hint) ok(denied.output.includes(hint), show(`did not show the recommended next step ${hint}`, denied));

// 4 and 5. Error bodies that are not problems.
for (const [route, status, text] of [
  ["/_502", 502, "502 Bad Gateway"],
  ["/_504json", 504, '{"message":"Endpoint request timed out"}'],
]) {
  const r = run({ SMARTERWEATHER_API_BASE: `${base}${route}` });
  ok(r.status !== 0, show(`exited 0 on a ${status}`, r));
  ok(new RegExp(`^${status}: .*${escape(text)}`, "m").test(r.output), show(`no line "${status}: ...${text}..."`, r));
  ok(!PARSE_ERRORS.test(r.output), show(`tried to parse the ${status} body as a problem`, r));
}

// 6. Fixtures, served by the proxy.
const fixtures = spec.fixtures ?? [];
for (const fixture of fixtures) {
  const file = fixturePath(specPath, fixture.body);
  const r = run({ SMARTERWEATHER_API_BASE: `${base}/_fixture/${encodeURIComponent(file)}` });
  expectSuccess(r, fixture.stdout, `${fixture.body}: `);
}

console.log(
  `ok ${name}: ${spec.requests.map((r) => `${r.method} ${r.path}`).join(", ")} with the env key; ` +
    "placeholder when the env var is empty; 401 problem shown; 502 HTML and 504 JSON bodies shown" +
    (fixtures.length ? `; ${fixtures.length} fixture bodies answered` : ""),
);
