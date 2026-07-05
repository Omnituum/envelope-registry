// ─── OMNI VERSION STRINGS (SINGLE SOURCE OF TRUTH) ───
// Only omnituum.* versions live here. Loggie defines its own.

export const OMNI_VERSIONS = {
  ENVELOPE_V1: 'omnituum.envelope.v1',
  HYBRID_V1: 'omnituum.hybrid.v1',
  HYBRID_V2: 'omnituum.hybrid.v2',
} as const;

export type OmniVersionString = typeof OMNI_VERSIONS[keyof typeof OMNI_VERSIONS];

// ─── PER-VERSION METADATA ───

export interface VersionMeta {
  version: OmniVersionString;
  lifecycle: 'active' | 'legacy' | 'deprecated' | 'experimental';
  since: string;
  description: string;
}

export const VERSION_REGISTRY: readonly VersionMeta[] = [
  {
    version: OMNI_VERSIONS.ENVELOPE_V1,
    lifecycle: 'active',
    since: '2026-02-16',
    description: 'Generic crypto container with pluggable key wraps',
  },
  {
    // Legacy as of v2: the content key is wrapped independently under X25519
    // and Kyber, so possession of EITHER secret decrypts — security is
    // min(X25519, ML-KEM), which defeats the post-quantum goal. Read-only;
    // do not write new v1 envelopes.
    version: OMNI_VERSIONS.HYBRID_V1,
    lifecycle: 'legacy',
    since: '2025-01-01',
    description: 'Hybrid X25519+Kyber768 envelope with xsalsa20poly1305 AEAD (independent wraps — read-only)',
  },
  {
    version: OMNI_VERSIONS.HYBRID_V2,
    lifecycle: 'active',
    since: '2026-07-05',
    description:
      'Hybrid X25519+ML-KEM-1024 envelope, AND-combined KEK (single wrap under HKDF(ss_mlkem || ss_x25519) with transcript binding) — both primitives must be broken to unwrap',
  },
] as const;

// ─── DEPRECATED (recognize but warn) ───

export const DEPRECATED_VERSIONS = {
  PQC_DEMO_HYBRID_V1: 'pqc-demo.hybrid.v1',
} as const;

export type DeprecatedVersionString =
  typeof DEPRECATED_VERSIONS[keyof typeof DEPRECATED_VERSIONS];

// ─── HELPERS ───

export function isOmniVersion(v: string): v is OmniVersionString {
  return Object.values(OMNI_VERSIONS).includes(v as OmniVersionString);
}

export function isDeprecatedVersion(v: string): v is DeprecatedVersionString {
  return Object.values(DEPRECATED_VERSIONS).includes(v as DeprecatedVersionString);
}

export function getVersionMeta(v: OmniVersionString): VersionMeta | undefined {
  return VERSION_REGISTRY.find(m => m.version === v);
}
