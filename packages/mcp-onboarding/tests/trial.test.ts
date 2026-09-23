import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { solvePow } from '../src/pow.js';
import { resetStartTrialLock, startTrial } from '../src/trial.js';

const FAKE = `sw_live_${'cd'.repeat(20)}`;
const TOKEN = 'sw-pow-vector-v1';
const BITS = 12;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('startTrial', () => {
  it('mints, writes .env, and never returns the bearer', async () => {
    resetStartTrialLock();
    const dir = mkdtempSync(join(tmpdir(), 'sw-onboarding-trial-'));
    const envPath = join(dir, '.env');
    const calls: string[] = [];
    const result = await startTrial({
      cwd: dir,
      homedir: '/Users/nobody',
      envFile: envPath,
      fetchImpl: async (input) => {
        const url = String(input);
        calls.push(url);
        if (url.endsWith('/developer/keys/trial/challenge')) {
          return jsonResponse(200, { challenge_token: TOKEN, difficulty_bits: BITS });
        }
        if (url.endsWith('/developer/keys/trial')) {
          return jsonResponse(200, {
            api_key: FAKE,
            claim_ticket: 'sw_claim_testticket',
            claim_url: `https://smarterweather.com/claim#key=${FAKE}`,
          });
        }
        return jsonResponse(404, {});
      },
    });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.key_prefix).toBe(FAKE.slice(0, 12));
      expect(result.env_path).toBe(envPath);
      expect(result.claim_ticket).toBe('sw_claim_testticket');
      expect(result.claim_url).toBeUndefined();
      expect(result.consume).toContain('set -a');
      const dumped = JSON.stringify(result);
      expect(dumped.includes(FAKE)).toBe(false);
      expect(dumped.includes('#key=')).toBe(false);
    }
    expect(readFileSync(envPath, 'utf8').includes(FAKE)).toBe(true);
    expect(calls).toHaveLength(2);
  });

  it('is already_configured when the key is set', async () => {
    resetStartTrialLock();
    const dir = mkdtempSync(join(tmpdir(), 'sw-onboarding-trial-'));
    let minted = 0;
    const result = await startTrial({
      cwd: dir,
      homedir: '/Users/nobody',
      processEnvKey: FAKE,
      fetchImpl: async () => {
        minted += 1;
        return jsonResponse(500, {});
      },
    });
    expect(result.status).toBe('already_configured');
    if (result.status === 'already_configured') {
      expect(result.key_prefix).toBe(FAKE.slice(0, 12));
      expect(JSON.stringify(result).includes(FAKE)).toBe(false);
    }
    expect(minted).toBe(0);
  });

  it('shares one mint across concurrent calls', async () => {
    resetStartTrialLock();
    const dir = mkdtempSync(join(tmpdir(), 'sw-onboarding-trial-'));
    let mints = 0;
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.endsWith('/challenge')) {
        return jsonResponse(200, { challenge_token: TOKEN, difficulty_bits: BITS });
      }
      mints += 1;
      await new Promise((r) => setTimeout(r, 20));
      return jsonResponse(200, { api_key: FAKE });
    };
    const [ra, rb] = await Promise.all([
      startTrial({ cwd: dir, homedir: '/Users/nobody', fetchImpl }),
      startTrial({ cwd: dir, homedir: '/Users/nobody', fetchImpl }),
    ]);
    expect(ra.status).toBe('ok');
    expect(rb.status).toBe('ok');
    expect(mints).toBe(1);
  });

  it('maps a 404 challenge to trial_unavailable', async () => {
    resetStartTrialLock();
    const dir = mkdtempSync(join(tmpdir(), 'sw-onboarding-trial-'));
    const result = await startTrial({
      cwd: dir,
      homedir: '/Users/nobody',
      fetchImpl: async () => jsonResponse(404, {}),
    });
    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.error).toBe('trial_unavailable');
  });

  it('uses the shared PoW vector against the challenge token', () => {
    expect(solvePow(TOKEN, BITS)).toBe('10961');
  });
});
