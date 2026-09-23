import { createRequire } from 'node:module';
import {
  checkAlreadyConfigured,
  resolveSinkTarget,
  trackedEnvError,
  writeNewKey,
  type AlreadyConfigured,
} from './sink.js';
import { displayPrefix, readExistingKey } from './env.js';
import { solvePow } from './pow.js';

const require = createRequire(import.meta.url);

interface PackageJsonShape {
  version: string;
}

const pkg = require('../package.json') as PackageJsonShape;

export const DEFAULT_KEY_API_BASE = 'https://api.smarterweather.com';

export type StartTrialOk = {
  status: 'ok';
  key_prefix: string;
  env_path: string;
  claim_ticket?: string;
  claim_url?: string;
  claim_expires_at?: string;
  expires_at?: string;
  limits?: unknown;
  consume: string;
};

export type StartTrialAlready = AlreadyConfigured;

export type StartTrialErr = {
  status: 'error';
  error:
    | 'already_configured'
    | 'trial_unavailable'
    | 'terms'
    | 'challenge'
    | 'rate_limited'
    | 'network'
    | 'env_path'
    | 'mint_failed';
  detail?: string;
};

export type StartTrialResult = StartTrialOk | StartTrialAlready | StartTrialErr;

export type StartTrialDeps = {
  fetchImpl?: typeof fetch;
  keyApiBase?: string;
  envFile?: string;
  processEnvKey?: string;
  rootUris?: string[];
  cwd: string;
  homedir: string;
};

type ChallengeBody = {
  challenge_token?: string;
  difficulty_bits?: number;
};

type MintOkBody = {
  api_key?: string;
  claim_ticket?: string;
  claim_url?: string;
  claim_expires_at?: string;
  expires_at?: string;
  limits?: unknown;
};

let inFlight: Promise<StartTrialResult> | undefined;

export function startTrial(deps: StartTrialDeps): Promise<StartTrialResult> {
  if (inFlight) return inFlight;
  inFlight = runStartTrial(deps).finally(() => {
    inFlight = undefined;
  });
  return inFlight;
}

export function resetStartTrialLock(): void {
  inFlight = undefined;
}

export const TRIAL_CONSUME =
  'set -a; . ./.env; set +a; curl -sS -H "Authorization: Bearer $SMARTERWEATHER_API_KEY" \'https://api.smarterweather.com/v1/weather?lat=41.66&lon=-91.53\'. Do not cat .env. Restart the weather MCP with SMARTERWEATHER_API_KEY set.';

async function runStartTrial(deps: StartTrialDeps): Promise<StartTrialResult> {
  const target = resolveSinkTarget(deps);
  if (!target.ok) {
    return { status: 'error', error: 'env_path', detail: target.error };
  }
  const tracked = trackedEnvError(target.path);
  if (tracked) return { status: 'error', error: 'env_path', detail: tracked };

  const already = checkAlreadyConfigured(deps.processEnvKey, target.path);
  if (already) return already;

  const fetchImpl = deps.fetchImpl ?? fetch;
  const base = (deps.keyApiBase ?? DEFAULT_KEY_API_BASE).replace(/\/$/, '');

  let challenge: ChallengeBody;
  try {
    const res = await fetchImpl(`${base}/developer/keys/trial/challenge`, {
      method: 'GET',
      headers: { accept: 'application/json' },
    });
    if (res.status === 404) {
      return { status: 'error', error: 'trial_unavailable' };
    }
    if (res.status === 429) {
      return { status: 'error', error: 'rate_limited' };
    }
    if (!res.ok) {
      return { status: 'error', error: 'challenge', detail: `HTTP ${res.status}` };
    }
    challenge = (await res.json()) as ChallengeBody;
  } catch (err) {
    return { status: 'error', error: 'network', detail: (err as Error).message };
  }

  if (typeof challenge.challenge_token !== 'string' || typeof challenge.difficulty_bits !== 'number') {
    return { status: 'error', error: 'challenge', detail: 'malformed challenge' };
  }

  const solution = solvePow(challenge.challenge_token, challenge.difficulty_bits);

  let minted: MintOkBody;
  try {
    const res = await fetchImpl(`${base}/developer/keys/trial`, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({
        challenge_token: challenge.challenge_token,
        solution,
        accept_terms: true,
        client: { name: '@smarterweather/mcp-onboarding', version: pkg.version },
      }),
    });
    if (res.status === 404) {
      return { status: 'error', error: 'trial_unavailable' };
    }
    if (res.status === 429) {
      return { status: 'error', error: 'rate_limited' };
    }
    if (res.status === 400) {
      const problem = (await res.json().catch(() => ({}))) as { type?: string };
      if (typeof problem.type === 'string' && problem.type.includes('terms-not-accepted')) {
        return { status: 'error', error: 'terms' };
      }
      return { status: 'error', error: 'challenge', detail: 'mint rejected' };
    }
    if (!res.ok) {
      return { status: 'error', error: 'mint_failed', detail: `HTTP ${res.status}` };
    }
    minted = (await res.json()) as MintOkBody;
  } catch (err) {
    return { status: 'error', error: 'network', detail: (err as Error).message };
  }

  if (typeof minted.api_key !== 'string' || minted.api_key.length < 16) {
    return { status: 'error', error: 'mint_failed', detail: 'mint response missing api_key' };
  }

  try {
    const written = writeNewKey(target.path, minted.api_key);
    const result: StartTrialOk = {
      status: 'ok',
      key_prefix: written.key_prefix,
      env_path: written.env_path,
      consume: TRIAL_CONSUME,
    };
    if (typeof minted.claim_ticket === 'string' && minted.claim_ticket.startsWith('sw_claim_')) {
      result.claim_ticket = minted.claim_ticket;
    }
    if (typeof minted.claim_url === 'string' && minted.claim_url.includes('#ticket=')) {
      result.claim_url = minted.claim_url;
    }
    if (typeof minted.claim_expires_at === 'string') result.claim_expires_at = minted.claim_expires_at;
    if (typeof minted.expires_at === 'string') result.expires_at = minted.expires_at;
    if (minted.limits !== undefined) result.limits = minted.limits;
    return result;
  } catch (err) {
    if ((err as Error).message.includes('already set')) {
      const again = readExistingKey(target.path);
      return {
        status: 'already_configured',
        key_prefix: displayPrefix(again ?? minted.api_key),
        source: 'env_file',
        env_path: target.path,
      };
    }
    return {
      status: 'error',
      error: 'env_path',
      detail: `trial key ${displayPrefix(minted.api_key)} was minted but could not be written (${(err as Error).message}); it expires unclaimed. Fix the path and retry.`,
    };
  }
}
