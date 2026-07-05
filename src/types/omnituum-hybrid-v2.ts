import type { OmniKeyWrap } from './common.js';

/**
 * OmniHybridV2 -- hybrid X25519+ML-KEM-1024 envelope with an AND-combined KEK.
 *
 * v1's defect: the content key was wrapped independently under X25519 and
 * Kyber, so EITHER secret alone unwrapped it — effective security was
 * min(X25519, ML-KEM), and a quantum break of X25519 defeated the envelope
 * despite the ML-KEM wrap. v2 wraps the content key exactly once, under a
 * KEK derived from BOTH shared secrets together:
 *
 *   KEK = HKDF-SHA256(
 *     ikm  = ss_mlkem || ss_x25519,
 *     salt = 'omnituum/hybrid-v2',
 *     info = 'wrap-ck|' + x25519Epk + '|' + kyberKemCt,   // transcript binding
 *   )
 *
 * Unwrapping requires recovering both shared secrets — breaking either
 * primitive alone is insufficient (X-Wing-style combiner). The transcript
 * binding in `info` ties the KEK to this envelope's own KEM values, so a
 * spliced epk/ciphertext from another envelope derives a different KEK and
 * fails authentication.
 *
 * FROZEN: field-for-field match with HybridEnvelopeV2 in pqc-shared.
 * meta.senderName / meta.senderId are app-semantic and excluded here.
 */
export interface OmniHybridV2 {
  v: 'omnituum.hybrid.v2';
  suite: 'x25519+mlkem1024';
  aead: 'xsalsa20poly1305';
  /** X25519 ephemeral public key (hex) */
  x25519Epk: string;
  /** ML-KEM-1024 KEM ciphertext (base64) */
  kyberKemCt: string;
  /** Single wrap of the content key under the AND-combined KEK */
  ckWrap: OmniKeyWrap;
  contentNonce: string;
  ciphertext: string;
  meta: { createdAt: string };
}
