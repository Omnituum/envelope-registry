import type { OmniVersionString } from './versions.js';
import { OMNI_VERSIONS, isOmniVersion, isDeprecatedVersion } from './versions.js';

export interface ValidationResult {
  valid: boolean;
  version: OmniVersionString | null;
  errors: string[];
  warnings: string[];
}

const ISO_8601_LOOSE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/;

function isPlausibleBase64(s: string): boolean {
  return /^[A-Za-z0-9+/]+=*$/.test(s) && s.length > 0;
}

function isPlausibleHex(s: string): boolean {
  return /^[0-9a-fA-F]+$/.test(s) && s.length > 0 && s.length % 2 === 0;
}

function hasNumberValues(obj: unknown, path: string, errors: string[]): void {
  if (obj === null || obj === undefined) return;
  if (typeof obj === 'number') {
    errors.push(`Number found at ${path} -- numbers are forbidden in Omni envelopes`);
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => hasNumberValues(item, `${path}[${i}]`, errors));
    return;
  }
  if (typeof obj === 'object') {
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      hasNumberValues(val, `${path}.${key}`, errors);
    }
  }
}

function validateOmniKeyWrap(
  wrap: unknown,
  name: string,
  errors: string[],
  warnings: string[],
): void {
  if (!wrap || typeof wrap !== 'object') {
    errors.push(`${name} must be an object`);
    return;
  }
  const w = wrap as Record<string, unknown>;
  if (typeof w.nonce !== 'string') {
    errors.push(`${name}.nonce must be a string`);
  } else if (!isPlausibleBase64(w.nonce)) {
    warnings.push(`${name}.nonce does not look like valid base64`);
  }
  if (typeof w.wrapped !== 'string') {
    errors.push(`${name}.wrapped must be a string`);
  } else if (!isPlausibleBase64(w.wrapped)) {
    warnings.push(`${name}.wrapped does not look like valid base64`);
  }
}

function validateRecipientWraps(
  wraps: unknown,
  path: string,
  errors: string[],
  warnings: string[],
): void {
  if (!wraps || typeof wraps !== 'object') {
    errors.push(`${path}.wraps must be an object`);
    return;
  }
  const w = wraps as Record<string, unknown>;

  if (w.kyber !== undefined) {
    if (!w.kyber || typeof w.kyber !== 'object') {
      errors.push(`${path}.wraps.kyber must be an object`);
    } else {
      const k = w.kyber as Record<string, unknown>;
      for (const field of ['kemCt', 'wrapNonce', 'wrappedCk']) {
        if (typeof k[field] !== 'string') {
          errors.push(`${path}.wraps.kyber.${field} must be a string`);
        }
      }
    }
  }

  if (w.x25519 !== undefined) {
    if (!w.x25519 || typeof w.x25519 !== 'object') {
      errors.push(`${path}.wraps.x25519 must be an object`);
    } else {
      const x = w.x25519 as Record<string, unknown>;
      for (const field of ['epk', 'wrapNonce', 'wrappedCk']) {
        if (typeof x[field] !== 'string') {
          errors.push(`${path}.wraps.x25519.${field} must be a string`);
        }
      }
    }
  }

  if (w.kyber === undefined && w.x25519 === undefined) {
    errors.push(`${path}.wraps must contain at least one of kyber or x25519`);
  }
}

function validateEnvelopeV1(
  env: Record<string, unknown>,
  errors: string[],
  warnings: string[],
): void {
  if (typeof env.scheme !== 'string') {
    errors.push('Missing or invalid field: scheme');
  }
  if (typeof env.aead !== 'string') {
    errors.push('Missing or invalid field: aead');
  }
  if (typeof env.contentNonce !== 'string') {
    errors.push('Missing or invalid field: contentNonce');
  } else if (!isPlausibleBase64(env.contentNonce as string)) {
    warnings.push('contentNonce does not look like valid base64');
  }
  if (typeof env.ciphertext !== 'string') {
    errors.push('Missing or invalid field: ciphertext');
  } else if (!isPlausibleBase64(env.ciphertext as string)) {
    warnings.push('ciphertext does not look like valid base64');
  }

  if (!Array.isArray(env.recipients)) {
    errors.push('Missing or invalid field: recipients (must be array)');
  } else {
    env.recipients.forEach((r: unknown, i: number) => {
      if (!r || typeof r !== 'object') {
        errors.push(`recipients[${i}] must be an object`);
        return;
      }
      const rec = r as Record<string, unknown>;
      validateRecipientWraps(rec.wraps, `recipients[${i}]`, errors, warnings);
    });
  }

  // meta
  if (!env.meta || typeof env.meta !== 'object') {
    errors.push('Missing or invalid field: meta');
  } else {
    const meta = env.meta as Record<string, unknown>;
    if (typeof meta.createdAt !== 'string') {
      errors.push('meta.createdAt must be a string');
    } else if (!ISO_8601_LOOSE.test(meta.createdAt as string)) {
      warnings.push('meta.createdAt does not look like ISO 8601');
    }
  }

  // Check for numbers in projected fields
  hasNumberValues(env.scheme, 'scheme', errors);
  hasNumberValues(env.aead, 'aead', errors);
  hasNumberValues(env.contentNonce, 'contentNonce', errors);
  hasNumberValues(env.ciphertext, 'ciphertext', errors);
  hasNumberValues(env.recipients, 'recipients', errors);
  hasNumberValues(env.meta, 'meta', errors);
}

function validateHybridV1(
  env: Record<string, unknown>,
  errors: string[],
  warnings: string[],
): void {
  if (typeof env.suite !== 'string') {
    errors.push('Missing or invalid field: suite');
  }
  if (typeof env.aead !== 'string') {
    errors.push('Missing or invalid field: aead');
  }
  if (typeof env.x25519Epk !== 'string') {
    errors.push('Missing or invalid field: x25519Epk');
  } else if (!isPlausibleHex(env.x25519Epk as string)) {
    warnings.push('x25519Epk does not look like valid hex');
  }
  validateOmniKeyWrap(env.x25519Wrap, 'x25519Wrap', errors, warnings);
  if (typeof env.kyberKemCt !== 'string') {
    errors.push('Missing or invalid field: kyberKemCt');
  } else if (!isPlausibleBase64(env.kyberKemCt as string)) {
    warnings.push('kyberKemCt does not look like valid base64');
  }
  validateOmniKeyWrap(env.kyberWrap, 'kyberWrap', errors, warnings);
  if (typeof env.contentNonce !== 'string') {
    errors.push('Missing or invalid field: contentNonce');
  } else if (!isPlausibleBase64(env.contentNonce as string)) {
    warnings.push('contentNonce does not look like valid base64');
  }
  if (typeof env.ciphertext !== 'string') {
    errors.push('Missing or invalid field: ciphertext');
  } else if (!isPlausibleBase64(env.ciphertext as string)) {
    warnings.push('ciphertext does not look like valid base64');
  }

  // meta
  if (!env.meta || typeof env.meta !== 'object') {
    errors.push('Missing or invalid field: meta');
  } else {
    const meta = env.meta as Record<string, unknown>;
    if (typeof meta.createdAt !== 'string') {
      errors.push('meta.createdAt must be a string');
    } else if (!ISO_8601_LOOSE.test(meta.createdAt as string)) {
      warnings.push('meta.createdAt does not look like ISO 8601');
    }
  }

  // Check for numbers in projected fields
  hasNumberValues(env.suite, 'suite', errors);
  hasNumberValues(env.aead, 'aead', errors);
  hasNumberValues(env.x25519Epk, 'x25519Epk', errors);
  hasNumberValues(env.x25519Wrap, 'x25519Wrap', errors);
  hasNumberValues(env.kyberKemCt, 'kyberKemCt', errors);
  hasNumberValues(env.kyberWrap, 'kyberWrap', errors);
  hasNumberValues(env.contentNonce, 'contentNonce', errors);
  hasNumberValues(env.ciphertext, 'ciphertext', errors);
  hasNumberValues(env.meta, 'meta', errors);
}

/**
 * Structural validation only. No signature verification, no decryption.
 * Numbers in projected fields are errors (not warnings).
 * meta.createdAt: validates "is string, looks like ISO 8601" only.
 */
export function validateOmniEnvelope(input: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!input || typeof input !== 'object') {
    return { valid: false, version: null, errors: ['Input must be an object'], warnings };
  }

  const env = input as Record<string, unknown>;

  if (typeof env.v !== 'string') {
    return { valid: false, version: null, errors: ['Missing or invalid version field "v"'], warnings };
  }

  // Check deprecated
  if (isDeprecatedVersion(env.v)) {
    return {
      valid: false,
      version: null,
      errors: [],
      warnings: [`Deprecated version: ${env.v}`],
    };
  }

  if (!isOmniVersion(env.v)) {
    return {
      valid: false,
      version: null,
      errors: [`Not an Omni version: "${env.v}"`],
      warnings,
    };
  }

  const version = env.v as OmniVersionString;

  switch (version) {
    case OMNI_VERSIONS.ENVELOPE_V1:
      validateEnvelopeV1(env, errors, warnings);
      break;
    case OMNI_VERSIONS.HYBRID_V1:
      validateHybridV1(env, errors, warnings);
      break;
    default: {
      const _exhaustive: never = version;
      errors.push(`Unknown version: ${_exhaustive}`);
    }
  }

  return {
    valid: errors.length === 0,
    version,
    errors,
    warnings,
  };
}
