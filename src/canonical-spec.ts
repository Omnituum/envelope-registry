/**
 * Omni Canonical JSON -- Specification
 *
 * A dependency-free subset inspired by RFC 8785 (JCS).
 * This module documents the exact rules implemented by canonical.ts.
 *
 * Rules:
 *
 * 1. KEY ORDERING: Object keys are sorted lexicographically (Unicode codepoint
 *    order) at every nesting level, recursively.
 *
 * 2. ARRAY ORDERING: Arrays are order-preserving. Never sort array elements.
 *    Array indices are stable.
 *
 * 3. ALLOWED VALUE TYPES:
 *    - string: serialized as JSON string with minimal escaping (RFC 8259)
 *    - boolean: true or false
 *    - null: only when explicitly required by schema
 *    - object: recursively canonicalized
 *    - array: elements recursively canonicalized, order preserved
 *    - NUMBERS ARE FORBIDDEN in Omni envelope surfaces. Both canonicalString()
 *      and validateOmniEnvelope() treat numbers as errors.
 *
 * 4. MISSING/UNDEFINED FIELDS: Omitted entirely from output. Never serialized
 *    as null unless the schema explicitly marks the field as nullable.
 *
 * 5. STRING NORMALIZATION: None. Strings are serialized byte-for-byte.
 *    Consumers MUST NOT assume NFC/NFD.
 *
 * 6. NO WHITESPACE: No spaces, no newlines. Compact JSON only.
 *
 * 7. FIELD PROJECTION: Before canonicalization, the envelope is projected to
 *    include only crypto-relevant fields for its version.
 */

import type { OmniVersionString } from './versions.js';
import { OMNI_VERSIONS } from './versions.js';

/**
 * Projected fields per Omni version.
 * Only these fields appear in the canonical output.
 */
export const PROJECTION_FIELDS: Record<OmniVersionString, readonly string[]> = {
  [OMNI_VERSIONS.ENVELOPE_V1]: [
    'aead', 'ciphertext', 'contentNonce', 'meta', 'recipients', 'scheme', 'v',
  ],
  [OMNI_VERSIONS.HYBRID_V1]: [
    'aead', 'ciphertext', 'contentNonce', 'kyberKemCt', 'kyberWrap',
    'meta', 'suite', 'v', 'x25519Epk', 'x25519Wrap',
  ],
} as const;

/**
 * Meta fields projected per version (only crypto-relevant meta).
 */
export const META_PROJECTION: Record<OmniVersionString, readonly string[]> = {
  [OMNI_VERSIONS.ENVELOPE_V1]: ['createdAt'],
  [OMNI_VERSIONS.HYBRID_V1]: ['createdAt'],
} as const;
