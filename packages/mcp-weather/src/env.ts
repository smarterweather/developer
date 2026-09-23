// Key resolution for the weather bridge: process env → ENV_FILE → cwd/.env.
// Duplicated (not shared) with mcp-onboarding so the published packages stay
// independently versioned with no workspace dependency.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const KEY_VAR = 'SMARTERWEATHER_API_KEY';
export const ENV_FILE_VAR = 'SMARTERWEATHER_ENV_FILE';
export const AUTH_HEADER_VAR = 'SMARTERWEATHER_AUTH_HEADER';

const UNEXPANDED_RE = /^\$\{.+\}$/;

export function isGuardedCwd(cwd: string, homedir: string): boolean {
  return resolve(cwd) === resolve('/') || resolve(cwd) === resolve(homedir);
}

export function parseEnvKey(contents: string): string | undefined {
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const name = line.slice(0, eq).trim();
    if (name !== KEY_VAR) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value || undefined;
  }
  return undefined;
}

export function readExistingKey(filePath: string): string | undefined {
  try {
    return parseEnvKey(readFileSync(filePath, 'utf8'));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw err;
  }
}

/** Empty or still-unexpanded `${…}` counts as unset. */
export function isUsableKey(value: string | undefined): value is string {
  if (value === undefined) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (UNEXPANDED_RE.test(trimmed)) return false;
  return true;
}

export type ResolveKeyResult =
  | { ok: true; key: string; source: 'env' | 'env_file' | 'cwd' }
  | { ok: false; reason: 'unset' | 'unexpanded' | 'guarded_cwd' };

export function resolveApiKey(opts: {
  processEnvKey?: string;
  envFile?: string;
  cwd: string;
  homedir: string;
  warn?: (msg: string) => void;
}): ResolveKeyResult {
  const warn = opts.warn ?? ((msg: string) => process.stderr.write(`${msg}\n`));

  if (opts.processEnvKey !== undefined && opts.processEnvKey.trim() !== '') {
    if (UNEXPANDED_RE.test(opts.processEnvKey.trim())) {
      warn(
        `@smarterweather/mcp-weather: ${KEY_VAR} looks like an unexpanded placeholder (${opts.processEnvKey.trim()}); falling through to .env`,
      );
    } else if (isUsableKey(opts.processEnvKey)) {
      return { ok: true, key: opts.processEnvKey.trim(), source: 'env' };
    }
  }

  if (opts.envFile && opts.envFile.trim()) {
    const fromFile = readExistingKey(resolve(opts.envFile.trim()));
    if (isUsableKey(fromFile)) {
      return { ok: true, key: fromFile, source: 'env_file' };
    }
  }

  if (isGuardedCwd(opts.cwd, opts.homedir)) {
    return { ok: false, reason: 'guarded_cwd' };
  }

  const fromCwd = readExistingKey(resolve(opts.cwd, '.env'));
  if (isUsableKey(fromCwd)) {
    return { ok: true, key: fromCwd, source: 'cwd' };
  }

  return { ok: false, reason: 'unset' };
}
