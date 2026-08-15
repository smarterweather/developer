#!/usr/bin/env node
/**
 * Hermetic Agent Plugin checks. Schemas are vendored next to the plugin
 * so CI never fetches agent-plugins.org. This script encodes the 1.0.0
 * constraints we ship (closed manifests, name pattern, MCP transports)
 * plus repo-local invariants (skill directory == frontmatter name,
 * marketplace source path, no secrets in mcp.json headers).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(pluginRoot, "..", "..");
const NAME_RE = /^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
const SECRET_HEADER_RE =
  /authorization|api[_-]?key|bearer|secret|token|password/i;

let failures = 0;

function fail(message) {
  console.error(`FAIL: ${message}`);
  failures += 1;
}

function loadJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    fail(`${path}: ${err.message}`);
    return null;
  }
}

function assertObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be a JSON object`);
    return false;
  }
  return true;
}

function extraKeys(value, allowed) {
  return Object.keys(value).filter((key) => !allowed.has(key));
}

const pluginSchema = loadJson(join(pluginRoot, "schemas/plugin.schema.json"));
const mcpSchema = loadJson(join(pluginRoot, "schemas/mcp.schema.json"));
if (pluginSchema?.$id !== "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json") {
  fail("vendored plugin.schema.json $id is not Agent Plugins 1.0.0");
}
if (mcpSchema?.$id !== "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json") {
  fail("vendored mcp.schema.json $id is not Agent Plugins 1.0.0");
}

const plugin = loadJson(join(pluginRoot, "plugin.json"));
if (plugin && assertObject(plugin, "plugin.json")) {
  if (plugin.$schema !== "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json") {
    fail("plugin.json $schema must be the Agent Plugins 1.0.0 plugin schema");
  }
  if (typeof plugin.name !== "string" || !NAME_RE.test(plugin.name) || plugin.name.length > 64) {
    fail(`plugin.json name is invalid: ${plugin.name}`);
  }
  const unknown = extraKeys(
    plugin,
    new Set([
      "$schema",
      "name",
      "version",
      "description",
      "author",
      "homepage",
      "repository",
      "license",
      "keywords",
      "extensions",
    ]),
  );
  if (unknown.length) fail(`plugin.json unknown fields: ${unknown.join(", ")}`);
  if (plugin.author && assertObject(plugin.author, "plugin.json author")) {
    const authorUnknown = extraKeys(plugin.author, new Set(["name", "email", "url"]));
    if (authorUnknown.length) {
      fail(`plugin.json author unknown fields: ${authorUnknown.join(", ")}`);
    }
  }
}

const mcp = loadJson(join(pluginRoot, "mcp.json"));
if (mcp && assertObject(mcp, "mcp.json")) {
  if (mcp.$schema !== "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json") {
    fail("mcp.json $schema must be the Agent Plugins 1.0.0 mcp schema");
  }
  const unknown = extraKeys(mcp, new Set(["$schema", "mcpServers"]));
  if (unknown.length) fail(`mcp.json unknown fields: ${unknown.join(", ")}`);
  if (!assertObject(mcp.mcpServers, "mcp.json mcpServers")) {
    // already recorded
  } else {
    for (const [name, server] of Object.entries(mcp.mcpServers)) {
      if (!assertObject(server, `mcpServers.${name}`)) continue;
      if (server.type === "streamable-http" || server.type === "sse") {
        const allowed = new Set(["type", "url", "headers"]);
        const extra = extraKeys(server, allowed);
        if (extra.length) fail(`mcpServers.${name} unknown fields: ${extra.join(", ")}`);
        if (typeof server.url !== "string" || server.url.length < 1) {
          fail(`mcpServers.${name} url is required`);
        } else {
          let parsed;
          try {
            parsed = new URL(server.url);
          } catch {
            fail(`mcpServers.${name} url is not a valid URL`);
          }
          if (parsed) {
            if (parsed.username || parsed.password || parsed.hash) {
              fail(`mcpServers.${name} url must not include userinfo or a fragment`);
            }
            if (parsed.protocol !== "https:") {
              fail(`mcpServers.${name} remote url must be https`);
            }
          }
        }
        if (server.headers && assertObject(server.headers, `mcpServers.${name}.headers`)) {
          for (const [header, value] of Object.entries(server.headers)) {
            if (typeof value !== "string") {
              fail(`mcpServers.${name}.headers.${header} must be a string`);
            }
            if (SECRET_HEADER_RE.test(header) || SECRET_HEADER_RE.test(String(value))) {
              fail(`mcpServers.${name}.headers must not contain credentials`);
            }
          }
        }
      } else if (server.type === "stdio") {
        const allowed = new Set(["type", "command", "args", "env", "cwd"]);
        const extra = extraKeys(server, allowed);
        if (extra.length) fail(`mcpServers.${name} unknown fields: ${extra.join(", ")}`);
        if (typeof server.command !== "string" || server.command.length < 1) {
          fail(`mcpServers.${name} command is required`);
        }
      } else {
        fail(`mcpServers.${name} type must be stdio, streamable-http, or sse`);
      }
    }
  }
}

const skillsDir = join(pluginRoot, "skills");
if (!existsSync(skillsDir)) {
  fail("skills/ directory is missing");
} else {
  for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillPath = join(skillsDir, entry.name, "SKILL.md");
    if (!existsSync(skillPath)) {
      fail(`skills/${entry.name}/SKILL.md is missing`);
      continue;
    }
    const text = readFileSync(skillPath, "utf8");
    const fm = text.match(/^---\n([\s\S]*?)\n---/);
    if (!fm) {
      fail(`skills/${entry.name}/SKILL.md is missing YAML frontmatter`);
      continue;
    }
    const nameLine = fm[1].match(/^name:\s*(.+)$/m);
    const name = nameLine?.[1]?.trim();
    if (name !== entry.name) {
      fail(
        `skills/${entry.name}/SKILL.md frontmatter name "${name}" must match the directory`,
      );
    }
    if (/\b\d+\s+tools?\b/i.test(text)) {
      fail(`skills/${entry.name}/SKILL.md hardcodes a tool count; point at mcp-tools.json / tools/list`);
    }
  }
}

const marketplace = loadJson(join(repoRoot, ".cursor-plugin/marketplace.json"));
if (marketplace && assertObject(marketplace, "marketplace.json")) {
  const sources = (marketplace.plugins ?? []).map((pluginEntry) => pluginEntry.source);
  if (!sources.includes("./plugins/smarterweather")) {
    fail('marketplace.json must list source "./plugins/smarterweather"');
  }
}

const cursorPlugin = loadJson(join(pluginRoot, ".cursor-plugin/plugin.json"));
if (cursorPlugin && plugin && cursorPlugin.name !== plugin.name) {
  fail("Cursor shim name must match plugin.json name");
}

if (failures > 0) {
  console.error(`validate: ${failures} failure(s)`);
  process.exit(1);
}
console.log("validate: ok");
