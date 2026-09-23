import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export const KEY_VAR = 'SMARTERWEATHER_API_KEY';
export const ENV_FILE_VAR = 'SMARTERWEATHER_ENV_FILE';

const DISPLAY_PREFIX_LEN = 12;

export function displayPrefix(key: string): string {
  return key.slice(0, DISPLAY_PREFIX_LEN);
}

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

export function fileUriToPath(uri: string): string | undefined {
  if (!uri.startsWith('file://')) return undefined;
  try {
    const parsed = new URL(uri);
    if (parsed.protocol !== 'file:') return undefined;
    if (parsed.hostname && parsed.hostname !== 'localhost' && parsed.hostname !== '') {
      return undefined;
    }
    return decodeURIComponent(parsed.pathname);
  } catch {
    return undefined;
  }
}

export type EnvTarget =
  | { ok: true; path: string; source: 'env' | 'root' | 'cwd' }
  | { ok: false; error: string };

export function resolveEnvPath(opts: {
  envFile?: string;
  rootUris?: string[];
  cwd: string;
  homedir: string;
}): EnvTarget {
  if (opts.envFile && opts.envFile.trim()) {
    return { ok: true, path: resolve(opts.envFile.trim()), source: 'env' };
  }

  for (const uri of opts.rootUris ?? []) {
    const dir = fileUriToPath(uri);
    if (!dir) continue;
    if (isGuardedCwd(dir, opts.homedir)) continue;
    return { ok: true, path: resolve(dir, '.env'), source: 'root' };
  }

  if (isGuardedCwd(opts.cwd, opts.homedir)) {
    return {
      ok: false,
      error:
        'no writable project directory: set SMARTERWEATHER_ENV_FILE or open a project folder (not / or $HOME)',
    };
  }

  return { ok: true, path: resolve(opts.cwd, '.env'), source: 'cwd' };
}

export function readExistingKey(filePath: string): string | undefined {
  try {
    return parseEnvKey(readFileSync(filePath, 'utf8'));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw err;
  }
}

export function upsertEnvKey(filePath: string, key: string): void {
  mkdirSync(dirname(filePath), { recursive: true });

  let existing = '';
  try {
    existing = readFileSync(filePath, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
  if (existing && parseEnvKey(existing) !== undefined) {
    throw new Error(`${KEY_VAR} already set in ${filePath}`);
  }

  const next =
    existing.length === 0 || existing.endsWith('\n')
      ? `${existing}${KEY_VAR}=${key}\n`
      : `${existing}\n${KEY_VAR}=${key}\n`;

  const tmp = `${filePath}.${process.pid}.tmp`;
  writeFileSync(tmp, next, { encoding: 'utf8', mode: 0o600 });
  renameSync(tmp, filePath);
  chmodSync(filePath, 0o600);
}

export function ensureGitignore(dir: string): void {
  const gi = resolve(dir, '.gitignore');
  let body = '';
  try {
    body = readFileSync(gi, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
  const lines = body.split(/\r?\n/);
  if (lines.some((line) => line.trim() === '.env' || line.trim() === '/.env')) return;
  const prefix = body.length === 0 || body.endsWith('\n') ? '' : '\n';
  writeFileSync(gi, `${body}${prefix}.env\n`, { encoding: 'utf8' });
}
