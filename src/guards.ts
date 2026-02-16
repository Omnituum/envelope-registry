import type { OmniEnvelopeV1 } from './types/omnituum-envelope-v1.js';
import type { OmniHybridV1 } from './types/omnituum-hybrid-v1.js';
import { OMNI_VERSIONS } from './versions.js';

/**
 * Type guard for OmniEnvelopeV1.
 * Checks version discriminant and required structural fields.
 */
export function isOmniEnvelopeV1(env: unknown): env is OmniEnvelopeV1 {
  if (!env || typeof env !== 'object') return false;
  const e = env as Record<string, unknown>;
  return (
    e.v === OMNI_VERSIONS.ENVELOPE_V1 &&
    typeof e.scheme === 'string' &&
    typeof e.aead === 'string' &&
    typeof e.contentNonce === 'string' &&
    typeof e.ciphertext === 'string' &&
    Array.isArray(e.recipients) &&
    e.meta !== null &&
    typeof e.meta === 'object' &&
    typeof (e.meta as Record<string, unknown>).createdAt === 'string'
  );
}

/**
 * Type guard for OmniHybridV1.
 * Checks version discriminant and required structural fields.
 */
export function isOmniHybridV1(env: unknown): env is OmniHybridV1 {
  if (!env || typeof env !== 'object') return false;
  const e = env as Record<string, unknown>;
  return (
    e.v === OMNI_VERSIONS.HYBRID_V1 &&
    typeof e.suite === 'string' &&
    typeof e.aead === 'string' &&
    typeof e.x25519Epk === 'string' &&
    e.x25519Wrap !== null &&
    typeof e.x25519Wrap === 'object' &&
    typeof e.kyberKemCt === 'string' &&
    e.kyberWrap !== null &&
    typeof e.kyberWrap === 'object' &&
    typeof e.contentNonce === 'string' &&
    typeof e.ciphertext === 'string' &&
    e.meta !== null &&
    typeof e.meta === 'object' &&
    typeof (e.meta as Record<string, unknown>).createdAt === 'string'
  );
}
