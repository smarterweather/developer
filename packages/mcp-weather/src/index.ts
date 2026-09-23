#!/usr/bin/env node
// @smarterweather/mcp-weather -- stdio-to-HTTP bridge to the
// SmarterWeather hosted MCP server (sw-mcp).
//
// This binary is a thin spawn() wrapper around `mcp-remote`
// (https://www.npmjs.com/package/mcp-remote), the canonical
// MCP stdio<->Streamable-HTTP bridge that handles the full MCP
// OAuth client (DCR + PKCE + loopback callback + token caching at
// ~/.mcp-auth/). We don't fork mcp-remote -- we wrap it with
// SmarterWeather URL defaults and an optional Authorization header
// injection so users only need to install one package.
//
// The API key is resolved from SMARTERWEATHER_API_KEY →
// SMARTERWEATHER_ENV_FILE → cwd/.env. Unexpanded ${…} placeholders
// count as unset. The bearer is passed to the child as
// SMARTERWEATHER_AUTH_HEADER (never on argv), and buildArgs injects
// Authorization:${SMARTERWEATHER_AUTH_HEADER} so mcp-remote's
// pre-expansion header log never sees the key.

import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { createRequire } from 'node:module';
import { buildArgs } from './args.js';
import {
  AUTH_HEADER_VAR,
  ENV_FILE_VAR,
  KEY_VAR,
  resolveApiKey,
} from './env.js';

const require = createRequire(import.meta.url);

interface PackageJsonShape {
  version: string;
}

const pkg = require('../package.json') as PackageJsonShape;
const mcpRemotePkg = require('mcp-remote/package.json') as PackageJsonShape;

const userArgs = process.argv.slice(2);

if (userArgs.includes('--version') || userArgs.includes('-v')) {
  // eslint-disable-next-line no-console
  console.log(`@smarterweather/mcp-weather ${pkg.version}`);
  // eslint-disable-next-line no-console
  console.log(`mcp-remote ${mcpRemotePkg.version}`);
  process.exit(0);
}

const resolved = resolveApiKey({
  processEnvKey: process.env[KEY_VAR],
  envFile: process.env[ENV_FILE_VAR],
  cwd: process.cwd(),
  homedir: homedir(),
});

const args = buildArgs(userArgs, {
  url: process.env.SMARTERWEATHER_MCP_URL,
  injectAuthHeader: resolved.ok,
  // The live prod hostname is the baked default. For dev/staging,
  // users override via SMARTERWEATHER_MCP_URL=http://<dev-alb>/mcp;
  // see README for the dev/staging snippet.
  defaultUrl: 'https://mcp.smarterweather.com',
});

// mcp-remote ships its CLI entry point at dist/proxy.js. We resolve
// the absolute path through createRequire so any install layout
// (workspace symlinks, npx temp dirs, global installs) works.
const proxyEntry = require.resolve('mcp-remote/dist/proxy.js');

const childEnv = { ...process.env };
if (resolved.ok) {
  childEnv[AUTH_HEADER_VAR] = `Bearer ${resolved.key}`;
}

const child = spawn(process.execPath, [proxyEntry, ...args], {
  stdio: 'inherit',
  env: childEnv,
});

// Forward signals so the host MCP client's tear-down (Ctrl-C,
// process kill, etc.) reaches mcp-remote cleanly. Without this the
// stdio EOF eventually closes mcp-remote too, but signals get a
// faster + more deterministic shutdown.
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
  process.on(sig, () => {
    if (!child.killed) child.kill(sig);
  });
}

child.on('exit', (code, signal) => {
  if (signal !== null) {
    // Re-raise the signal so the parent's exit status reflects the
    // tear-down cause (lets shell + supervisors distinguish a clean
    // SIGINT from a crash).
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

child.on('error', (err) => {
  // Spawn-level failure (e.g. mcp-remote missing from node_modules).
  // eslint-disable-next-line no-console
  console.error(`@smarterweather/mcp-weather: failed to spawn mcp-remote: ${err.message}`);
  process.exit(1);
});
