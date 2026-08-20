#!/usr/bin/env node
/**
 * Hermetic Agent Plugin checks for every tree under plugins/.
 * Schemas are vendored next to each plugin so CI never fetches
 * agent-plugins.org. Encodes Agent Plugins 1.0.0 constraints
 * (closed manifests, name pattern, MCP transports) plus repo-local
 * invariants (skill directory == frontmatter name, marketplace lists
 * every plugin, no secrets in mcp.json headers).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const pluginsRoot = join(repoRoot, "plugins");
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

function validatePlugin(pluginRoot) {
  const rel = pluginRoot.slice(repoRoot.length + 1);
  const pluginSchema = loadJson(join(pluginRoot, "schemas/plugin.schema.json"));
  const mcpSchema = loadJson(join(pluginRoot, "schemas/mcp.schema.json"));
  if (pluginSchema?.$id !== "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json") {
    fail(`${rel}: vendored plugin.schema.json $id is not Agent Plugins 1.0.0`);
  }
  if (mcpSchema?.$id !== "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json") {
    fail(`${rel}: vendored mcp.schema.json $id is not Agent Plugins 1.0.0`);
  }

  const plugin = loadJson(join(pluginRoot, "plugin.json"));
  if (plugin && assertObject(plugin, `${rel}/plugin.json`)) {
    if (plugin.$schema !== "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json") {
      fail(`${rel}/plugin.json $schema must be the Agent Plugins 1.0.0 plugin schema`);
    }
    if (typeof plugin.name !== "string" || !NAME_RE.test(plugin.name) || plugin.name.length > 64) {
      fail(`${rel}/plugin.json name is invalid: ${plugin.name}`);
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
    if (unknown.length) fail(`${rel}/plugin.json unknown fields: ${unknown.join(", ")}`);
    if (plugin.author && assertObject(plugin.author, `${rel}/plugin.json author`)) {
      const authorUnknown = extraKeys(plugin.author, new Set(["name", "email", "url"]));
      if (authorUnknown.length) {
        fail(`${rel}/plugin.json author unknown fields: ${authorUnknown.join(", ")}`);
      }
    }
  }

  const mcp = loadJson(join(pluginRoot, "mcp.json"));
  if (mcp && assertObject(mcp, `${rel}/mcp.json`)) {
    if (mcp.$schema !== "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json") {
      fail(`${rel}/mcp.json $schema must be the Agent Plugins 1.0.0 mcp schema`);
    }
    const unknown = extraKeys(mcp, new Set(["$schema", "mcpServers"]));
    if (unknown.length) fail(`${rel}/mcp.json unknown fields: ${unknown.join(", ")}`);
    if (assertObject(mcp.mcpServers, `${rel}/mcp.json mcpServers`)) {
      for (const [name, server] of Object.entries(mcp.mcpServers)) {
        if (!assertObject(server, `${rel}/mcpServers.${name}`)) continue;
        if (server.type === "streamable-http" || server.type === "sse") {
          const allowed = new Set(["type", "url", "headers"]);
          const extra = extraKeys(server, allowed);
          if (extra.length) fail(`${rel}/mcpServers.${name} unknown fields: ${extra.join(", ")}`);
          if (typeof server.url !== "string" || server.url.length < 1) {
            fail(`${rel}/mcpServers.${name} url is required`);
          } else {
            let parsed;
            try {
              parsed = new URL(server.url);
            } catch {
              fail(`${rel}/mcpServers.${name} url is not a valid URL`);
            }
            if (parsed) {
              if (parsed.username || parsed.password || parsed.hash) {
                fail(`${rel}/mcpServers.${name} url must not include userinfo or a fragment`);
              }
              if (parsed.protocol !== "https:") {
                fail(`${rel}/mcpServers.${name} remote url must be https`);
              }
            }
          }
          if (server.headers && assertObject(server.headers, `${rel}/mcpServers.${name}.headers`)) {
            for (const [header, value] of Object.entries(server.headers)) {
              if (typeof value !== "string") {
                fail(`${rel}/mcpServers.${name}.headers.${header} must be a string`);
              }
              if (SECRET_HEADER_RE.test(header) || SECRET_HEADER_RE.test(String(value))) {
                fail(`${rel}/mcpServers.${name}.headers must not contain credentials`);
              }
            }
          }
        } else if (server.type === "stdio") {
          const allowed = new Set(["type", "command", "args", "env", "cwd"]);
          const extra = extraKeys(server, allowed);
          if (extra.length) fail(`${rel}/mcpServers.${name} unknown fields: ${extra.join(", ")}`);
          if (typeof server.command !== "string" || server.command.length < 1) {
            fail(`${rel}/mcpServers.${name} command is required`);
          }
        } else {
          fail(`${rel}/mcpServers.${name} type must be stdio, streamable-http, or sse`);
        }
      }
    }
  }

  const skillsDir = join(pluginRoot, "skills");
  if (!existsSync(skillsDir)) {
    fail(`${rel}: skills/ directory is missing`);
  } else {
    for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const skillPath = join(skillsDir, entry.name, "SKILL.md");
      if (!existsSync(skillPath)) {
        fail(`${rel}/skills/${entry.name}/SKILL.md is missing`);
        continue;
      }
      const text = readFileSync(skillPath, "utf8");
      const fm = text.match(/^---\n([\s\S]*?)\n---/);
      if (!fm) {
        fail(`${rel}/skills/${entry.name}/SKILL.md is missing YAML frontmatter`);
        continue;
      }
      const nameLine = fm[1].match(/^name:\s*(.+)$/m);
      const name = nameLine?.[1]?.trim();
      if (name !== entry.name) {
        fail(
          `${rel}/skills/${entry.name}/SKILL.md frontmatter name "${name}" must match the directory`,
        );
      }
      if (/\b\d+\s+tools?\b/i.test(text)) {
        fail(`${rel}/skills/${entry.name}/SKILL.md hardcodes a tool count; point at mcp-tools.json / tools/list`);
      }
    }
  }

  const cursorPlugin = loadJson(join(pluginRoot, ".cursor-plugin/plugin.json"));
  if (cursorPlugin && plugin && cursorPlugin.name !== plugin.name) {
    fail(`${rel}: Cursor shim name must match plugin.json name`);
  }
}

if (!existsSync(pluginsRoot)) {
  fail("plugins/ directory is missing");
} else {
  const pluginDirs = readdirSync(pluginsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  if (pluginDirs.length === 0) {
    fail("plugins/ has no plugin directories");
  }
  for (const name of pluginDirs) {
    validatePlugin(join(pluginsRoot, name));
  }

  const marketplace = loadJson(join(repoRoot, ".cursor-plugin/marketplace.json"));
  if (marketplace && assertObject(marketplace, "marketplace.json")) {
    const sources = new Set((marketplace.plugins ?? []).map((pluginEntry) => pluginEntry.source));
    for (const name of pluginDirs) {
      const expected = `./plugins/${name}`;
      if (!sources.has(expected)) {
        fail(`marketplace.json must list source "${expected}"`);
      }
    }
  }
}

if (failures > 0) {
  console.error(`validate: ${failures} failure(s)`);
  process.exit(1);
}
console.log("validate: ok");
