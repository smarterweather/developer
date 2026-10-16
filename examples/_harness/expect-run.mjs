#!/usr/bin/env node
// Runs one example against the mock, through record-proxy.mjs, and checks:
//   1. with a key: the example exits 0, prints what test.json expects, and
//      sent exactly the requests test.json lists (method, path, query) with
//      an `Authorization: Bearer` header, each answered 2xx;
//   2. through /_noauth (the proxy drops the header): the mock answers 401
//      and the example exits non-zero and says 401.
// Run from an example directory: node ../../../_harness/expect-run.mjs
import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const spec = JSON.parse(readFileSync(process.argv[2] ?? "test.json", "utf8"));
const base = process.env.SMARTERWEATHER_API_BASE;
const log = process.env.SMARTERWEATHER_CI_LOG;
ok(base && log, "SMARTERWEATHER_API_BASE and SMARTERWEATHER_CI_LOG must be set; run through with-mock.sh");

const logLines = () =>
  existsSync(log) ? readFileSync(log, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line)) : [];

function run(apiBase) {
  const before = logLines().length;
  const [command, ...args] = spec.run;
  const result = spawnSync(command, args, {
    encoding: "utf8",
    env: { ...process.env, SMARTERWEATHER_API_BASE: apiBase },
    timeout: 120_000,
  });
  if (result.error) throw result.error;
  return { ...result, requests: logLines().slice(before) };
}

function show(label, result) {
  return `${label}\n--- stdout\n${result.stdout}--- stderr\n${result.stderr}`;
}

const good = run(base);
strictEqual(good.status, 0, show(`${spec.run.join(" ")} exited ${good.status}`, good));
for (const pattern of spec.stdout) {
  ok(new RegExp(pattern, "m").test(good.stdout), show(`stdout does not match /${pattern}/m`, good));
}
strictEqual(good.requests.length, spec.requests.length, `expected ${spec.requests.length} request(s), saw ${JSON.stringify(good.requests)}`);
spec.requests.forEach((want, i) => {
  const got = good.requests[i];
  deepStrictEqual({ method: got.method, path: got.path, query: got.query }, want, `request ${i + 1}`);
  ok(got.bearer, `request ${i + 1} has no Authorization: Bearer header`);
  ok(got.status >= 200 && got.status < 300, `request ${i + 1} got ${got.status} from the mock`);
});

const denied = run(`${base.replace(/\/$/, "")}/_noauth`);
ok(denied.status !== 0, show("the example exited 0 on a 401", denied));
ok(denied.requests.length >= 1 && denied.requests[0].stripped, "the negative run sent no request through /_noauth");
strictEqual(denied.requests[0].status, 401, "the mock did not answer 401 without the Authorization header");
ok(/401/.test(denied.stdout + denied.stderr), show("the example did not report the 401", denied));

console.log(`ok ${spec.run.join(" ")}: ${spec.requests.map((r) => `${r.method} ${r.path}`).join(", ")} with a bearer; 401 without`);
