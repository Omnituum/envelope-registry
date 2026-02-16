import type { AnyOmniEnvelope } from './types/union.js';
import type { OmniVersionString } from './versions.js';
import { OMNI_VERSIONS } from './versions.js';
import { PROJECTION_FIELDS, META_PROJECTION } from './canonical-spec.js';
import { EnvelopeError } from './errors.js';

/**
 * Recursively canonicalize a value according to Omni Canonical JSON rules.
 * - Object keys sorted lexicographically
 * - Arrays order-preserved
 * - Numbers FORBIDDEN (throws)
 * - undefined/missing fields omitted
 * - No whitespace
 */
function canonicalValue(value: unknown, path: string): string {
  if (value === null) return 'null';
  if (value === undefined) throw new EnvelopeError(`Unexpected undefined at ${path}`);

  switch (typeof value) {
    case 'string':
      return JSON.stringify(value);
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number':
      throw new EnvelopeError(
        `Number found at ${path} -- numbers are forbidden in Omni Canonical JSON`,
      );
    case 'object': {
      if (Array.isArray(value)) {
        const items = value.map((item, i) => canonicalValue(item, `${path}[${i}]`));
        return `[${items.join(',')}]`;
      }
      const obj = value as Record<string, unknown>;
      const keys = Object.keys(obj)
        .filter(k => obj[k] !== undefined)
        .sort();
      const pairs = keys.map(k => `${JSON.stringify(k)}:${canonicalValue(obj[k], `${path}.${k}`)}`);
      return `{${pairs.join(',')}}`;
    }
    default:
      throw new EnvelopeError(`Unsupported type ${typeof value} at ${path}`);
  }
}

/**
 * Project an envelope to only its crypto-relevant fields for a given version.
 */
function projectEnvelope(
  envelope: AnyOmniEnvelope,
  version: OmniVersionString,
): Record<string, unknown> {
  const fields = PROJECTION_FIELDS[version];
  const metaFields = META_PROJECTION[version];
  const env = envelope as unknown as Record<string, unknown>;
  const projected: Record<string, unknown> = {};

  for (const field of fields) {
    if (field === 'meta') {
      // Project meta separately to strip app-semantic fields
      const meta = env.meta as Record<string, unknown> | undefined;
      if (meta) {
        const projectedMeta: Record<string, unknown> = {};
        for (const mf of metaFields) {
          if (meta[mf] !== undefined) {
            projectedMeta[mf] = meta[mf];
          }
        }
        projected.meta = projectedMeta;
      }
    } else if (field === 'recipients' && Array.isArray(env.recipients)) {
      // For envelope v1: strip hint from recipients, keep only wraps
      projected.recipients = (env.recipients as Array<Record<string, unknown>>).map(r => {
        const rec: Record<string, unknown> = {};
        if (r.wraps !== undefined) rec.wraps = r.wraps;
        return rec;
      });
    } else if (env[field] !== undefined) {
      projected[field] = env[field];
    }
  }

  return projected;
}

/**
 * Produce a deterministic UTF-8 string for signing/hashing.
 * Implements Omni Canonical JSON (see canonical-spec.ts).
 * Only projects crypto-relevant fields for the given Omni version.
 */
export function canonicalString(envelope: AnyOmniEnvelope): string {
  const version = envelope.v as OmniVersionString;

  if (!(version in PROJECTION_FIELDS)) {
    throw new EnvelopeError(`No projection defined for version: ${version}`);
  }

  const projected = projectEnvelope(envelope, version);
  return canonicalValue(projected, '$');
}

/**
 * Convenience: canonicalString() encoded via globalThis.TextEncoder.
 * Callers in environments without TextEncoder should use canonicalString() directly.
 */
export function canonicalBytes(envelope: AnyOmniEnvelope): Uint8Array {
  const str = canonicalString(envelope);
  return new globalThis.TextEncoder().encode(str);
}
