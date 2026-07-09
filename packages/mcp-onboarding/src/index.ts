#!/usr/bin/env node
// @smarterweather/mcp-onboarding -- stdio-to-HTTP bridge to the
// SmarterWeather developer onboarding MCP server (sw-onboarding,
// hosted at https://developers.smarterweather.com/mcp).
//
// Thin spawn() wrapper around `mcp-remote`
// (https://www.npmjs.com/package/mcp-remote), same pattern as
// @smarterweather/mcp-weather. Two modes:
//
//   Anonymous (default): the hosted server serves the open discovery
//   tools (get_plans, get_documentation, sign_up) with no auth at
//   all -- a cold-start agent can explore the platform immediately.
//
//   Authenticated (SMARTERWEATHER_ONBOARDING_AUTH=required): the
//   bridge appends ?auth=required to the target URL; the server then
//   401-challenges the first request, which kicks off mcp-remote's
//   OAuth client (pre-registered public PKCE client_id + loopback
//   callback on port 3334 + browser consent + token cache at
//   ~/.mcp-auth/). Production Clerk keeps Dynamic Client Registration
//   OFF; the bridge skips DCR via --static-oauth-client-info. After
//   the browser dance, account-scoped tools (create_api_key,
//   get_usage, upgrade_plan, ...) appear alongside the open ones.
//
// All argv assembly lives in ./args.ts so it stays unit-testable.

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
  console.log(`@smarterweather/mcp-onboarding ${pkg.version}`);
  // eslint-disable-next-line no-console
  console.log(`mcp-remote ${mcpRemotePkg.version}`);
  process.exit(0);
}

const args = buildArgs(userArgs, {
  url: process.env.SMARTERWEATHER_ONBOARDING_MCP_URL,
  authMode: process.env.SMARTERWEATHER_ONBOARDING_AUTH,
  oauthClientId: process.env.SMARTERWEATHER_ONBOARDING_OAUTH_CLIENT_ID,
  defaultUrl: 'https://developers.smarterweather.com/mcp',
});

// mcp-remote ships its CLI entry point at dist/proxy.js; resolve the
// absolute path through createRequire so any install layout
// (workspace symlinks, npx temp dirs, global installs) works.
const proxyEntry = require.resolve('mcp-remote/dist/proxy.js');

const child = spawn(process.execPath, [proxyEntry, ...args], {
  stdio: 'inherit',
});

// Forward signals so the host MCP client's tear-down reaches
// mcp-remote cleanly and deterministically.
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
  process.on(sig, () => {
    if (!child.killed) child.kill(sig);
  });
}

child.on('exit', (code, signal) => {
  if (signal !== null) {
    // Re-raise so the parent's exit status reflects the tear-down
    // cause (clean SIGINT vs crash).
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

child.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error(`@smarterweather/mcp-onboarding: failed to spawn mcp-remote: ${err.message}`);
  process.exit(1);
});
