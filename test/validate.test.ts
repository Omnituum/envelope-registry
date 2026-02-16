import { describe, it, expect } from 'vitest';
import { validateOmniEnvelope } from '../src/validate.js';
import { OMNI_VERSIONS } from '../src/versions.js';
import envelopeV1Fixture from './fixtures/omni-envelope-v1.json';
import hybridV1Fixture from './fixtures/omni-hybrid-v1.json';

describe('validateOmniEnvelope', () => {
  describe('valid inputs', () => {
    it('validates OmniEnvelopeV1 fixture', () => {
      const result = validateOmniEnvelope(envelopeV1Fixture);
      expect(result.valid).toBe(true);
      expect(result.version).toBe(OMNI_VERSIONS.ENVELOPE_V1);
      expect(result.errors).toEqual([]);
    });

    it('validates OmniHybridV1 fixture', () => {
      const result = validateOmniEnvelope(hybridV1Fixture);
      expect(result.valid).toBe(true);
      expect(result.version).toBe(OMNI_VERSIONS.HYBRID_V1);
      expect(result.errors).toEqual([]);
    });
  });

  describe('invalid inputs', () => {
    it('rejects null', () => {
      const result = validateOmniEnvelope(null);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejects non-object', () => {
      const result = validateOmniEnvelope(42);
      expect(result.valid).toBe(false);
    });

    it('rejects missing v field', () => {
      const result = validateOmniEnvelope({ aead: 'xsalsa20poly1305' });
      expect(result.valid).toBe(false);
    });

    it('rejects non-omni version string', () => {
      const result = validateOmniEnvelope({ v: 'loggie.seal.v1' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Not an Omni version');
    });

    it('rejects deprecated version with warning', () => {
      const result = validateOmniEnvelope({ v: 'pqc-demo.hybrid.v1' });
      expect(result.valid).toBe(false);
      expect(result.warnings[0]).toContain('Deprecated');
    });
  });

  describe('structural validation - OmniHybridV1', () => {
    it('errors on missing x25519Epk', () => {
      const env = { ...hybridV1Fixture, x25519Epk: undefined };
      const result = validateOmniEnvelope(env);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('x25519Epk'))).toBe(true);
    });

    it('errors on missing kyberKemCt', () => {
      const env = { ...hybridV1Fixture, kyberKemCt: undefined };
      const result = validateOmniEnvelope(env);
      expect(result.valid).toBe(false);
    });

    it('errors on missing meta', () => {
      const env = { ...hybridV1Fixture, meta: undefined };
      const result = validateOmniEnvelope(env);
      expect(result.valid).toBe(false);
    });

    it('errors on missing meta.createdAt', () => {
      const env = { ...hybridV1Fixture, meta: {} };
      const result = validateOmniEnvelope(env);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('createdAt'))).toBe(true);
    });

    it('warns on bad base64 in ciphertext', () => {
      const env = { ...hybridV1Fixture, ciphertext: '!!!invalid!!!' };
      const result = validateOmniEnvelope(env);
      expect(result.warnings.some(w => w.includes('ciphertext'))).toBe(true);
    });

    it('warns on bad hex in x25519Epk', () => {
      const env = { ...hybridV1Fixture, x25519Epk: 'ZZZZ' };
      const result = validateOmniEnvelope(env);
      expect(result.warnings.some(w => w.includes('x25519Epk'))).toBe(true);
    });
  });

  describe('numbers are forbidden', () => {
    it('errors on numeric field value', () => {
      const env = { ...hybridV1Fixture, ciphertext: 42 };
      const result = validateOmniEnvelope(env);
      expect(result.valid).toBe(false);
    });

    it('errors on number in meta', () => {
      const env = { ...hybridV1Fixture, meta: { createdAt: 12345 } };
      const result = validateOmniEnvelope(env);
      expect(result.valid).toBe(false);
    });
  });

  describe('createdAt validation', () => {
    it('accepts ISO 8601 date-only', () => {
      const env = { ...hybridV1Fixture, meta: { createdAt: '2026-02-16' } };
      const result = validateOmniEnvelope(env);
      expect(result.valid).toBe(true);
    });

    it('accepts ISO 8601 with time and Z', () => {
      const env = { ...hybridV1Fixture, meta: { createdAt: '2026-02-16T12:00:00Z' } };
      const result = validateOmniEnvelope(env);
      expect(result.valid).toBe(true);
    });

    it('accepts future timestamps (no policy rejection)', () => {
      const env = { ...hybridV1Fixture, meta: { createdAt: '2099-12-31T23:59:59Z' } };
      const result = validateOmniEnvelope(env);
      expect(result.valid).toBe(true);
    });

    it('warns on non-ISO format string', () => {
      const env = { ...hybridV1Fixture, meta: { createdAt: 'not-a-date' } };
      const result = validateOmniEnvelope(env);
      expect(result.valid).toBe(true); // still valid (structural), just warns
      expect(result.warnings.some(w => w.includes('ISO 8601'))).toBe(true);
    });
  });
});
