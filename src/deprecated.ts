import { DEPRECATED_VERSIONS } from './versions.js';

/**
 * List of deprecated version strings that may appear on the wire.
 * These are recognized but not supported for new envelope creation.
 */
export const DEPRECATED_VERSION_LIST: readonly string[] = Object.values(DEPRECATED_VERSIONS);
