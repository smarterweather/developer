// node --test examples/_harness/
import assert from "node:assert/strict";
import { join } from "node:path";
import { test } from "node:test";
import { checkTestSpec, EXAMPLES, fixturePath } from "./test-spec.mjs";

const at = join(EXAMPLES, "rest/python/rain-next-hour/test.json");
const good = { run: ["python3", "rain.py"], requests: [{ method: "GET", path: "/v1/weather", query: {} }], stdout: ["^ok$"] };

test("a fixture needs an existing .json body under examples/ and stdout patterns", () => {
  const body = "../../_fixtures/rain-next-hour/no-rain.json";
  assert.deepEqual(checkTestSpec({ ...good, fixtures: [{ body, stdout: ["^No rain"] }] }, at), []);
  assert.match(checkTestSpec({ ...good, fixtures: [{ body }] }, at).join(), /fixtures\[0\]\.stdout must be/);
  assert.match(checkTestSpec({ ...good, fixtures: [{ body: "missing.json", stdout: ["x"] }] }, at).join(), /does not exist/);
  assert.match(checkTestSpec({ ...good, fixtures: [{ body: "../../../../package.json", stdout: ["x"] }] }, at).join(), /under examples/);
  assert.match(checkTestSpec({ ...good, fixtures: [] }, at).join(), /non-empty array/);
  assert.equal(fixturePath(at, body), "rest/_fixtures/rain-next-hour/no-rain.json");
});

test("run, requests and stdout are required", () => {
  const errors = checkTestSpec({ run: "python3 rain.py", requests: [{ path: "/v1/weather" }], stdout: ["("] }, at).join("\n");
  assert.match(errors, /run must be/);
  assert.match(errors, /requests\[0\] needs method, path and query/);
  assert.match(errors, /stdout must be/);
});
