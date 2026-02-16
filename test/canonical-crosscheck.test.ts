import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import {
  canonicalString,
  canonicalBytes,
  parseOmniEnvelope,
  validateOmniEnvelope,
} from '../src/index.js';
import type { OmniHybridV1 } from '../src/types/omnituum-hybrid-v1.js';

// Synthetic fixture (from Phase 1)
import syntheticFixture from './fixtures/omni-hybrid-v1.json';
import syntheticCanonical from './fixtures/omni-hybrid-v1-canonical.json';

// Real fixtures extracted from frozen repos (read-only source material)
import realHybrid001 from './fixtures/real/real-hybrid-001.json';
import realHybrid002 from './fixtures/real/real-hybrid-002.json';
import realHybrid003 from './fixtures/real/real-hybrid-003-reordered.json';
import goldenCanonicals from './fixtures/real/golden-canonical-strings.json';
import goldenHash from './fixtures/real/real-hybrid-002-golden.json';

/**
 * Phase 1a: Canonicalization Cross-Validation Gate
 *
 * HARD GATE: No consumer adoption until all assertions pass.
 *
 * Background on pqc-shared's existing serialization:
 * - omnituum.hybrid.v1 has NO signature field and NO signing canonicalization
 * - The only existing serialization is `JSON.stringify(envelope)` for SHA-256
 *   integrity hashing in golden test vectors (natural key order, all fields)
 * - The registry introduces a NEW canonical form: sorted keys, projected
 *   fields (strips app-semantic meta like senderName/senderId)
 *
 * This gate proves:
 * 1. Real fixtures from frozen repos parse and validate correctly
 * 2. The pqc-shared JSON.stringify integrity hash is preserved (fixture integrity)
 * 3. Registry canonical output is deterministic and order-independent
 * 4. App-semantic fields are correctly stripped
 * 5. Golden canonical strings are established as the reference
 *
 * If any test fails, fix the registry to match expectations, NOT the fixtures.
 */

const realFixtures = [
  {
    name: 'real-hybrid-001',
    data: realHybrid001,
    source: 'Loggie_SDK/apps/marketing-pilot/test-vectors/encrypted.test.json',
    hasAppSemanticMeta: false,
  },
  {
    name: 'real-hybrid-002',
    data: realHybrid002,
    source: 'Omnituum/pqc-shared/tests/golden/envelope.json (envelope key)',
    hasAppSemanticMeta: true,
  },
  {
    name: 'real-hybrid-003-reordered',
    data: realHybrid003,
    source: 'Same as 002, field order reversed to test canonical normalization',
    hasAppSemanticMeta: true,
  },
];

describe('Phase 1a: Canonicalization cross-validation gate', () => {
  // ── Section 1: Synthetic fixture (from Phase 1 build) ──

  describe('synthetic fixture baseline', () => {
    it('canonical string matches Phase 1 golden fixture', () => {
      const result = canonicalString(syntheticFixture as unknown as OmniHybridV1);
      expect(result).toBe(syntheticCanonical.expectedCanonicalString);
    });

    it('canonical bytes match Phase 1 golden bytes', () => {
      const resultBytes = canonicalBytes(syntheticFixture as unknown as OmniHybridV1);
      const expectedBytes = new TextEncoder().encode(syntheticCanonical.expectedCanonicalString);
      expect(resultBytes).toEqual(expectedBytes);
    });
  });

  // ── Section 2: Real fixtures parse and validate ──

  describe('real fixtures parse and validate', () => {
    for (const fixture of realFixtures) {
      it(`${fixture.name} parses as valid OmniHybridV1`, () => {
        const result = parseOmniEnvelope(fixture.data);
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.v).toBe('omnituum.hybrid.v1');
        }
      });

      it(`${fixture.name} passes structural validation`, () => {
        const result = validateOmniEnvelope(fixture.data);
        expect(result.valid).toBe(true);
        expect(result.version).toBe('omnituum.hybrid.v1');
        expect(result.errors).toEqual([]);
      });
    }
  });

  // ── Section 3: pqc-shared JSON.stringify hash integrity ──

  describe('pqc-shared envelope hash integrity', () => {
    it('JSON.stringify(real-hybrid-002) SHA-256 matches golden vector envelopeHash', () => {
      // This proves the fixture is byte-identical to the frozen golden vector.
      // pqc-shared computes: toHex(sha256(JSON.stringify(envelope)))
      const jsonStr = JSON.stringify(realHybrid002);
      const hash = createHash('sha256').update(jsonStr).digest('hex');
      expect(hash).toBe(goldenHash.envelopeHash);
    });
  });

  // ── Section 4: Registry canonical determinism ──

  describe('registry canonical determinism', () => {
    for (const fixture of realFixtures) {
      it(`${fixture.name} canonical output is stable across calls`, () => {
        const env = fixture.data as unknown as OmniHybridV1;
        const str1 = canonicalString(env);
        const str2 = canonicalString(env);
        expect(str1).toBe(str2);

        const bytes1 = canonicalBytes(env);
        const bytes2 = canonicalBytes(env);
        expect(bytes1).toEqual(bytes2);
      });
    }

    it('canonical output is key-order-independent (002 vs 003-reordered)', () => {
      const canonical002 = canonicalString(realHybrid002 as unknown as OmniHybridV1);
      const canonical003 = canonicalString(realHybrid003 as unknown as OmniHybridV1);
      expect(canonical002).toBe(canonical003);
    });

    it('canonical bytes are key-order-independent (002 vs 003-reordered)', () => {
      const bytes002 = canonicalBytes(realHybrid002 as unknown as OmniHybridV1);
      const bytes003 = canonicalBytes(realHybrid003 as unknown as OmniHybridV1);
      expect(bytes002).toEqual(bytes003);
    });
  });

  // ── Section 5: Field projection ──

  describe('field projection strips app-semantic fields', () => {
    it('real-hybrid-002 canonical strips meta.senderName and meta.senderId', () => {
      // This fixture has meta: { createdAt, senderName, senderId }
      const result = canonicalString(realHybrid002 as unknown as OmniHybridV1);
      expect(result).not.toContain('senderName');
      expect(result).not.toContain('senderId');
      expect(result).not.toContain('Golden Test Identity');
      expect(result).not.toContain('1892e44e30ece5db22c3cad2f5b55544');
      // But createdAt MUST be present
      expect(result).toContain('createdAt');
      expect(result).toContain('2026-01-18T16:30:02.684Z');
    });

    it('real-hybrid-001 canonical includes only crypto-relevant fields', () => {
      // This fixture has no app-semantic meta fields
      const result = canonicalString(realHybrid001 as unknown as OmniHybridV1);
      const parsed = JSON.parse(result);
      const keys = Object.keys(parsed).sort();
      expect(keys).toEqual([
        'aead', 'ciphertext', 'contentNonce', 'kyberKemCt', 'kyberWrap',
        'meta', 'suite', 'v', 'x25519Epk', 'x25519Wrap',
      ]);
    });
  });

  // ── Section 6: Golden canonical string reference ──

  describe('golden canonical string byte-equality', () => {
    for (const fixture of realFixtures) {
      it(`${fixture.name} canonical string matches golden reference`, () => {
        const result = canonicalString(fixture.data as unknown as OmniHybridV1);
        const expected = (goldenCanonicals as Record<string, string>)[fixture.name];
        expect(result).toBe(expected);
      });

      it(`${fixture.name} canonical bytes match golden reference bytes`, () => {
        const resultBytes = canonicalBytes(fixture.data as unknown as OmniHybridV1);
        const expected = (goldenCanonicals as Record<string, string>)[fixture.name];
        const expectedBytes = new TextEncoder().encode(expected);
        expect(resultBytes).toEqual(expectedBytes);
      });
    }
  });

  // ── Section 7: Canonical form properties ──

  describe('canonical form properties', () => {
    it('all real fixtures produce compact JSON (no whitespace)', () => {
      for (const fixture of realFixtures) {
        const result = canonicalString(fixture.data as unknown as OmniHybridV1);
        expect(result).not.toMatch(/\n/);
        expect(result).not.toMatch(/: "/); // no space after colon
        expect(result).not.toMatch(/, "/); // no space after comma
      }
    });

    it('all real fixtures produce sorted keys at every level', () => {
      for (const fixture of realFixtures) {
        const result = canonicalString(fixture.data as unknown as OmniHybridV1);
        // Verify top-level keys are sorted
        const parsed = JSON.parse(result);
        const topKeys = Object.keys(parsed);
        expect(topKeys).toEqual([...topKeys].sort());

        // Verify nested keys are sorted (meta, wraps)
        if (parsed.x25519Wrap) {
          const wrapKeys = Object.keys(parsed.x25519Wrap);
          expect(wrapKeys).toEqual([...wrapKeys].sort());
        }
        if (parsed.kyberWrap) {
          const wrapKeys = Object.keys(parsed.kyberWrap);
          expect(wrapKeys).toEqual([...wrapKeys].sort());
        }
      }
    });

    it('no numbers appear in any canonical output', () => {
      for (const fixture of realFixtures) {
        const result = canonicalString(fixture.data as unknown as OmniHybridV1);
        // Numbers in JSON would appear as unquoted digits
        // All values should be strings (quoted) or objects/arrays
        // This regex catches bare numbers like :123, or [456,
        expect(result).not.toMatch(/[:\[,]-?\d+\.?\d*[,\}\]]/);
      }
    });
  });
});
