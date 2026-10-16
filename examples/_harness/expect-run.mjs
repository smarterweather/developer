#!/usr/bin/env node
// Runs one example four times against the mock, through record-proxy.mjs:
//   1. key from the environment: exits 0, prints what test.json expects, and
//      sends exactly the requests test.json lists (method, path, query) with
//      `Authorization: Bearer <the env key>`, each answered 2xx;
//   2. SMARTERWEATHER_API_KEY set but empty: treated as unset, so the
//      example falls back to its placeholder constant and still runs;
//   3. through /_noauth (the proxy drops the header): the mock answers 401,
//      the example exits non-zero and shows the problem's detail and its
//      recommended next step;
//   4. through /_502 (an HTML error page): the example exits non-zero and
//      shows the status and the start of the body, without a parse error.
// Run from an example directory: node ../../../_harness/expect-run.mjs
import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

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
ok(denied.output.includes("401"), show("did not show the 401 status", denied));
ok(denied.output.includes(problem.detail), show(`did not show the problem detail "${problem.detail}"`, denied));
if (hint) ok(denied.output.includes(hint), show(`did not show the recommended next step ${hint}`, denied));

// 4. A non-JSON error page.
const gateway = run({ SMARTERWEATHER_API_BASE: `${base}/_502` });
ok(gateway.status !== 0, show("exited 0 on a 502", gateway));
ok(/502/.test(gateway.output) && /Bad Gateway/.test(gateway.output), show("did not show the 502 status and body", gateway));
ok(!PARSE_ERRORS.test(gateway.output), show("tried to parse the HTML error page as JSON", gateway));

console.log(
  `ok ${name}: ${spec.requests.map((r) => `${r.method} ${r.path}`).join(", ")} with the env key; ` +
    "placeholder when the env var is empty; 401 problem shown; 502 page shown",
);
