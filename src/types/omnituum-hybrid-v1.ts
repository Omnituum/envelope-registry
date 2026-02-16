import type { SuiteString, AeadAlgorithm, OmniKeyWrap } from './common.js';

/**
 * OmniHybridV1 -- hybrid X25519+Kyber768 envelope.
 * FROZEN: field-for-field match with HybridEnvelope from pqc-shared.
 * Note: meta.senderName and meta.senderId are app-semantic and excluded
 * from the Omni type. They may exist on the wire but are not projected
 * for canonicalization or validation.
 */
export interface OmniHybridV1 {
  v: 'omnituum.hybrid.v1';
  suite: SuiteString;
  aead: AeadAlgorithm;
  x25519Epk: string;
  x25519Wrap: OmniKeyWrap;
  kyberKemCt: string;
  kyberWrap: OmniKeyWrap;
  contentNonce: string;
  ciphertext: string;
  meta: { createdAt: string };
}
