#!/usr/bin/env node
// @smarterweather/mcp-onboarding -- stdio-to-HTTP bridge to the
// SmarterWeather developer onboarding MCP server (sw-onboarding,
// hosted at https://mcp.developers.smarterweather.com).
//
// Thin spawn() wrapper around `mcp-remote`
// (https://www.npmjs.com/package/mcp-remote), same pattern as
// @smarterweather/mcp-weather, plus a local JSON-RPC interceptor
// for `start_trial`: the stdio package mints over HTTPS, writes
// SMARTERWEATHER_API_KEY to .env (mode 0600), and returns only a
// key prefix. mcp-remote never sees the bearer.

import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { createRequire } from 'node:module';
import { buildArgs } from './args.js';
import { ENV_FILE_VAR, KEY_VAR } from './env.js';
import { attachJsonRpcProxy } from './proxy.js';
import { startTrial } from './trial.js';

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
  defaultUrl: 'https://mcp.developers.smarterweather.com',
});

const proxyEntry = require.resolve('mcp-remote/dist/proxy.js');

const child = spawn(process.execPath, [proxyEntry, ...args], {
  stdio: ['pipe', 'pipe', 'inherit'],
});

let proxy: ReturnType<typeof attachJsonRpcProxy>;
proxy = attachJsonRpcProxy({
  hostIn: process.stdin,
  hostOut: process.stdout,
  childIn: child.stdin!,
  childOut: child.stdout!,
  startTrial: async () => {
    const envFile = process.env[ENV_FILE_VAR];
    return startTrial({
      envFile,
      processEnvKey: process.env[KEY_VAR],
      keyApiBase:
        process.env.SMARTERWEATHER_API_BASE_URL ?? process.env.SMARTERWEATHER_KEY_API_BASE,
      rootUris: envFile ? [] : await proxy.requestHostRoots(),
      cwd: process.cwd(),
      homedir: homedir(),
    });
  },
});

for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
  process.on(sig, () => {
    if (!child.killed) child.kill(sig);
  });
}

child.on('exit', (code, signal) => {
  if (signal !== null) {
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
