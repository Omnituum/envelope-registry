import { describe, it, expect } from 'vitest';
import { canonicalString, canonicalBytes } from '../src/canonical.js';
import type { OmniHybridV1 } from '../src/types/omnituum-hybrid-v1.js';
import type { OmniEnvelopeV1 } from '../src/types/omnituum-envelope-v1.js';
import hybridV1Fixture from './fixtures/omni-hybrid-v1.json';
import canonicalFixture from './fixtures/omni-hybrid-v1-canonical.json';

describe('canonicalString', () => {
  it('produces deterministic output for OmniHybridV1', () => {
    const result1 = canonicalString(hybridV1Fixture as unknown as OmniHybridV1);
    const result2 = canonicalString(hybridV1Fixture as unknown as OmniHybridV1);
    expect(result1).toBe(result2);
  });

  it('matches golden canonical fixture for OmniHybridV1', () => {
    const result = canonicalString(hybridV1Fixture as unknown as OmniHybridV1);
    expect(result).toBe(canonicalFixture.expectedCanonicalString);
  });

  it('sorts keys lexicographically', () => {
    const result = canonicalString(hybridV1Fixture as unknown as OmniHybridV1);
    const parsed = JSON.parse(result);
    const keys = Object.keys(parsed);
    const sorted = [...keys].sort();
    expect(keys).toEqual(sorted);
  });

  it('strips app-semantic meta fields (senderName, senderId)', () => {
    const result = canonicalString(hybridV1Fixture as unknown as OmniHybridV1);
    expect(result).not.toContain('senderName');
    expect(result).not.toContain('senderId');
    expect(result).toContain('createdAt');
  });

  it('produces compact JSON (no whitespace)', () => {
    const result = canonicalString(hybridV1Fixture as unknown as OmniHybridV1);
    // No spaces after colons or commas
    expect(result).not.toMatch(/: "/);
    expect(result).not.toMatch(/, "/);
  });

  it('throws on numbers in envelope', () => {
    const badEnvelope = {
      ...hybridV1Fixture,
      ciphertext: 42,
    };
    expect(() => canonicalString(badEnvelope as unknown as OmniHybridV1)).toThrow(
      'numbers are forbidden',
    );
  });

  it('works for OmniEnvelopeV1', () => {
    const envelope: OmniEnvelopeV1 = {
      v: 'omnituum.envelope.v1',
      scheme: 'hybrid',
      aead: 'xsalsa20poly1305',
      contentNonce: 'dGVzdA==',
      ciphertext: 'dGVzdA==',
      recipients: [
        {
          hint: { label: 'alice' },
          wraps: {
            kyber: { kemCt: 'a2VtQ3Q=', wrapNonce: 'bm9uY2U=', wrappedCk: 'd3JhcHBlZA==' },
          },
        },
      ],
      meta: { createdAt: '2026-02-16T00:00:00Z' },
    };
    const result = canonicalString(envelope);

    // hint should be stripped in projection (only wraps kept)
    expect(result).not.toContain('alice');
    expect(result).toContain('wraps');

    // Keys should be sorted
    const parsed = JSON.parse(result);
    expect(Object.keys(parsed)).toEqual(Object.keys(parsed).sort());
  });

  it('preserves array order in recipients', () => {
    const envelope: OmniEnvelopeV1 = {
      v: 'omnituum.envelope.v1',
      scheme: 'hybrid',
      aead: 'xsalsa20poly1305',
      contentNonce: 'dGVzdA==',
      ciphertext: 'dGVzdA==',
      recipients: [
        { wraps: { kyber: { kemCt: 'Zmlyc3Q=', wrapNonce: 'bm9uY2U=', wrappedCk: 'Y2s=' } } },
        { wraps: { kyber: { kemCt: 'c2Vjb25k', wrapNonce: 'bm9uY2U=', wrappedCk: 'Y2s=' } } },
      ],
      meta: { createdAt: '2026-02-16T00:00:00Z' },
    };
    const result = canonicalString(envelope);
    const firstIdx = result.indexOf('Zmlyc3Q=');
    const secondIdx = result.indexOf('c2Vjb25k');
    expect(firstIdx).toBeLessThan(secondIdx);
  });
});

describe('canonicalBytes', () => {
  it('returns Uint8Array', () => {
    const result = canonicalBytes(hybridV1Fixture as unknown as OmniHybridV1);
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('matches TextEncoder encoding of canonicalString', () => {
    const str = canonicalString(hybridV1Fixture as unknown as OmniHybridV1);
    const bytes = canonicalBytes(hybridV1Fixture as unknown as OmniHybridV1);
    const expected = new TextEncoder().encode(str);
    expect(bytes).toEqual(expected);
  });
});
