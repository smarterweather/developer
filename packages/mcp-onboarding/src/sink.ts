// Shared .env sink for start_trial, CLI trial/login, and proxy create/rotate.
// Every recommended mint path writes SMARTERWEATHER_API_KEY (0600, gitignored)
// and returns only a 12-char prefix — never the bearer.

import { dirname } from 'node:path';
import {
  displayPrefix,
  ensureGitignore,
  isUsableKey,
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

/** `env_path` is set only when the key is in that file; a process-env key has no file. */
export type AlreadyConfigured = {
  status: 'already_configured';
  key_prefix: string;
  source: 'process_env' | 'env_file';
  env_path?: string;
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

/** If process env or the target .env already has a usable key, return already_configured. */
export function checkAlreadyConfigured(
  processEnvKey: string | undefined,
  targetPath: string,
): AlreadyConfigured | undefined {
  if (isUsableKey(processEnvKey)) {
    return {
      status: 'already_configured',
      key_prefix: displayPrefix(processEnvKey.trim()),
      source: 'process_env',
    };
  }
  const fromFile = readExistingKey(targetPath);
  if (!isUsableKey(fromFile)) return undefined;
  return {
    status: 'already_configured',
    key_prefix: displayPrefix(fromFile),
    source: 'env_file',
    env_path: targetPath,
  };
}

/** Handling copy for an already_configured result; never contains the key. */
export function alreadyConfiguredHandling(a: AlreadyConfigured): string {
  return a.source === 'env_file'
    ? `SMARTERWEATHER_API_KEY is already in ${a.env_path}; not shown. Remove that line to mint a fresh key.`
    : 'SMARTERWEATHER_API_KEY is already set in this process environment; not shown. Unset it to write a key to .env.';
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
