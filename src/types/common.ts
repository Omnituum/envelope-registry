export type AeadAlgorithm = 'xsalsa20poly1305';
export type SealScheme = 'kyber' | 'x25519' | 'hybrid';
export type KemAlgorithm = 'kyber768' | 'kyber1024';
export type SigAlgorithm = 'dilithium3' | 'dilithium5';
export type SuiteString = 'x25519+kyber768' | 'x25519';

export interface KyberWrap {
  kemCt: string;
  wrapNonce: string;
  wrappedCk: string;
}

export interface X25519Wrap {
  epk: string;
  wrapNonce: string;
  wrappedCk: string;
}

export interface RecipientWraps {
  kyber?: KyberWrap;
  x25519?: X25519Wrap;
}

export interface OmniKeyWrap {
  nonce: string;
  wrapped: string;
}

export interface GenericSignature {
  algorithm: string;
  value: string;
  covers: string;
}
