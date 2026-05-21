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
// All real argv assembly lives in ./args.ts so it stays unit-
// testable. This file owns:
//   - --version / -v short-circuit (so packages-ci.yml's post-build
//     smoke test can invoke the bin without blocking on stdio).
//   - Resolving the mcp-remote proxy entry point via createRequire
//     (avoids depending on a bin symlink layout that may differ
//     between npm / pnpm / yarn / npx tmpdirs).
//   - Spawning the child + forwarding stdio + signals so Ctrl-C
//     in the MCP client cleanly tears down the bridge.

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { buildArgs } from './args.js';

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

const args = buildArgs(userArgs, {
  url: process.env.SMARTERWEATHER_MCP_URL,
  apiKey: process.env.SMARTERWEATHER_API_KEY,
  // The prod hostname is the baked default. Pre-F.4 (cert/DNS still
  // landing), users override via SMARTERWEATHER_MCP_URL=http://<dev-alb>/mcp;
  // see README for the dev/staging snippet.
  defaultUrl: 'https://mcp.smarterweather.com/mcp',
});

// mcp-remote ships its CLI entry point at dist/proxy.js. We resolve
// the absolute path through createRequire so any install layout
// (workspace symlinks, npx temp dirs, global installs) works.
const proxyEntry = require.resolve('mcp-remote/dist/proxy.js');

const child = spawn(process.execPath, [proxyEntry, ...args], {
  stdio: 'inherit',
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
