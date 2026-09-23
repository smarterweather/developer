import { createHash } from 'node:crypto';

export function verifyPow(token: string, solution: string, bits: number): boolean {
  if (!/^\d{1,20}$/.test(solution)) return false;
  const digest = createHash('sha256').update(`${token}:${solution}`, 'utf8').digest();
  return leadingZeroBits(digest) >= bits;
}

export function leadingZeroBits(digest: Buffer): number {
  let bits = 0;
  for (const byte of digest) {
    if (byte === 0) {
      bits += 8;
      continue;
    }
    let b = byte;
    while ((b & 0x80) === 0) {
      bits += 1;
      b <<= 1;
    }
    break;
  }
  return bits;
}

export function solvePow(token: string, bits: number): string {
  for (let n = 0; n < Number.MAX_SAFE_INTEGER; n++) {
    const s = String(n);
    if (verifyPow(token, s, bits)) return s;
  }
  throw new Error('solvePow: exhausted');
}
