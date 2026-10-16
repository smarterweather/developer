#!/usr/bin/env node
// Runs one example five times against the mock, through record-proxy.mjs:
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
//      without a parse error.
// Then, for each entry in test.json's optional `fixtures`, it serves that
// canned 200 body (a path relative to the example) from a local server and
// checks the example exits 0 and prints what the entry's `stdout` expects.
// Fixtures cover answers the mock's one example body cannot produce.
// Run from an example directory: node ../../../_harness/expect-run.mjs
import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import http from "node:http";

const spec = JSON.parse(readFileSync(process.argv[2] ?? "test.json", "utf8"));
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

// 1. The env key.
const good = run({});
strictEqual(good.status, 0, show(`exited ${good.status}`, good));
for (const pattern of spec.stdout) ok(new RegExp(pattern, "m").test(good.stdout), show(`stdout does not match /${pattern}/m`, good));
strictEqual(good.requests.length, spec.requests.length, `${name}: expected ${spec.requests.length} request(s), saw ${JSON.stringify(good.requests)}`);
spec.requests.forEach((want, i) => {
  const got = good.requests[i];
  deepStrictEqual({ method: got.method, path: got.path, query: got.query }, want, `${name}: request ${i + 1}`);
  ok(got.bearer, `${name}: request ${i + 1} has no Authorization: Bearer header`);
  ok(got.token_matches_env, `${name}: request ${i + 1} did not send SMARTERWEATHER_API_KEY from the environment`);
  ok(is2xx(got.status), `${name}: request ${i + 1} got ${got.status} from the mock`);
});

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

// 6. Fixture bodies. The example runs while this process serves the body, so
// it is spawned asynchronously.
function runAsync(env) {
  const [command, ...args] = spec.run;
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env: { ...process.env, ...env }, timeout: 120_000 });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (d) => (stdout += d));
    child.stderr.setEncoding("utf8").on("data", (d) => (stderr += d));
    child.on("error", reject);
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
}

const fixtures = spec.fixtures ?? [];
for (const fixture of fixtures) {
  const body = readFileSync(fixture.body);
  const server = http.createServer((req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(body);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const r = await runAsync({ SMARTERWEATHER_API_BASE: `http://127.0.0.1:${server.address().port}` });
  server.close();
  strictEqual(r.status, 0, show(`exited ${r.status} on ${fixture.body}`, r));
  for (const pattern of fixture.stdout) {
    ok(new RegExp(pattern, "m").test(r.stdout), show(`${fixture.body}: stdout does not match /${pattern}/m`, r));
  }
}

console.log(
  `ok ${name}: ${spec.requests.map((r) => `${r.method} ${r.path}`).join(", ")} with the env key; ` +
    "placeholder when the env var is empty; 401 problem shown; 502 HTML and 504 JSON bodies shown" +
    (fixtures.length ? `; ${fixtures.length} fixture bodies answered` : ""),
);
