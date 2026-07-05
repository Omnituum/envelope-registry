import { describe, it, expect } from 'vitest';
import { parseOmniEnvelope } from '../src/parse.js';
import { validateOmniEnvelope } from '../src/validate.js';
import { isOmniHybridV2 } from '../src/guards.js';
import { canonicalString } from '../src/canonical.js';
import { OMNI_VERSIONS, getVersionMeta } from '../src/versions.js';
import hybridV2Fixture from './fixtures/omni-hybrid-v2.json';

describe('OmniHybridV2', () => {
  it('parses a valid OmniHybridV2', () => {
    const result = parseOmniEnvelope(hybridV2Fixture);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.v).toBe(OMNI_VERSIONS.HYBRID_V2);
    }
  });

  it('validates a valid OmniHybridV2 with no errors', () => {
    const result = validateOmniEnvelope(hybridV2Fixture);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('guard accepts v2 and rejects v1-shaped input', () => {
    expect(isOmniHybridV2(hybridV2Fixture)).toBe(true);
    expect(isOmniHybridV2({ ...hybridV2Fixture, v: 'omnituum.hybrid.v1' })).toBe(false);
  });

  it('rejects v2 missing ckWrap', () => {
    const { ckWrap: _ckWrap, ...rest } = hybridV2Fixture as Record<string, unknown>;
    const result = validateOmniEnvelope(rest);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('ckWrap'))).toBe(true);
  });

  it('rejects v2 carrying v1 dual-wrap fields as suite mismatch', () => {
    const result = validateOmniEnvelope({ ...hybridV2Fixture, suite: 'x25519+kyber768' });
    expect(result.valid).toBe(false);
  });

  it('canonicalizes v2 with sorted keys and projected fields only', () => {
    const canon = canonicalString(hybridV2Fixture as never);
    expect(canon.startsWith('{"aead":')).toBe(true);
    expect(canon).toContain('"ckWrap":');
    expect(canon).not.toContain('senderName');
  });

  it('registers HYBRID_V1 as legacy and HYBRID_V2 as active', () => {
    expect(getVersionMeta(OMNI_VERSIONS.HYBRID_V1)?.lifecycle).toBe('legacy');
    expect(getVersionMeta(OMNI_VERSIONS.HYBRID_V2)?.lifecycle).toBe('active');
  });
});
