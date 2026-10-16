#!/usr/bin/env node
// Static check of an MCP client config example, by that client's rules (no
// network). The client is the example directory's name, or --client <name>.
// - One server, `smarterweather`, with only the fields that client documents.
// - stdio: `npx -y @smarterweather/mcp-weather@latest`, whose default URL (read
//   from packages/mcp-weather) is the hosted server; any SMARTERWEATHER_MCP_URL
//   override is that same URL. The key comes from one of the sources the
//   bridge reads: SMARTERWEATHER_API_KEY in the process env (here only as a
//   client interpolation, never a literal), SMARTERWEATHER_ENV_FILE, the
//   client's envFile, or ./.env in the bridge's working directory (no key
//   field at all).
// - remote: `url` is the hosted server and the Authorization header is an
//   interpolation of SMARTERWEATHER_API_KEY; no stdio fields.
// - No value is, or looks like, a key, and none is the examples' placeholder.
// Usage, from an example dir: node ../../_harness/check-mcp-config.mjs <config.json> [--client <name>]
import { readFileSync, realpathSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { KEY_PATTERN } from "./scan-keys.mjs";

export const HOSTED_MCP_URL = "https://mcp.smarterweather.com";

// Each client's documented config format.
export const CLIENTS = {
  // Claude Desktop: stdio servers only (command, args, env) in
  // claude_desktop_config.json, with no variable interpolation.
  // https://modelcontextprotocol.io/docs/develop/connect-local-servers
  // docs/mcp-weather.md ("Claude Desktop does not interpolate ${…}").
  "claude-desktop": { remote: false, envFile: false, interpolate: null },
  // Cursor: stdio (type, command, args, env, envFile) or remote (url,
  // headers); interpolates ${env:NAME}, ${workspaceFolder} and ${userHome};
  // envFile needs "type": "stdio". https://cursor.com/docs/context/mcp
  // docs/mcp-weather.md ("Cursor requires \"type\": \"stdio\" for envFile").
  cursor: { remote: true, envFile: true, interpolate: (name) => `\${env:${name}}` },
};

const quoted = (text, name) => new RegExp(`${name}\\s*[:=]\\s*(['"\`])([^'"\`]+)\\1`).exec(text)?.[2];

/** Package name, default URL and env var names, read from packages/mcp-weather. */
export function readBridge(repo = join(dirname(fileURLToPath(import.meta.url)), "..", "..")) {
  const dir = join(repo, "packages", "mcp-weather");
  const envTs = readFileSync(join(dir, "src", "env.ts"), "utf8");
  const bridge = {
    pkg: JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).name,
    defaultUrl: quoted(readFileSync(join(dir, "src", "index.ts"), "utf8"), "defaultUrl"),
    keyVar: quoted(envTs, "KEY_VAR"),
    envFileVar: quoted(envTs, "ENV_FILE_VAR"),
    authHeaderVar: quoted(envTs, "AUTH_HEADER_VAR"),
  };
  for (const [k, v] of Object.entries(bridge)) if (!v) throw new Error(`could not read the bridge's ${k} from packages/mcp-weather`);
  if (bridge.defaultUrl !== HOSTED_MCP_URL) throw new Error(`the bridge's default URL ${bridge.defaultUrl} is not ${HOSTED_MCP_URL}`);
  return bridge;
}

const strings = (value) =>
  typeof value === "string" ? [value] : value && typeof value === "object" ? Object.values(value).flatMap(strings) : [];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Returns a one-line description, or throws with every problem found. */
export function checkConfig(config, clientName, bridge) {
  const client = CLIENTS[clientName];
  if (!client) throw new Error(`unknown client "${clientName}" (known: ${Object.keys(CLIENTS).join(", ")})`);
  const errors = [];
  const fail = (msg) => errors.push(msg);

  for (const s of strings(config)) {
    if (KEY_PATTERN.test(s)) fail("a value looks like a key");
    if (s.includes("YOUR_SMARTERWEATHER_API_KEY")) fail("configs never hold a key, not even the placeholder");
    if (!client.interpolate && s.includes("${")) fail(`${clientName} does not interpolate \${...}: ${s}`);
  }
  if (!same(Object.keys(config ?? {}), ["mcpServers"])) fail("expected only mcpServers");
  const servers = config?.mcpServers ?? {};
  if (!same(Object.keys(servers), ["smarterweather"])) fail("expected one server, smarterweather");
  const server = servers.smarterweather ?? {};
  const has = (field) => field in server;
  let how = "";

  if (has("url")) {
    if (!client.remote) fail(`${clientName} takes stdio servers only, not url`);
    for (const field of Object.keys(server)) if (!["type", "url", "headers"].includes(field)) fail(`a remote entry has no ${field}`);
    if (server.type === "stdio") fail('a remote entry is not "type": "stdio"');
    if (server.url !== HOSTED_MCP_URL) fail(`url is not ${HOSTED_MCP_URL}`);
    const auth = client.interpolate && `Bearer ${client.interpolate(bridge.keyVar)}`;
    if (!same(server.headers, { Authorization: auth })) fail(`headers must be exactly { "Authorization": "${auth}" }`);
    how = `remote ${server.url}, key from ${client.interpolate?.(bridge.keyVar)}`;
  } else {
    const allowed = ["command", "args", "env", ...(client.envFile ? ["type", "envFile"] : [])];
    for (const field of Object.keys(server)) if (!allowed.includes(field)) fail(`${clientName} stdio entries have no ${field}`);
    if (server.command !== "npx") fail("command must be npx");
    if (!same(server.args, ["-y", `${bridge.pkg}@latest`])) fail(`args must be ["-y", "${bridge.pkg}@latest"]`);
    if (has("type") && server.type !== "stdio") fail('type must be "stdio"');
    if (has("envFile")) {
      if (server.type !== "stdio") fail('envFile needs "type": "stdio"');
      if (server.envFile !== "${workspaceFolder}/.env") fail("envFile must be ${workspaceFolder}/.env");
    }

    const env = server.env ?? {};
    const sources = [];
    for (const [name, value] of Object.entries(env)) {
      if (name === bridge.envFileVar) {
        const absolute = /^\/.*\.env$/.test(value) || (client.interpolate && /^\$\{workspaceFolder\}\/.*\.env$/.test(value));
        if (!absolute) fail(`${name} must be an absolute path to a .env file`);
        sources.push(name);
      } else if (name === bridge.keyVar) {
        if (!client.interpolate) fail(`${clientName} cannot interpolate, so ${name} here would be a literal key; use ${bridge.envFileVar}`);
        else if (value !== client.interpolate(bridge.keyVar)) fail(`${name} must be ${client.interpolate(bridge.keyVar)}, never a literal`);
        sources.push(`${name} (interpolated)`);
      } else if (name === "SMARTERWEATHER_MCP_URL") {
        if (value !== HOSTED_MCP_URL) fail(`SMARTERWEATHER_MCP_URL must be ${HOSTED_MCP_URL}`);
      } else if (name === bridge.authHeaderVar) {
        fail(`${name} is set by the bridge from the key it resolves; set ${bridge.keyVar} or ${bridge.envFileVar} instead`);
      } else {
        fail(`env ${name} is not a variable the bridge reads`);
      }
    }
    if (has("envFile")) sources.push("envFile");
    how = `stdio ${bridge.pkg}@latest -> ${bridge.defaultUrl}, key from ${sources.join(" + ") || "./.env in the working directory"}`;
  }

  if (errors.length > 0) throw new Error(errors.join("; "));
  return how;
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  const flag = args.indexOf("--client");
  const client = flag >= 0 ? args.splice(flag, 2)[1] : basename(process.cwd());
  const [file] = args;
  if (!file) {
    console.error("usage: check-mcp-config.mjs <config.json> [--client <name>]");
    process.exit(2);
  }
  try {
    const how = checkConfig(JSON.parse(readFileSync(file, "utf8")), client, readBridge());
    console.log(`ok ${file} (${client}): ${how}`);
  } catch (err) {
    console.error(`${file} (${client}): ${err.message}`);
    process.exit(1);
  }
}
