// Version constants (Omni only)
export {
  OMNI_VERSIONS,
  VERSION_REGISTRY,
  DEPRECATED_VERSIONS,
  isOmniVersion,
  isDeprecatedVersion,
  getVersionMeta,
} from './versions.js';
export type {
  OmniVersionString,
  DeprecatedVersionString,
  VersionMeta,
} from './versions.js';

// Types (Omni containers only)
export type {
  OmniEnvelopeV1,
  OmniHybridV1,
  AnyOmniEnvelope,
} from './types/index.js';
export type {
  SealScheme,
  AeadAlgorithm,
  KemAlgorithm,
  SigAlgorithm,
  SuiteString,
  RecipientWraps,
  KyberWrap,
  X25519Wrap,
  OmniKeyWrap,
  GenericSignature,
} from './types/common.js';

// Runtime (pure functions, zero deps)
export { detectOmniVersion } from './detect.js';
export { parseOmniEnvelope } from './parse.js';
export type { ParseResult } from './parse.js';
export { validateOmniEnvelope } from './validate.js';
export type { ValidationResult } from './validate.js';
export { canonicalString, canonicalBytes } from './canonical.js';

// Type guards (separate module from detect)
export { isOmniEnvelopeV1, isOmniHybridV1 } from './guards.js';

// Errors
export { EnvelopeError, UnsupportedVersionError, ValidationError } from './errors.js';
