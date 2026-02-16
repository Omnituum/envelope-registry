import type { OmniVersionString } from './versions.js';
import { isOmniVersion } from './versions.js';

/**
 * Detect the Omni version string from an unknown input.
 * Returns null for non-objects, missing `v`, or non-omnituum.* version strings.
 * Does NOT validate structure. Does NOT throw.
 */
export function detectOmniVersion(input: unknown): OmniVersionString | null {
  if (!input || typeof input !== 'object') return null;
  const v = (input as Record<string, unknown>).v;
  if (typeof v !== 'string') return null;
  return isOmniVersion(v) ? v : null;
}
