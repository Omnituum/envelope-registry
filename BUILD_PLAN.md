# Build Plan: `@omnituum/envelope-registry` (v2.1 -- final)

> **Revision history:**
> - v1 (2026-02-16): Initial plan from codebase audit
> - v2 (2026-02-16): 10 corrections applied -- scope boundary enforcement, canonicalization spec, monorepo strategy, test gates
> - v2.1 (2026-02-16): 3 adjustments -- defer OmniWrapperV1, tighten createdAt/number validation, lock Phase 0 decision
> - v2.2 (2026-02-16): Extraction mode -- `Loggie_SDK/` frozen read-only, all work in `loggie-sdk/` + `Omnituum/`, explicit copy/extract steps

---

## 0. Design Principle (Non-Negotiable)

**Omni owns generic ciphertext container shapes. Loggie owns its own protocol formats that embed or extend Omni containers.**

The registry defines: Omni-namespaced version strings (`omnituum.*`), field schemas for generic crypto containers, structural validators, and canonicalization rules for Omni containers only.

The registry does NOT define: Loggie version strings, thread semantics, inbox routing, recipient identity resolution, message ordering, storage paths, UI behavior, or application-level protocol formats. Those live in `@loggiecid/*`.

**Litmus test:** If a version string starts with `loggie.*`, it does not belong in this package. Omni is not IANA for Loggie protocols. Loggie types may *reference* Omni container types via `extends` or embedding, but Omni never declares Loggie's formats.

---

## 1. Package Layout

```
Omnituum/envelope-registry/
├── package.json                     # @omnituum/envelope-registry
├── tsconfig.json
├── tsup.config.ts
├── LICENSE
├── src/
│   ├── index.ts                     # Public barrel export
│   ├── versions.ts                  # Omni version strings only
│   ├── types/
│   │   ├── index.ts                 # Re-exports all Omni types
│   │   ├── common.ts                # Shared field types (WrapBlock, AeadAlgorithm, etc.)
│   │   ├── omnituum-envelope-v1.ts  # OmniEnvelopeV1 -- generic crypto container base
│   │   ├── omnituum-hybrid-v1.ts    # OmniHybridV1 -- specific hybrid flavor
│   │   └── union.ts                 # AnyOmniEnvelope union
│   ├── detect.ts                    # detectOmniVersion(unknown) → OmniVersionString | null
│   ├── guards.ts                    # Per-type type guards (separate from detect)
│   ├── parse.ts                     # parseOmniEnvelope(unknown) → Result<AnyOmniEnvelope>
│   ├── validate.ts                  # validateOmniEnvelope(unknown) → ValidationResult
│   ├── canonical.ts                 # canonicalString / canonicalBytes for Omni containers
│   ├── canonical-spec.ts            # Formal canonicalization rules (RFC 8785-subset)
│   ├── errors.ts                    # EnvelopeError, UnsupportedVersionError, etc.
│   └── deprecated.ts               # DEPRECATED_VERSIONS list
├── schemas/                         # Optional JSON Schema exports
│   ├── omnituum.envelope.v1.json
│   └── omnituum.hybrid.v1.json
└── test/
    ├── parse.test.ts
    ├── validate.test.ts
    ├── canonical.test.ts
    ├── canonical-crosscheck.test.ts # GATE: current impl bytes == registry bytes
    └── fixtures/
        ├── omni-envelope-v1.json
        ├── omni-hybrid-v1.json
        └── omni-hybrid-v1-canonical.json  # includes expected canonical bytes
```

### `package.json` shape

```json
{
  "name": "@omnituum/envelope-registry",
  "version": "0.1.0",
  "type": "module",
  "sideEffects": false,
  "exports": {
    ".":        { "types": "./dist/index.d.ts", "import": "./dist/index.js", "require": "./dist/index.cjs" },
    "./schemas": { "import": "./schemas/index.js", "require": "./schemas/index.cjs" }
  },
  "dependencies": {},
  "devDependencies": { "tsup": "...", "typescript": "...", "vitest": "..." }
}
```

**Hard constraints:**
- `dependencies: {}` -- zero runtime dependencies
- `sideEffects: false` -- tree-shakeable
- No `tweetnacl`, no `@noble/*`, no WASM, no Node.js builtins in production code
- `globalThis.TextEncoder` is the only runtime requirement (Node 18+, all browsers) -- documented in README
- `canonicalString()` is the primary export; `canonicalBytes()` wraps it with `globalThis.TextEncoder` and callers in older environments can encode the string themselves

---

## 2. Version Registry Design (`src/versions.ts`)

```ts
// ─── OMNI VERSION STRINGS (SINGLE SOURCE OF TRUTH) ───
// Only omnituum.* versions live here. Loggie defines its own.

export const OMNI_VERSIONS = {
  ENVELOPE_V1: 'omnituum.envelope.v1',   // generic crypto container base
  HYBRID_V1:   'omnituum.hybrid.v1',     // specific hybrid flavor (existing)
} as const;

export type OmniVersionString = typeof OMNI_VERSIONS[keyof typeof OMNI_VERSIONS];

// ─── PER-VERSION METADATA (not policy lists) ───

export interface VersionMeta {
  version: OmniVersionString;
  lifecycle: 'active' | 'legacy' | 'deprecated' | 'experimental';
  since: string;          // ISO date of introduction
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
    version: OMNI_VERSIONS.HYBRID_V1,
    lifecycle: 'active',
    since: '2025-01-01',
    description: 'Hybrid X25519+Kyber768 envelope with xsalsa20poly1305 AEAD',
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

export function getVersionMeta(v: OmniVersionString): VersionMeta | undefined {
  return VERSION_REGISTRY.find(m => m.version === v);
}
```

### What changed from v1 plan

- **Removed:** `LOGGIE_SEAL_V1`, `LOGGIE_SEAL_V1_1`, `LOGGIE_HYBRID_V2`, `LOGGIE_INTAKE_V1` -- these are Loggie's to define
- **Removed:** `ACTIVE_VERSIONS`, `LEGACY_VERSIONS`, `ALL_VERSIONS` lists -- these are product policy, not registry concerns
- **Added:** `VERSION_REGISTRY` with per-version metadata (lifecycle, since, description) -- consumers can filter by lifecycle themselves
- **Added:** `omnituum.envelope.v1` as a new generic container base type
- **Removed:** `omnituum.wrapper.v1` -- not shipping in v1 (no non-Loggie consumer exists)

### Where Loggie versions live now

In `@loggiecid/core` (or a new `@loggiecid/protocol` if preferred):

```ts
// @loggiecid/core/src/versions.ts
import { OMNI_VERSIONS } from '@omnituum/envelope-registry';

export const LOGGIE_VERSIONS = {
  SEAL_V1:     'loggie.seal.v1',
  SEAL_V1_1:   'loggie.seal.v1.1',
  HYBRID_V2:   'loggie.hybrid.v2',
  INTAKE_V1:   'loggie.intake.v1',
} as const;

export type LoggieVersionString = typeof LOGGIE_VERSIONS[keyof typeof LOGGIE_VERSIONS];

// Combined: everything this product recognizes
export type AnyKnownVersion = LoggieVersionString | import('@omnituum/envelope-registry').OmniVersionString;

// Product policy lives here, not in Omni
export const SUPPORTED_VERSIONS: readonly AnyKnownVersion[] = [ ... ];
```

---

## 3. Type Design (`src/types/`)

### Boundary rule (tightened from v1)

Omni types define **generic crypto container structure**. No product-specific field names.

| Field category | In Omni registry? | Example |
|---|---|---|
| Version discriminant (`v`) | Yes (omnituum.* only) | `"omnituum.hybrid.v1"` |
| Algorithm identifiers | Yes | `suite`, `aead` |
| Ciphertext + nonce | Yes | `ciphertext`, `contentNonce` |
| Key wraps (per recipient) | Yes | `wraps.kyber`, `wraps.x25519` |
| Recipient hint (opaque) | Yes (generic) | `hint?: Record<string, string>` |
| `meta.createdAt` | Yes (structural only) | Validate: is string, looks like ISO 8601. Do NOT reject on future/old timestamps (that's app policy) |
| Signatures | Yes (generic) | `signature: { algorithm, value, covers }` |
| Thread/message/inbox fields | **No** | Loggie extension |
| Sender identity fields | **No** (except as opaque hint) | Loggie extension |
| `meta.messageId`, `meta.threadId` | **No** | Loggie extension |

### Common types (`common.ts`)

```ts
export type AeadAlgorithm = 'xsalsa20poly1305';
export type SealScheme = 'kyber' | 'x25519' | 'hybrid';
export type KemAlgorithm = 'kyber768' | 'kyber1024';
export type SigAlgorithm = 'dilithium3' | 'dilithium5';
export type SuiteString = 'x25519+kyber768' | 'x25519';

export interface KyberWrap {
  kemCt: string;       // base64
  wrapNonce: string;   // base64
  wrappedCk: string;   // base64
}

export interface X25519Wrap {
  epk: string;         // hex
  wrapNonce: string;   // base64
  wrappedCk: string;   // base64
}

export interface RecipientWraps {
  kyber?: KyberWrap;
  x25519?: X25519Wrap;
}

// Omnituum-native wraps (used in OmniHybridV1)
export interface OmniKeyWrap {
  nonce: string;       // base64
  wrapped: string;     // base64
}

export interface GenericSignature {
  algorithm: string;
  value: string;       // base64
  covers: string;      // describes what is signed
}
```

### Per-version interfaces

**`OmniEnvelopeV1`** -- generic crypto container base:
```ts
export interface OmniEnvelopeV1 {
  v: 'omnituum.envelope.v1';
  scheme: SealScheme;
  aead: AeadAlgorithm;
  contentNonce: string;                              // base64
  ciphertext: string;                                // base64
  recipients: Array<{
    hint?: Record<string, string>;                   // opaque key-lookup hints
    wraps: RecipientWraps;
  }>;
  signature?: GenericSignature;
  meta: { createdAt: string };                       // ISO 8601
}
```

**`OmniHybridV1`** -- existing hybrid envelope (FROZEN from `pqc-shared`):
```ts
export interface OmniHybridV1 {
  v: 'omnituum.hybrid.v1';
  suite: SuiteString;
  aead: AeadAlgorithm;
  x25519Epk: string;                                // hex
  x25519Wrap: OmniKeyWrap;
  kyberKemCt: string;                                // base64
  kyberWrap: OmniKeyWrap;
  contentNonce: string;                              // base64
  ciphertext: string;                                // base64
  meta: { createdAt: string };                       // ISO 8601 -- no app semantics
}
```

> **Wrapper note:** `OmniWrapperV1` (`omnituum.wrapper.v1`) is not shipped in v1 of this package.
> If a non-Loggie product needs a generic opaque wrapper, add it then with the minimal shape
> `{ v, payload: string }`. Until then, `loggie.intake.v1` stays purely Loggie-owned.

### Discriminated union (`union.ts`)

```ts
export type AnyOmniEnvelope = OmniEnvelopeV1 | OmniHybridV1;
```

### Where Loggie envelope types live now

In `@loggiecid/core` (NOT in Omni registry):

```ts
// @loggiecid/core/src/types/envelopes.ts
import type { OmniEnvelopeV1, RecipientWraps } from '@omnituum/envelope-registry';

// Loggie seal v1 -- embeds Omni container pattern but uses Loggie version string
export interface LoggieSealV1 {
  v: 'loggie.seal.v1';
  aead: 'xsalsa20poly1305';
  contentNonce: string;
  ciphertext: string;
  recipients: Array<{ hint?: { wallet?: string; name?: string; cid?: string }; wraps: RecipientWraps }>;
  recipient?: /* ... */;
  meta: { createdAt: string };
}

// Loggie seal v1.1 -- extends crypto container with app semantics
export interface LoggieSealV1_1 {
  v: 'loggie.seal.v1.1';
  scheme: 'kyber' | 'x25519' | 'hybrid';
  crypto: { kem: 'kyber768' | 'kyber1024'; sig: 'dilithium3' | 'dilithium5'; aead: 'xsalsa20poly1305' };
  sender: { wallet: string; keyId: string; dilithiumPubKey: string; name?: string };
  recipients: Array<{ wallet: string; keyId: string; name?: string; wraps: RecipientWraps }>;
  envelope: { contentNonce: string; ciphertext: string };
  signature: { algorithm: 'dilithium3'; value: string; covers: string };
  meta: { createdAt: string; messageId: string; threadId: string; replyTo?: string | null };
}

// Loggie hybrid v2
export interface LoggieHybridV2 {
  v: 'loggie.hybrid.v2';
  scheme: 'hybrid';
  aead: 'xsalsa20poly1305';
  contentNonce: string;
  ciphertext: string;
  recipients: Array<{ hint?: { label?: string; wallet?: string; name?: string; cid?: string }; wraps: RecipientWraps }>;
  thread: { threadId: string; replyTo?: string; sequence?: number; parentHash?: string };
  metadata: { createdAt: string; mime?: string; senderIdentityCid: string; senderName?: string; senderWallet?: string };
  signatures: { ecdsa: string; dilithium?: string; envelopeHash: string };
}

// Loggie intake wrapper (product transport, NOT in Omni)
export interface LoggieIntakeV1 {
  v: 'loggie.intake.v1';
  id: string;
  pqcUsed: boolean;
  encrypted: string;  // JSON-stringified inner envelope
}

export type AnyLoggieEnvelope = LoggieSealV1 | LoggieSealV1_1 | LoggieHybridV2;
export type AnyLoggieParseable = AnyLoggieEnvelope | LoggieIntakeV1;
```

### Resolving the `SealedEnvelopeV2` name collision

Loggie defines unambiguous names in `@loggiecid/core`:

| Old name (collides) | Package | New Loggie name |
|---|---|---|
| `SealedEnvelopeV2` in `core/src/types/index.ts` | Core | `LoggieSealV1` (it uses v: `loggie.seal.v1`, the "rich" format) |
| `SealedEnvelopeV2` in `core/src/crypto/envelope/types.ts` | Core | `LoggieHybridV2` |
| `SealedEnvelopeV2` in `messaging/src/types.ts` | Messaging | `LoggieHybridV2` (re-export from core) |

Old names can be preserved as deprecated type aliases during migration.

---

## 4. API Surface (Exports)

### `src/index.ts` barrel

```ts
// Version constants (Omni only)
export { OMNI_VERSIONS, VERSION_REGISTRY, DEPRECATED_VERSIONS,
         isOmniVersion, getVersionMeta } from './versions.js';
export type { OmniVersionString, DeprecatedVersionString, VersionMeta } from './versions.js';

// Types (Omni containers only)
export type { OmniEnvelopeV1, OmniHybridV1,
              AnyOmniEnvelope } from './types/index.js';
export type { SealScheme, AeadAlgorithm, KemAlgorithm, SigAlgorithm, SuiteString,
              RecipientWraps, KyberWrap, X25519Wrap, OmniKeyWrap,
              GenericSignature } from './types/common.js';

// Runtime (pure functions, zero deps)
export { detectOmniVersion } from './detect.js';
export { parseOmniEnvelope } from './parse.js';
export { validateOmniEnvelope } from './validate.js';
export { canonicalString, canonicalBytes } from './canonical.js';

// Type guards (separate module from detect)
export { isOmniEnvelopeV1, isOmniHybridV1 } from './guards.js';

// Errors
export { EnvelopeError, UnsupportedVersionError, ValidationError } from './errors.js';
```

### Function signatures

```ts
// --- detect.ts ---
// Thin: only detects version string, nothing else.
function detectOmniVersion(input: unknown): OmniVersionString | null;
// Returns null for non-objects, missing `v`, or non-omnituum.* version strings.
// Does NOT validate structure. Does NOT throw.

// --- guards.ts (separate from detect) ---
function isOmniEnvelopeV1(env: unknown): env is OmniEnvelopeV1;
function isOmniHybridV1(env: unknown): env is OmniHybridV1;

// --- parse.ts ---
type ParseResult<T> = { ok: true; value: T } | { ok: false; error: EnvelopeError };

function parseOmniEnvelope(input: unknown): ParseResult<AnyOmniEnvelope>;
// Single dispatch: detect version -> validate structure -> return typed or error.

// --- validate.ts ---
interface ValidationResult {
  valid: boolean;
  version: OmniVersionString | null;
  errors: string[];
  warnings: string[];
}

function validateOmniEnvelope(input: unknown): ValidationResult;
// Structural validation only. No signature verification, no decryption.
// Checks: version string, required fields present, field types correct,
// base64/hex encoding plausible, nonce lengths plausible.
// Numbers anywhere in projected fields → error (not warning).
// meta.createdAt → validate "is string, looks like ISO 8601" only.
//   Do NOT reject on future/old timestamps (that's application policy).

// --- canonical.ts ---
function canonicalString(envelope: AnyOmniEnvelope): string;
// Primary export. Returns deterministic UTF-8 string for signing/hashing.
// Implements Omni Canonical JSON (see Section 4a).
// Only projects crypto-relevant fields for the given Omni version.

function canonicalBytes(envelope: AnyOmniEnvelope): Uint8Array;
// Convenience: canonicalString() encoded via globalThis.TextEncoder.
// Callers in environments without TextEncoder should use canonicalString() directly.
```

### 4a. Canonicalization Specification (`canonical-spec.ts`)

**Omni Canonical JSON** -- a dependency-free subset inspired by RFC 8785 (JCS).

Rules (MUST be implemented exactly):

1. **Key ordering:** Object keys are sorted lexicographically (Unicode codepoint order) at every nesting level, recursively.

2. **Array ordering:** Arrays are order-preserving. Never sort array elements. Array indices are stable.

3. **Allowed value types:**
   - `string` -- serialized as JSON string with minimal escaping (RFC 8259)
   - `boolean` -- `true` or `false`
   - `null` -- only when explicitly required by schema
   - `object` -- recursively canonicalized
   - `array` -- elements recursively canonicalized, order preserved
   - **Numbers are FORBIDDEN** in Omni envelope surfaces. Both `canonicalString()` AND `validateOmniEnvelope()` treat numbers as errors (not warnings). This prevents objects that validate but can't canonicalize. All numeric data (nonces, sizes) must be encoded as strings (base64, hex, or decimal string).

4. **Missing/undefined fields:** Omitted entirely from output. Never serialized as `null` unless the schema explicitly marks the field as `nullable`. Optional fields that are `undefined` produce no key.

5. **String normalization:** No Unicode normalization is applied. Strings are serialized byte-for-byte as provided. Consumers MUST NOT assume NFC/NFD.

6. **No whitespace:** No spaces, no newlines. Compact JSON only.

7. **Field projection:** Before canonicalization, the envelope is projected to include only crypto-relevant fields for its version. App-semantic extension fields (even if present on the object) are stripped.

Projection rules per Omni version:

| Version | Projected fields (these become the canonical object) |
|---|---|
| `omnituum.envelope.v1` | `{ aead, ciphertext, contentNonce, meta: { createdAt }, recipients: [{ wraps }], scheme, v }` |
| `omnituum.hybrid.v1` | `{ aead, ciphertext, contentNonce, kyberKemCt, kyberWrap, meta: { createdAt }, suite, v, x25519Epk, x25519Wrap }` |

**Loggie canonicalization:** Loggie defines its own `canonicalString()` per Loggie version in `@loggiecid/core`. Loggie MAY use the same algorithm (Omni Canonical JSON) but applies its own field projections. This keeps canonicalization logic close to the signing code that consumes it.

---

## 5. Treatment of Specific Versions

### `loggie.intake.v1` -- Loggie product, NOT in Omni registry

**Decision:** Loggie owns `loggie.intake.v1` entirely. It lives in `@loggiecid/core` as `LoggieIntakeV1`. Omni does not ship a wrapper type. Omni only validates the inner crypto container (if it's an `omnituum.*` envelope).

### `loggie.hybrid.v2` -- Loggie product, Loggie decides

**Decision:** Not in Omni registry. Loggie keeps it in `@loggiecid/core` as `LoggieHybridV2`.

Loggie should decide whether to:
- Wire it into `seal-unified.ts` as a production path, OR
- Mark it `lifecycle: 'experimental'` in Loggie's own version metadata

Frontend detection arrays that reference it are correct Loggie product policy -- driven by `@loggiecid/core` exports, not Omni.

### `loggie.seal.v1` and `loggie.seal.v1.1` -- Loggie product, Loggie defines

These are Loggie application formats. They import `RecipientWraps`, `KyberWrap`, `X25519Wrap` and other common types from the Omni registry (shared field taxonomy), but their version strings and full shapes are defined in `@loggiecid/core`.

### `pqc-demo.hybrid.v1` -- Deprecated, recognized by Omni

Listed in Omni's `DEPRECATED_VERSIONS`. `detectOmniVersion()` returns `null` for it. `isDeprecatedVersion()` returns `true`. `validateOmniEnvelope()` returns `{ valid: false, warnings: ["deprecated version: pqc-demo.hybrid.v1"] }`.

### `omnituum.hybrid.v1` -- Existing, FROZEN in Omni

Migrated from `pqc-shared/src/version.ts` into the registry. The `HybridEnvelope` interface in `pqc-shared` becomes a re-export of `OmniHybridV1` from the registry.

### `omnituum.envelope.v1` -- NEW generic container

A new abstract container that Loggie (or any product) can embed. This is the type that replaces the need for Omni to define Loggie-specific types. If a product wants to build on Omni crypto containers, they target this interface.

---

## 6. Migration Plan (Ordered Steps)

### Phase 0: Extraction-Only Policy

> **`Loggie_SDK/` is frozen. It is a museum snapshot.**

| Rule | Enforcement |
|---|---|
| **Allowed:** `cp`, `rsync`, read, reference from `Loggie_SDK/` | Use as source material for extraction |
| **Forbidden:** Any modification to any file under `Loggie_SDK/` | No edits, no refactors, no "quick fixes," no import rewires |
| **`loggie-sdk/` is the canonical SDK** | All new envelope code is written here |
| **`Omnituum/` is the crypto substrate** | Owns `omnituum.*` containers, shared taxonomy |

There are no `[MIRROR]` steps. Nothing is applied to both repos. `Loggie_SDK/` is read-only source material.

### Phase 1: Create the Omni registry package (no consumers yet) — **COMPLETED 2026-02-16**

| Step | Done when |
|---|---|
| 1.1 Create `Omnituum/envelope-registry/` directory structure | Directory exists with `package.json`, `tsconfig.json`, `tsup.config.ts` |
| 1.2 Write `src/versions.ts` with Omni-only version strings + metadata | `OMNI_VERSIONS` exported, zero `loggie.*` strings |
| 1.3 Write `src/types/common.ts` with shared field types | Types compile, zero imports from outside |
| 1.4 Write `src/types/omnituum-envelope-v1.ts` (new generic container) | Type has `v` as literal discriminant |
| 1.5 **Extract** `HybridEnvelope` interface from `Omnituum/pqc-shared/src/crypto/hybrid.ts` into `src/types/omnituum-hybrid-v1.ts` as `OmniHybridV1` | Matches existing `HybridEnvelope` field-for-field |
| 1.6 Write `src/types/union.ts` with `AnyOmniEnvelope` | TS narrowing works on `v` field |
| 1.7 Write `src/detect.ts` with `detectOmniVersion()` | Returns `OmniVersionString \| null` |
| 1.8 Write `src/guards.ts` with per-type guards | Separate from detect, no circular exports |
| 1.9 Write `src/parse.ts` with `parseOmniEnvelope()` | Single dispatch table for Omni types |
| 1.10 Write `src/validate.ts` with structural validation | Validates field presence, types, encoding formats; numbers in projected fields = error |
| 1.11 Write `src/canonical-spec.ts` documenting the exact canonicalization algorithm | RFC 8785-subset rules documented as code comments + exported constants |
| 1.12 Write `src/canonical.ts` implementing Omni Canonical JSON | Recursive sorted keys, arrays stable, numbers forbidden, no whitespace |
| 1.13 Write `src/errors.ts` | Error classes defined |
| 1.14 Write `src/index.ts` barrel | Clean re-exports, no side effects |
| 1.15 Add golden fixture files (one per Omni version) including expected canonical bytes | Fixtures parse and validate correctly |
| 1.16 Write tests: parse round-trip, validate rejects bad input, canonical stability | All tests pass |
| 1.17 Build with tsup, verify output | `dist/` contains ESM + CJS + `.d.ts`, zero runtime deps confirmed |
| 1.18 Optional: generate JSON Schema files from TS types | Schema files exist in `schemas/` |

### Phase 1a: Canonicalization cross-validation gate — **PASSED 2026-02-16**

> **This is a hard gate. Do not proceed to Phase 2 until it passes.** — **GATE PASSED.**

| Step | Done when |
|---|---|
| 1a.1 **Read** golden envelopes from existing tests in `Loggie_SDK/` (`seal-v1.1.test.ts`, `crypto-roundtrip.test.ts`) -- copy fixtures, do not modify source | At least 3 real envelope fixtures collected into registry `test/fixtures/` |
| 1a.2 For each `omnituum.hybrid.v1` fixture: compute bytes using current `pqc-shared` code and using registry `canonicalBytes()` | Both byte sequences recorded |
| 1a.3 Assert byte-equality | `canonical-crosscheck.test.ts` passes |
| 1a.4 If mismatch: fix registry canonicalization to match existing behavior, NOT the other way around | Existing signatures remain valid |

### Phase 2: Adopt in Omnituum packages — **COMPLETED 2026-02-21**

| Step | Status | Notes |
|---|---|---|
| 2.1 `pqc-shared/src/version.ts`: import `OMNI_VERSIONS.HYBRID_V1` from registry, re-export as `ENVELOPE_VERSION` | **Done** | Back-compat preserved |
| 2.2 `pqc-shared/src/crypto/hybrid.ts`: import `OmniHybridV1`, export `HybridEnvelope` as type alias | **Done** | Changed from `interface extends` to `type` alias (intersection) to discourage field creep |
| 2.3 `secure-intake-client/src/envelope-types.ts`: **delete**, redirect imports | **Done** | File deleted. `submit.ts`, `hybrid-lazy.ts` import `OmniHybridV1` directly from registry. `index.ts` exports deprecated `HybridEnvelope` alias. |
| 2.4 `secure-intake-client/src/primitives.ts`: source `ENVELOPE_VERSION` from registry | **Done** | Uses `OMNI_VERSIONS.HYBRID_V1` from registry |
| 2.5 `secure-intake-cloudflare`: keep `DEFAULT_ALLOWED_VERSIONS` local | **Done** | Not touched (Loggie product policy) |
| 2.6 Both `package.json` files depend on `@omnituum/envelope-registry` | **Done** | `file:../envelope-registry` |
| 2.7 All Omnituum tests pass | **Done** | pqc-shared: 33/33, secure-intake-client: 57/57, registry: 63/63 |

#### 2.1.3 Decision: `validateEnvelope()` NOT delegated to registry

pqc-shared's `validateEnvelope()` was **not** changed to delegate to `validateOmniEnvelope()` from the registry. The two validators have incompatible semantics:

1. **Legacy support:** pqc-shared accepts `pqc-demo.hybrid.v1` — registry rejects it as deprecated
2. **Strictness:** pqc-shared checks exact `suite`/`aead` values — registry only checks they're strings
3. **Numbers:** registry forbids numbers in projected fields — pqc-shared doesn't enforce this

Delegating would either tighten validation (breaking legacy) or loosen it (dropping suite/aead checks). Both violate the "don't change behavior" constraint. The pqc-shared validator is product-level policy; the registry validator is structural. If ever unified, it should be via an explicit strictness tier design in a separate PR.

### Phase 2.5: Hardening — **COMPLETED 2026-02-21**

| Step | Status | Notes |
|---|---|---|
| 2.5.1 CI tripwire script (`scripts/check-drift.sh`) | **Done** | 4 checks: no `loggie.*` in registry, no hardcoded `omnituum.hybrid.v1` in consumers, zero runtime deps, no raw `loggie.*` literals in core/messaging src outside versions.ts. Run via `npm run lint:drift`. |
| 2.5.2 Confirm `import type` used for all type-only imports | **Done** | All `OmniHybridV1` imports in secure-intake-client use `import type`. Runtime import of `OMNI_VERSIONS` is correct (value needed). |
| 2.5.3 Lock alias deprecation strategy | **Done** | Documented in `MIGRATION.md`. Aliases kept for back-compat, removed at next major. |
| 2.5.4 Flatten `HybridEnvelope` from `interface extends` to `type` alias | **Done** | Prevents "just add one field" drift. Functionally identical (intersection type). |

### Phase 3: Extract + define Loggie envelope types in `loggie-sdk/` — **COMPLETED 2026-02-21**

> **Package name mapping:** `loggie-sdk/packages/core/` is published as `@loggiecid/core`.
> All references to `@loggiecid/core` in this plan mean `loggie-sdk/packages/core/` on disk.
> Similarly, `loggie-sdk/packages/messaging/` → `@loggiecid/messaging`, etc.
>
> All steps target `loggie-sdk/packages/`. `Loggie_SDK/` is read-only source material.
> Pattern: **read** from `Loggie_SDK/`, **write** into `loggie-sdk/`, refactor only in destination.

#### 3-A: Extraction map (copy from frozen repo, then refactor in place)

| Source (read-only) | Destination (write here) | What to extract |
|---|---|---|
| `Loggie_SDK/packages/core/src/types/index.ts` | `loggie-sdk/packages/core/src/types/envelopes.ts` (NEW) | `SealedEnvelope`, `SealedEnvelopeV2` interfaces -- rename to `LoggieSealV1` |
| `Loggie_SDK/packages/core/src/types/seal-v1.1.ts` | `loggie-sdk/packages/core/src/types/envelopes.ts` (append) | `SealedEnvelopeV1_1` + supporting types -- rename to `LoggieSealV1_1` |
| `Loggie_SDK/packages/core/src/crypto/envelope/types.ts` | `loggie-sdk/packages/core/src/types/envelopes.ts` (append) | `SealedEnvelopeV2` (hybrid) -- rename to `LoggieHybridV2` |
| `Loggie_SDK/packages/core/src/seal-v1.1.ts:296-309` | `loggie-sdk/packages/core/src/envelope-parse.ts` (NEW) | `detectSealVersion()`, `isV1_1()` logic -- rewrite as `parseLoggieEnvelope()` |
| `Loggie_SDK/packages/core/src/seal-v1.1.ts:95` | `loggie-sdk/packages/core/src/envelope-canonical.ts` (NEW) | Signing canonicalization logic -- rewrite using Omni Canonical JSON algorithm |
| `Loggie_SDK/packages/messaging/src/types.ts` | Reference only | Verify `loggie-sdk/` messaging types match; do not copy (already exists in `loggie-sdk/`) |
| `Loggie_SDK/packages/messaging/src/envelope-v2.ts` | Reference only | Verify `loggie-sdk/` envelope-v2 matches; refactor imports in `loggie-sdk/` copy |
| `Loggie_SDK/packages/core/src/seal-v1.1.test.ts` | `loggie-sdk/packages/core/test/` (copy fixtures) | Golden envelope fixtures for cross-validation |

#### 3-B: New files to create in `loggie-sdk/` — **ALL COMPLETED**

| Step | Status | Notes |
|---|---|---|
| 3.1 `versions.ts`: `LOGGIE_VERSIONS` + all `loggie.*` strings | **Done** | Also added `PHANTOM_ENVELOPE_V2`, anchor tag constants (`ARCHIVE_VERSION`, `IDENTITY_TAG_VERSION`, `APP_VERSION`, `KEYBUNDLE_VERSION`, `NFT_VERSION`, `BLOB_VERSION`) |
| 3.2 `types/envelopes.ts`: `LoggieSealV1`, `LoggieSealV1_1`, `LoggieHybridV2`, `LoggieIntakeV1`, `AnyLoggieEnvelope` | **Done** | Already existed. Correctly uses `typeof LOGGIE_VERSIONS.*` for all discriminants. |
| 3.3 `envelope-parse.ts`: single `parseLoggieEnvelope(unknown)` dispatch table | **Done** | Already existed. Fixed phantom alias to use `PHANTOM_ENVELOPE_V2` constant. |
| 3.4 `envelope-canonical.ts`: per-Loggie-version canonicalization | **Done** | Already existed. **Critical fix:** v1.1 uses `JSON.stringify` (not sorted-key canonicalization) to match frozen `createSignaturePayload()` contract. v2 uses Omni sorted-key canonicalization. |

#### 3-C: Refactor existing `loggie-sdk/` files — **CORRECTION A APPLIED**

> **Correction A applied:** No raw `loggie.*` or `omnituum.*` literals outside `versions.ts`. All type discriminants use `typeof LOGGIE_VERSIONS.*`. Enforced by Tripwire 4 in `check-drift.sh`.
>
> **Correction B confirmed:** `envelope-canonical.ts` already separates algorithm (shared `canonicalize()`) from projections (`projectSealV1_1()`, `projectHybridV2()`). Loggie owns projections. Additionally, v1.1 uses `JSON.stringify` (frozen contract) instead of sorted-key canonicalization.

| Step | Status | Notes |
|---|---|---|
| 3.5 `types/index.ts`: deprecate old types, re-export from `envelopes.ts` | **Done** | Discriminants changed from raw literals to `typeof LOGGIE_VERSIONS.*` |
| 3.6 `types/seal-v1.1.ts`: deprecate old `SealedEnvelopeV1_1` | **Done** | Discriminant uses `typeof LOGGIE_VERSIONS.SEAL_V1_1` |
| 3.7 `crypto/envelope/types.ts`: remove local interfaces | **Done** | Both `v:` discriminants fixed to `typeof` form |
| 3.8 `seal.ts`: replace literals | **Done** | Already uses `LOGGIE_VERSIONS.SEAL_V1` |
| 3.9 `seal.browser.ts`: same | **Done** | Already correct |
| 3.10 `seal-v1.1.ts`: replace literals + delegate detection | **Done** | Already uses `LOGGIE_VERSIONS.SEAL_V1_1` and delegates to `parseLoggieEnvelope()` |
| 3.11 `seal-unified.ts`: use `parseLoggieEnvelope()` for dispatch | **Done** | Already delegates |
| 3.12 `crypto/envelope/open.ts`: replace inline version checks | **Deferred** | Needs deeper refactor, out of Correction A scope |
| 3.13 `messaging/src/types.ts`: fix literals | **Done** | 3 discriminants fixed: `v:` fields use `typeof LOGGIE_VERSIONS.*`, `version:` uses `typeof IDENTITY_PAYLOAD_VERSION` |
| 3.14 `messaging/src/envelope-v2.ts`: replace literals | **Done** | Already uses `LOGGIE_VERSIONS.HYBRID_V2` |
| 3.15 `browser-sdk/src/seal.ts`: delegate detection | **Deferred** | Out of Phase 3 core scope |
| 3.16 Add `@omnituum/envelope-registry` to core `package.json` | **Done** | Already wired |
| 3.17 Run all `loggie-sdk/` tests | **Done** | 729 tests passing (52 files), 0 failures |

### Phase 3a: Loggie canonicalization cross-validation gate — **PASSED 2026-02-21**

> **Hard gate passed.**
>
> **Critical finding:** The initial `loggieCanonicalString()` implementation used sorted-key canonicalization for v1.1, which produced different byte output than the frozen `createSignaturePayload()` (which uses `JSON.stringify` with insertion-order keys). Key order difference: `canonicalize()` → `{envelope, meta, recipients}` vs `JSON.stringify()` → `{envelope, recipients, meta}`. Fixed by having v1.1 use `JSON.stringify` to match the frozen contract. v2 continues to use Omni sorted-key canonicalization (no existing signatures to break).

| Step | Status | Notes |
|---|---|---|
| 3a.1 Collect real signed envelopes from `Loggie_SDK/` tests | **Done** | v1.1 fixture from `cli/fixtures/v1.1/test-envelope.json` |
| 3a.2 Compute both canonical strings | **Done** | Frozen `createSignaturePayload()` reproduced in test as reference |
| 3a.3 Assert string-equality | **Done** | `envelope-canonical.test.ts`: 4 tests passing (byte-equality, UTF-8 encoding, key order verification, v1 rejection) |
| 3a.4 Fix if mismatch | **Done** | Fixed: v1.1 now uses `JSON.stringify` (not `canonicalize()`) to match frozen contract |

### Phase 4: Adopt in Frontend — **COMPLETED 2026-02-21**

> Frontend was already ~90% compliant before Phase 4 started.
> Version constants, detection delegation, and type imports were already wired to `@loggiecid/core`.

| Step | Status | Notes |
|---|---|---|
| 4.1 `envelope-detect.ts`: version array from core | **Already done** | Uses `LOGGIE_VERSIONS.SEAL_V1`, `.SEAL_V1_1`, `.HYBRID_V2` from `@loggiecid/core`. Delegates to `detectLoggieVersion()`. |
| 4.2 `useDecrypt.ts`: type from core | **Already done** | `SupportedEnvelopeVersion` is `LoggieVersionString` alias, marked `@deprecated`. Uses `parseLoggieEnvelope()` and `LOGGIE_VERSIONS.*`. |
| 4.3 `envelope-detect.ts`: delegate to core parse | **Already done** | Delegates version detection to `detectLoggieVersion()` from core. |
| 4.4 `SelfTestPanel.tsx` + `IntegrationHarness.tsx`: fix mock literals | **Done** | Replaced raw `'loggie.seal.v1.1'` with `LOGGIE_VERSIONS.SEAL_V1_1`. Both mocks typed as `Record<string, unknown>` with "mock — not a real envelope" comments. No numeric `version: 2` envelope mocks found (the `version: 2` in `types.ts` is a folder manifest schema version, different namespace). |
| 4.5 Frontend `package.json`: `@loggiecid/core` dependency | **Already done** | `@loggiecid/core`, `@loggiecid/messaging`, `@loggiecid/browser-sdk`, `@loggiecid/onchain` all present. |
| 4.6 Frontend build + tests | **Done** | Type-checks clean for changed files. Pre-existing errors are unrelated (`@loggiecid/web` module, vitest types). |
| 4.7 `PROTOCOL_CONTRACT.md`: reference core constants | **Done** | Updated to reference `LOGGIE_VERSIONS.*` and `detectLoggieVersion()`. Added note pointing to `CANONICALIZATION.md`. |
| 4.8 Drift tripwire for frontend | **Done** | Tripwire 5: no raw `loggie.seal.*`/`loggie.hybrid.*`/`loggie.intake.*` literals in frontend src. All 5 tripwires pass. |

#### Frontend `loggie.*` namespace note

The frontend contains many `loggie.*` strings beyond envelope versions:
- **Signing domains:** `loggie.batch.v1`, `loggie.ai.turn.v1`, `loggie.archiver.envelope.v1` (EIP-712 domain separation)
- **Storage schemas:** `loggie.storage.v1`, `loggie.folder.manifest` (storage/folder layer versioning)
- **Content types:** `loggie.document.sidecar`, `loggie.document`, `loggie.dataset` (content type discriminants)

These are different protocol namespaces and are NOT part of the envelope version migration scope. Centralizing them is a separate concern for future work.

### Phase 5: Adopt in CLI

> The CLI lives in `Loggie_SDK/packages/cli/`. Since `Loggie_SDK/` is frozen, CLI migration is **deferred** until the CLI is extracted into `loggie-sdk/` or a standalone repo.

| Step | Done when |
|---|---|
| 5.1 **Extract** CLI envelope-related code into `loggie-sdk/` if/when CLI is migrated out of frozen repo | CLI code exists in `loggie-sdk/` |
| 5.2 Replace `"loggie.seal.v1"` etc. with `LOGGIE_VERSIONS.*` in extracted CLI code | Zero string literals |
| 5.3 Replace inline version checks with Loggie type guards in extracted CLI code | Uses Loggie parse table |
| 5.4 Run CLI tests in new location | Pass |

> **Until CLI extraction happens:** CLI in `Loggie_SDK/` continues working with hardcoded literals. This is acceptable because `Loggie_SDK/` is frozen -- the literals won't drift since nothing changes there.

### Phase 6: Cleanup

| Step | Done when |
|---|---|
| 6.1 `loggie-contracts/scripts/legacy/*.js`: leave as-is (frozen/legacy) | N/A |
| 6.2 `Loggie_SDK/` (entire directory): do not touch -- frozen | N/A |
| 6.3 `archive/` directory: do not touch | N/A |
| 6.4 `Omnituum/pqc-demo`: update `pqc-demo.hybrid.v1` placeholder to `omnituum.hybrid.v1` | Demo uses current version |
| 6.5 Update `Omnituum/pqc-docs/specs/envelope.v1.md` to reference registry as canonical | Spec links to registry |
| 6.6 Update `loggie-frontend/.../PROTOCOL_CONTRACT.md` to reference `@loggiecid/core` for Loggie versions | Doc updated |
| 6.7 Verify no remaining hardcoded `omnituum.hybrid.v1` literals outside the registry (in live repos only -- ignore frozen `Loggie_SDK/`) | `grep` returns zero matches in `Omnituum/` + `loggie-sdk/` + `loggie-frontend/` outside registry + back-compat re-exports |

---

## 7. Mechanical Replacement Map

> **Scope:** Only live repos are modified (`Omnituum/`, `loggie-sdk/`, `loggie-frontend/`).
> `Loggie_SDK/` is frozen -- its literals remain as-is. They won't drift because nothing changes there.

### Omni version strings -- in `Omnituum/` (replaced with registry imports)

| Literal | Replace with | File |
|---|---|---|
| `"omnituum.hybrid.v1"` | `OMNI_VERSIONS.HYBRID_V1` from registry | `Omnituum/pqc-shared/src/version.ts` |
| `"omnituum.hybrid.v1"` | `OMNI_VERSIONS.HYBRID_V1` from registry | `Omnituum/secure-intake-client/src/primitives.ts` |
| `"pqc-demo.hybrid.v1"` | `DEPRECATED_VERSIONS.PQC_DEMO_HYBRID_V1` from registry | `Omnituum/pqc-shared/src/version.ts` |

### Loggie version strings -- in `loggie-sdk/` (replaced with Loggie constants)

| Literal | Replace with | Affected files in `loggie-sdk/packages/` |
|---|---|---|
| `"loggie.seal.v1"` value positions | `LOGGIE_VERSIONS.SEAL_V1` | `core/src/seal.ts`, `core/src/seal.browser.ts`, `core/src/seal-v1.1.ts` |
| `"loggie.seal.v1"` type positions | Literal stays (TS discriminant) or `LoggieSealV1['v']` | `core/src/types/envelopes.ts` (new canonical location) |
| `"loggie.seal.v1.1"` value positions | `LOGGIE_VERSIONS.SEAL_V1_1` | `core/src/seal-v1.1.ts` |
| `"loggie.hybrid.v2"` value positions | `LOGGIE_VERSIONS.HYBRID_V2` | `messaging/src/envelope-v2.ts` |

### Loggie version strings -- in `loggie-frontend/`

| Literal | Replace with | File |
|---|---|---|
| `['loggie.seal.v1', 'loggie.seal.v1.1', 'loggie.hybrid.v2']` | Import from `@loggiecid/core` | `useDecrypt.ts` |
| `ENVELOPE_VERSIONS` array | Import from `@loggiecid/core` | `CidPreview.tsx` |

### Detection function replacements -- in `loggie-sdk/`

| Old function | Old location in `loggie-sdk/` | Replace with |
|---|---|---|
| `detectSealVersion()` | `core/src/seal-v1.1.ts:296` | `parseLoggieEnvelope()` from new `envelope-parse.ts` |
| `isV1_1()` | `core/src/seal-v1.1.ts:307` | Loggie type guard from new `envelope-parse.ts` |
| `isEnvelopeV1()` | `core/src/crypto/envelope/types.ts:176` | Loggie type guard from new `envelope-parse.ts` |
| `isEnvelopeV2()` | `core/src/crypto/envelope/types.ts:171` | Loggie type guard from new `envelope-parse.ts` |
| `isEnvelopeV1()` | `messaging/src/types.ts:115` | Delete, re-export from core |
| `isEnvelopeV2()` | `messaging/src/types.ts:111` | Delete, re-export from core |

### Detection function replacements -- in `Omnituum/`

| Old function | Old location | Replace with |
|---|---|---|
| `validateEnvelope()` | `pqc-shared/src/version.ts:149` | `validateOmniEnvelope()` from `@omnituum/envelope-registry` |

### Detection function replacements -- in `loggie-frontend/`

| Old function | Old location | Replace with |
|---|---|---|
| `detectEnvelope()` | `envelope-detect.ts` | `parseLoggieEnvelope()` from `@loggiecid/core` |
| `detectEnvelopeFormat()` | (if used in frontend) | Delegate to `parseLoggieEnvelope()` |

### Type replacements -- in `Omnituum/`

| Old type | Old file | New type | New source |
|---|---|---|---|
| `HybridEnvelope` (local copy) | `secure-intake-client/src/envelope-types.ts` | `OmniHybridV1` | `@omnituum/envelope-registry` (file deleted) |
| `HybridEnvelope` (canonical) | `pqc-shared/src/crypto/hybrid.ts` | Re-export `OmniHybridV1` as `HybridEnvelope` | `@omnituum/envelope-registry` via alias |

### Type replacements -- in `loggie-sdk/`

| Old type | Old file in `loggie-sdk/packages/` | New type | New location |
|---|---|---|---|
| `SealedEnvelope` (v1 minimal) | `core/src/types/index.ts` | `LoggieSealV1` | `core/src/types/envelopes.ts` (new) |
| `SealedEnvelopeV2` (v1 rich) | `core/src/types/index.ts` | `LoggieSealV1` (merged) | `core/src/types/envelopes.ts` (new) |
| `SealedEnvelopeV1_1` | `core/src/types/seal-v1.1.ts` | `LoggieSealV1_1` | `core/src/types/envelopes.ts` (new) |
| `SealedEnvelopeV2` (hybrid) | `core/src/crypto/envelope/types.ts` | `LoggieHybridV2` | `core/src/types/envelopes.ts` (new) |
| `SealedEnvelopeV2` (messaging) | `messaging/src/types.ts` | `LoggieHybridV2` re-export | Re-export from `@loggiecid/core` |

### Not touched (frozen)

| Repo | Status | Rationale |
|---|---|---|
| `Loggie_SDK/` (all files) | Frozen, read-only | Museum snapshot. Literals remain but can't drift. |
| `Loggie_SDK/packages/cli/` | Frozen, CLI extraction deferred | Phase 5 activates when CLI moves out. |
| `Loggie_SDK/Claude_Contract_Suite/` | Frozen | Legacy scripts. |
| `loggie-contracts/scripts/legacy/` | Frozen | Legacy JS scripts. |
| `archive/` | Frozen | Old SDK version. |

---

## 8. Risk Notes

### Risk 1: Omni accidentally becomes Loggie protocol owner
**Trigger:** Adding `loggie.*` version strings, Loggie-specific field names, or Loggie envelope types to the registry.
**Mitigation:** (TIGHTENED) The registry contains zero `loggie.*` strings. Litmus test: `grep -r "loggie\." src/` in the registry package must return zero matches. Enforce via CI.

### Risk 2: Canonicalization mismatch breaks existing signatures
**Trigger:** Registry `canonicalBytes()` produces different bytes than current signing code.
**Mitigation:** (PROMOTED TO HARD GATE) Phase 1a and 3a are mandatory cross-validation gates. No consumer adoption until byte-equality confirmed on golden fixtures. Fix direction: always match existing behavior, never the other way.

### Risk 3: `Loggie_SDK/` becomes stale reference
**Trigger:** Frozen repo has outdated types/logic that new code might accidentally reference.
**Mitigation:** (RESOLVED) `Loggie_SDK/` is frozen read-only. No edits, no `[MIRROR]` steps. All new work targets `loggie-sdk/`. Extraction pattern: copy from frozen, refactor only in destination. Stale code in `Loggie_SDK/` can't drift because nothing changes there.

### Risk 4: pqc-shared gains dependency on envelope-registry
**Trigger:** Circular concern.
**Mitigation:** Clean dependency direction. Registry has zero deps. `pqc-shared -> registry` is leaf -> leaf. No circularity.

### Risk 5: `globalThis.TextEncoder` unavailable in some environments
**Trigger:** Older Node.js (<18) or non-standard JS runtimes.
**Mitigation:** `canonicalString()` is the primary export (returns `string`). `canonicalBytes()` is convenience only and documents `globalThis.TextEncoder` as required. Callers without it can encode the string themselves.

### Risk 6: Frontend mock envelopes break tests
**Trigger:** `SelfTestPanel.tsx` and `IntegrationHarness.tsx` use `version: 2` (numeric).
**Mitigation:** Phase 4 step 4.4 fixes these.

### Risk 7: `OmniEnvelopeV1` is new and untested in production
**Trigger:** It's a new generic type with no existing production usage.
**Mitigation:** Ship it as `lifecycle: 'active'` but no existing code is forced to use it. Existing `OmniHybridV1` continues working. `OmniEnvelopeV1` is opt-in for new integrations.

---

## 9. Open Decisions (Requires Your Call)

| # | Question | Recommendation | Status |
|---|---|---|---|
| A | Should `sender.name` be in the Omni type? | **No.** App-semantic. Loggie extension. | Resolved |
| B | Should `meta.createdAt` be in Omni types? | **Yes.** Replay protection = crypto-relevant. | Resolved |
| C | Should Omni define `OmniEnvelopeV1` as a new generic, or only keep `OmniHybridV1`? | **Define both.** Generic base enables other products. | Resolved |
| D | Should Omni validate base64/hex encoding lengths? | **Yes, as warnings.** Not errors. | Resolved |
| E | Should `loggie.hybrid.v2` be wired into `seal-unified.ts`? | **Separate decision, separate PR.** Out of scope. | Deferred |
| F | Should `Loggie_SDK/` and `loggie-sdk/` be unified? | **No.** `Loggie_SDK/` is frozen. `loggie-sdk/` is the canonical SDK built by extraction. | **RESOLVED** |
| G | Package naming? | **`@omnituum/envelope-registry`** -- it's more than types (runtime validators), "registry" implies authority. | Resolved |
| H | Should Omni ship a generic wrapper type? | **No, not now.** No wrapper in v1. Revisit if a non-Loggie product needs one. | **RESOLVED** |
| I | Which monorepo is source of truth for envelope code? | **`/loggie-sdk/`** is canonical. `/Loggie_SDK/` is frozen read-only. | **RESOLVED** |

---

## 10. Summary of Changes

### v2.1 adjustments (from owner review)

| # | Adjustment | Detail |
|---|---|---|
| A | **Remove `OmniWrapperV1` from v1 ship** | Not deferred -- removed entirely. No wrapper files, exports, schemas, or parse functions. Revisit if non-Loggie consumer appears. |
| B | **`meta.createdAt` validation is structural only** | Validate "is string, looks like ISO 8601." Do NOT reject future/old timestamps -- that's application policy, not container validation. |
| C | **Numbers forbidden in validators too** | `validateOmniEnvelope()` errors (not warns) on numbers in projected fields. Prevents objects that validate but can't canonicalize. |
| -- | **Phase 0 locked** | `/loggie-sdk/` confirmed as source of truth. `/Loggie_SDK/` consumes. |

### v2.2 corrections (extraction mode)

| # | Correction | Detail |
|---|---|---|
| 1 | **`Loggie_SDK/` frozen** | No edits allowed. Read-only source material for extraction. Museum snapshot. |
| 2 | **All `[MIRROR]` steps removed** | Nothing is applied to both repos. Work targets `loggie-sdk/` or `Omnituum/` only. |
| 3 | **Phase 3 rewritten as extract-then-refactor** | Explicit source-file-to-destination-file mapping. Copy from frozen repo, refactor only in `loggie-sdk/`. |
| 4 | **Phase 5 (CLI) deferred** | CLI lives in frozen `Loggie_SDK/`. Migration activates when CLI is extracted. Hardcoded literals in frozen code can't drift. |
| 5 | **Mechanical map scoped to live repos** | Only `Omnituum/`, `loggie-sdk/`, `loggie-frontend/` are touched. Frozen repos listed as "not touched." |

### v2 corrections (from v1 plan)

| # | Correction | What changed |
|---|---|---|
| 1 | **Remove `loggie.*` from Omni registry** | Registry now contains only `omnituum.*` types. Loggie defines its own versions in `@loggiecid/core`. Added `OmniEnvelopeV1` as generic base. |
| 2 | **Specify canonicalization precisely** | Added Section 4a with full Omni Canonical JSON spec: recursive sorted keys, stable arrays, numbers forbidden, no unicode normalization, optional field omission rules. |
| 3 | **`globalThis.TextEncoder` only** | `canonicalString()` is primary export. `canonicalBytes()` uses `globalThis.TextEncoder` and documents it. No Node builtins. |
| 4 | **Intake wrapper is Loggie-owned** | `loggie.intake.v1` lives in `@loggiecid/core`. Omni does not ship a wrapper type. |
| 5 | **Replace `ACTIVE_VERSIONS` with metadata** | No policy lists exported. `VERSION_REGISTRY` has per-version `lifecycle` metadata. Products filter themselves. |
| 6 | **`loggie.hybrid.v2` is Loggie-owned** | Not in Omni registry. Loggie defines, detects, and validates it. |
| 7 | **Split `guards.ts` from `detect.ts`** | `detect.ts` is thin (version string only). `guards.ts` has per-type structural guards. `parse.ts` is the dispatch table. No God module. |
| 8 | **Two union families** | `AnyOmniEnvelope` in registry. `AnyLoggieEnvelope` in `@loggiecid/core`. No mixed unions in Omni. |
| 9 | **Single source of truth for Loggie SDK** | Added Phase 0 to designate one monorepo. `[MIRROR]` tags on steps that must be duplicated if deferred. |
| 10 | **Cross-validation test gate** | Phases 1a and 3a are hard gates: current-impl bytes == registry bytes on golden fixtures before any consumer adoption. |

---

## 11. Audit Reference

This plan was derived from a full codebase audit conducted on 2026-02-16. Key findings:

- **150+ hardcoded version string occurrences** across source files
- **6 distinct version strings** in active use (`loggie.seal.v1`, `loggie.seal.v1.1`, `loggie.hybrid.v2`, `omnituum.hybrid.v1`, `loggie.intake.v1`, `pqc-demo.hybrid.v1`)
- **7 independent detection functions** with 100+ call sites
- **5 separate envelope type definitions** with no shared base
- **2 `SealedEnvelopeV2` name collisions** (different types, same name)
- **1 duplicate `HybridEnvelope` type** (secure-intake copies pqc-shared to avoid WASM)
- **2 UI components** constructing invalid mock envelopes (`version: 2` numeric)
- **`loggie.hybrid.v2`** referenced in frontend detection but not wired into unified seal API
