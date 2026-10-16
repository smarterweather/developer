#!/usr/bin/env node
// Static check of an MCP client config example (no network):
// - one server, `smarterweather`, with only the fields clients document;
// - a stdio entry runs `npx -y @smarterweather/mcp-weather@latest`, whose
//   default URL (read from packages/mcp-weather) is the hosted server, and
//   any SMARTERWEATHER_MCP_URL override is that same URL;
// - a remote entry's `url` is the hosted server and its Authorization
//   header references the env var, never a literal;
// - the key comes from the environment or a .env file, by the variable
//   names the bridge reads; no value in the file is or looks like a key.
// Usage, from an example dir: node ../../_harness/check-mcp-config.mjs <config.json>
import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { KEY_PATTERN } from "./scan-keys.mjs";

const HOSTED_MCP_URL = "https://mcp.smarterweather.com";
const repo = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const bridgeDir = join(repo, "packages", "mcp-weather");
const read = (...p) => readFileSync(join(...p), "utf8");
const constant = (text, name) => new RegExp(`${name}\\s*=\\s*'([^']+)'`).exec(text)?.[1];

const pkg = JSON.parse(read(bridgeDir, "package.json")).name;
const envTs = read(bridgeDir, "src", "env.ts");
const KEY_VAR = constant(envTs, "KEY_VAR");
const ENV_FILE_VAR = constant(envTs, "ENV_FILE_VAR");
const bridgeDefault = /defaultUrl:\s*'([^']+)'/.exec(read(bridgeDir, "src", "index.ts"))?.[1];
ok(KEY_VAR && ENV_FILE_VAR && bridgeDefault, "could not read the bridge's variable names or default URL from packages/mcp-weather");
strictEqual(bridgeDefault, HOSTED_MCP_URL, "the bridge's default URL is not the hosted MCP server");

const file = process.argv[2];
ok(file, "usage: check-mcp-config.mjs <config.json>");
const config = JSON.parse(readFileSync(file, "utf8"));

const strings = (value) =>
  typeof value === "string" ? [value] : value && typeof value === "object" ? Object.values(value).flatMap(strings) : [];
for (const s of strings(config)) {
  ok(!KEY_PATTERN.test(s), `${file}: a value looks like a key`);
  ok(!s.includes("YOUR_SMARTERWEATHER_API_KEY"), `${file}: configs never hold a key, not even the placeholder`);
}

deepStrictEqual(Object.keys(config), ["mcpServers"], `${file}: expected only mcpServers`);
deepStrictEqual(Object.keys(config.mcpServers), ["smarterweather"], `${file}: expected one server, smarterweather`);
const server = config.mcpServers.smarterweather;
const allowed = new Set(["type", "command", "args", "env", "envFile", "url", "headers"]);
for (const field of Object.keys(server)) ok(allowed.has(field), `${file}: unexpected field ${field}`);

let how;
if ("url" in server) {
  strictEqual(server.url, HOSTED_MCP_URL, `${file}: url is not the hosted MCP server`);
  deepStrictEqual(server.headers, { Authorization: `Bearer \${env:${KEY_VAR}}` }, `${file}: the header must reference ${KEY_VAR}`);
  how = `remote ${server.url}, key from \${env:${KEY_VAR}}`;
} else {
  strictEqual(server.command, "npx", `${file}: command`);
  deepStrictEqual(server.args, ["-y", `${pkg}@latest`], `${file}: args`);
  if ("type" in server) strictEqual(server.type, "stdio", `${file}: type`);
  const env = server.env ?? {};
  for (const name of Object.keys(env)) {
    ok([ENV_FILE_VAR, "SMARTERWEATHER_MCP_URL"].includes(name), `${file}: env ${name} is not a variable the bridge reads for config (put ${KEY_VAR} in .env)`);
  }
  if ("SMARTERWEATHER_MCP_URL" in env) strictEqual(env.SMARTERWEATHER_MCP_URL, HOSTED_MCP_URL, `${file}: SMARTERWEATHER_MCP_URL`);
  if ("envFile" in server) {
    strictEqual(server.type, "stdio", `${file}: envFile needs "type": "stdio"`);
    strictEqual(server.envFile, "${workspaceFolder}/.env", `${file}: envFile`);
  }
  if (ENV_FILE_VAR in env) ok(/^\/.*\.env$/.test(env[ENV_FILE_VAR]), `${file}: ${ENV_FILE_VAR} must be an absolute path to a .env file`);
  ok("envFile" in server || ENV_FILE_VAR in env, `${file}: the key must come from a .env file (envFile or ${ENV_FILE_VAR})`);
  how = `stdio ${pkg}@latest -> ${bridgeDefault}, key from ${"envFile" in server ? "envFile" : ENV_FILE_VAR}`;
}

console.log(`ok ${file}: ${how}`);
