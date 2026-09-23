// Shared .env sink for start_trial, CLI trial/login, and proxy create/rotate.
// Every recommended mint path writes SMARTERWEATHER_API_KEY (0600, gitignored)
// and returns only a 12-char prefix — never the bearer.

import { dirname } from 'node:path';
import {
  displayPrefix,
  ensureGitignore,
  readExistingKey,
  replaceEnvKey,
  resolveEnvPath,
  upsertEnvKey,
  type EnvTarget,
} from './env.js';

export { displayPrefix, readExistingKey, resolveEnvPath };
export type { EnvTarget };

export type SinkWritten = {
  key_prefix: string;
  env_path: string;
};

export type AlreadyConfigured = {
  status: 'already_configured';
  key_prefix: string;
  env_path: string;
};

export type SinkResolveDeps = {
  envFile?: string;
  rootUris?: string[];
  cwd: string;
  homedir: string;
  processEnvKey?: string;
};

/** Resolve the .env target or return the path error string. */
export function resolveSinkTarget(deps: SinkResolveDeps): EnvTarget {
  return resolveEnvPath({
    envFile: deps.envFile,
    rootUris: deps.rootUris,
    cwd: deps.cwd,
    homedir: deps.homedir,
  });
}

/** If process env or the target .env already has the key, return already_configured. */
export function checkAlreadyConfigured(
  deps: SinkResolveDeps,
  targetPath: string,
): AlreadyConfigured | undefined {
  const existing = deps.processEnvKey || readExistingKey(targetPath);
  if (!existing) return undefined;
  return {
    status: 'already_configured',
    key_prefix: displayPrefix(existing),
    env_path: targetPath,
  };
}

/** Write a new key (fails if already set). Ensures .gitignore has .env. */
export function writeNewKey(envPath: string, key: string): SinkWritten {
  upsertEnvKey(envPath, key);
  ensureGitignore(dirname(envPath));
  return { key_prefix: displayPrefix(key), env_path: envPath };
}

/** Replace the key line (or append). Ensures .gitignore has .env. */
export function writeReplacedKey(envPath: string, key: string): SinkWritten {
  replaceEnvKey(envPath, key);
  ensureGitignore(dirname(envPath));
  return { key_prefix: displayPrefix(key), env_path: envPath };
}
