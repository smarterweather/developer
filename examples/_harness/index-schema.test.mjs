// node --test examples/_harness/
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

const examples = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => JSON.parse(readFileSync(join(examples, f), "utf8"));
const validate = new Ajv2020({ allErrors: true }).compile(read("index.schema.json"));
const index = read("index.json");
const entry = index.examples[0];

test("the committed index validates", () => {
  assert.ok(validate(index), JSON.stringify(validate.errors));
});

test("additive growth stays valid for version-1 readers", () => {
  const grown = {
    version: 1,
    generated_by: "a future tool",
    examples: [...index.examples, { ...entry, surface: "sdk", language: "swift", dir: "sdk/swift/weather", screenshot: "card.png" }],
  };
  assert.ok(validate(grown), JSON.stringify(validate.errors));
  assert.ok(validate({ ...index, version: 2 }), "a later version number");
});

test("required fields and closed lists are still enforced", () => {
  const { kind, ...noKind } = entry;
  assert.equal(validate({ version: 1, examples: [noKind] }), false);
  assert.equal(validate({ version: 1, examples: [{ ...entry, kind: "notebook" }] }), false);
  assert.equal(validate({ version: 1, examples: [{ ...entry, surface: "REST API" }] }), false);
  assert.equal(validate({ version: 0, examples: index.examples }), false);
});
