// node --test examples/_harness/
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { checkConfig, HOSTED_MCP_URL, readBridge } from "./check-mcp-config.mjs";

const examples = join(dirname(fileURLToPath(import.meta.url)), "..");
const bridge = readBridge();
const stdio = (extra = {}) => ({ mcpServers: { smarterweather: { command: "npx", args: ["-y", "@smarterweather/mcp-weather@latest"], ...extra } } });
const remote = (extra = {}) => ({
  mcpServers: { smarterweather: { url: HOSTED_MCP_URL, headers: { Authorization: "Bearer ${env:SMARTERWEATHER_API_KEY}" }, ...extra } },
});
const ok = (config, client) => assert.doesNotThrow(() => checkConfig(config, client, bridge));
const bad = (config, client, pattern) => assert.throws(() => checkConfig(config, client, bridge), pattern);

test("the shipped configs pass", () => {
  ok(JSON.parse(readFileSync(join(examples, "mcp/claude-desktop/claude_desktop_config.json"), "utf8")), "claude-desktop");
  ok(JSON.parse(readFileSync(join(examples, "mcp/cursor/mcp.json"), "utf8")), "cursor");
});

test("every key source the bridge reads is accepted where the client supports it", () => {
  ok(stdio({ env: { SMARTERWEATHER_ENV_FILE: "/Users/me/project/.env" } }), "claude-desktop");
  ok(stdio(), "claude-desktop"); // ./.env in the working directory
  ok(stdio(), "cursor");
  ok(stdio({ type: "stdio", envFile: "${workspaceFolder}/.env" }), "cursor");
  ok(stdio({ env: { SMARTERWEATHER_API_KEY: "${env:SMARTERWEATHER_API_KEY}" } }), "cursor");
  ok(stdio({ env: { SMARTERWEATHER_ENV_FILE: "${workspaceFolder}/.env" } }), "cursor");
  ok(stdio({ env: { SMARTERWEATHER_MCP_URL: HOSTED_MCP_URL } }), "cursor");
  ok(remote(), "cursor");
});

test("Claude Desktop: stdio only, no interpolation", () => {
  bad(remote(), "claude-desktop", /stdio servers only/);
  bad(stdio({ env: { SMARTERWEATHER_API_KEY: "${env:SMARTERWEATHER_API_KEY}" } }), "claude-desktop", /does not interpolate/);
  bad(stdio({ type: "stdio", envFile: "${workspaceFolder}/.env" }), "claude-desktop", /no type|no envFile/);
  bad(stdio({ env: { SMARTERWEATHER_ENV_FILE: "project/.env" } }), "claude-desktop", /absolute path/);
});

test("remote entries carry no stdio fields", () => {
  bad(remote({ command: "npx", args: ["-y", "@smarterweather/mcp-weather@latest"] }), "cursor", /remote entry has no command/);
  bad(remote({ type: "stdio" }), "cursor", /not "type": "stdio"/);
  bad(remote({ url: "https://example.com" }), "cursor", /url is not/);
  bad(remote({ headers: { Authorization: "Bearer ${env:OTHER}" } }), "cursor", /headers must be/);
});

test("no key, literal or placeholder, and no bridge-internal variables", () => {
  const fake = "sw_" + "live_" + "Ab3_x-9Zq7Lm";
  bad(stdio({ env: { SMARTERWEATHER_API_KEY: fake } }), "cursor", /looks like a key/);
  bad(stdio({ env: { SMARTERWEATHER_API_KEY: "YOUR_SMARTERWEATHER_API_KEY" } }), "cursor", /placeholder/);
  bad(stdio({ env: { SMARTERWEATHER_AUTH_HEADER: "Bearer ${env:SMARTERWEATHER_API_KEY}" } }), "cursor", /set by the bridge/);
  bad(stdio({ env: { OTHER: "x" } }), "cursor", /not a variable the bridge reads/);
  bad(stdio({ env: { SMARTERWEATHER_MCP_URL: "https://example.com" } }), "cursor", /SMARTERWEATHER_MCP_URL must be/);
  bad({ mcpServers: { smarterweather: { command: "npx", args: ["-y", "@smarterweather/mcp-weather@preview"] } } }, "cursor", /args must be/);
});

test("unknown clients are rejected", () => {
  bad(stdio(), "vscode", /unknown client/);
});
