import type { AnyOmniEnvelope } from './types/union.js';
import type { OmniEnvelopeV1 } from './types/omnituum-envelope-v1.js';
import type { OmniHybridV1 } from './types/omnituum-hybrid-v1.js';
import { detectOmniVersion } from './detect.js';
import { validateOmniEnvelope } from './validate.js';
import { EnvelopeError, UnsupportedVersionError } from './errors.js';
import { OMNI_VERSIONS } from './versions.js';
import { isDeprecatedVersion } from './versions.js';

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: EnvelopeError };

/**
 * Parse an unknown input into a typed Omni envelope.
 * Single dispatch: detect version -> validate structure -> return typed or error.
 */
export function parseOmniEnvelope(input: unknown): ParseResult<AnyOmniEnvelope> {
  const version = detectOmniVersion(input);

  if (version === null) {
    // Check if it's a deprecated version
    if (input && typeof input === 'object') {
      const v = (input as Record<string, unknown>).v;
      if (typeof v === 'string' && isDeprecatedVersion(v)) {
        return { ok: false, error: new UnsupportedVersionError(v) };
      }
    }
    return {
      ok: false,
      error: new EnvelopeError('Input is not a recognized Omni envelope'),
    };
  }

  const validation = validateOmniEnvelope(input);
  if (!validation.valid) {
    return {
      ok: false,
      error: new EnvelopeError(
        `Validation failed for ${version}: ${validation.errors.join('; ')}`,
      ),
    };
  }

  // At this point, validation passed -- safe to cast
  switch (version) {
    case OMNI_VERSIONS.ENVELOPE_V1:
      return { ok: true, value: input as OmniEnvelopeV1 };
    case OMNI_VERSIONS.HYBRID_V1:
      return { ok: true, value: input as OmniHybridV1 };
    default: {
      const _exhaustive: never = version;
      return { ok: false, error: new UnsupportedVersionError(String(_exhaustive)) };
    }
  }
}
