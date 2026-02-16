import { describe, it, expect } from 'vitest';
import { parseOmniEnvelope } from '../src/parse.js';
import { OMNI_VERSIONS } from '../src/versions.js';
import envelopeV1Fixture from './fixtures/omni-envelope-v1.json';
import hybridV1Fixture from './fixtures/omni-hybrid-v1.json';

describe('parseOmniEnvelope', () => {
  it('parses a valid OmniEnvelopeV1', () => {
    const result = parseOmniEnvelope(envelopeV1Fixture);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.v).toBe(OMNI_VERSIONS.ENVELOPE_V1);
    }
  });

  it('parses a valid OmniHybridV1', () => {
    const result = parseOmniEnvelope(hybridV1Fixture);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.v).toBe(OMNI_VERSIONS.HYBRID_V1);
    }
  });

  it('rejects null input', () => {
    const result = parseOmniEnvelope(null);
    expect(result.ok).toBe(false);
  });

  it('rejects non-object input', () => {
    const result = parseOmniEnvelope('not an object');
    expect(result.ok).toBe(false);
  });

  it('rejects object without v field', () => {
    const result = parseOmniEnvelope({ foo: 'bar' });
    expect(result.ok).toBe(false);
  });

  it('rejects loggie.* version strings', () => {
    const result = parseOmniEnvelope({ v: 'loggie.seal.v1' });
    expect(result.ok).toBe(false);
  });

  it('rejects deprecated version strings', () => {
    const result = parseOmniEnvelope({ v: 'pqc-demo.hybrid.v1' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.name).toBe('UnsupportedVersionError');
    }
  });

  it('rejects envelope with missing required fields', () => {
    const result = parseOmniEnvelope({
      v: OMNI_VERSIONS.HYBRID_V1,
      suite: 'x25519+kyber768',
      // missing everything else
    });
    expect(result.ok).toBe(false);
  });

  it('round-trips: parsed value matches input structure', () => {
    const result = parseOmniEnvelope(hybridV1Fixture);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.aead).toBe('xsalsa20poly1305');
      expect(result.value.meta.createdAt).toBe('2025-06-15T10:30:00Z');
    }
  });
});
