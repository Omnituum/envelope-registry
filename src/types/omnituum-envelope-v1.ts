import type { SealScheme, AeadAlgorithm, RecipientWraps, GenericSignature } from './common.js';

export interface OmniEnvelopeV1 {
  v: 'omnituum.envelope.v1';
  scheme: SealScheme;
  aead: AeadAlgorithm;
  contentNonce: string;
  ciphertext: string;
  recipients: Array<{
    hint?: Record<string, string>;
    wraps: RecipientWraps;
  }>;
  signature?: GenericSignature;
  meta: { createdAt: string };
}
