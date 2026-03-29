# @omnituum/envelope-registry — Overview

**Date:** 2026-03-18
**Version:** 0.1.2
**License:** MIT
**Dependencies:** Zero (runtime)

---

## What This Is

The envelope registry is the canonical type authority for Omnituum crypto containers. It defines version strings, field schemas, structural validators, type guards, parsers, and canonicalization rules for every envelope format in the Omnituum ecosystem.

It is a zero-dependency, pure-TypeScript package that ships types, runtime validators, and JSON Schema definitions. Nothing above it in the stack can define or redefine an envelope shape — the registry is the single source of truth.

---

## Why It Exists

**Problem:** Crypto container formats (encrypted envelopes, hybrid-wrapped payloads) were defined inline across multiple packages — `pqc-shared`, `secure-intake-client`, `loggie-sdk/core`. Each had its own copy of the types, version strings, and validation logic.

**Consequence:** Type drift. A field added in one package didn't propagate to others. Version strings diverged. There was no single place to answer "what does `omnituum.hybrid.v1` look like?"

**Why current solutions fail:** Defining types in application packages (pqc-shared, secure-intake) couples format definitions to application logic. Envelope formats are a protocol-level concern — they must be owned by a protocol-level package with zero dependencies.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  @omnituum/envelope-registry                 │
│                                                             │
│  versions.ts        Canonical version strings (omnituum.*)  │
│  types/             Type definitions per envelope format    │
│    common.ts        WrapBlock, AeadAlgorithm, shared fields │
│    omnituum-envelope-v1.ts   Base crypto container          │
│    omnituum-hybrid-v1.ts     Hybrid KEM container           │
│    union.ts                  AnyOmniEnvelope discriminated  │
│  detect.ts          detectOmniVersion(unknown) → string     │
│  guards.ts          Per-type type guards                    │
│  parse.ts           parseOmniEnvelope(unknown) → Result     │
│  validate.ts        validateOmniEnvelope(unknown) → Result  │
│  canonical.ts       canonicalString / canonicalBytes        │
│  canonical-spec.ts  RFC 8785-subset canonicalization rules  │
│  errors.ts          EnvelopeError, UnsupportedVersionError  │
│  deprecated.ts      DEPRECATED_VERSIONS list                │
│                                                             │
│  schemas/           JSON Schema exports per format          │
└─────────────────────────────────────────────────────────────┘
        ▲                    ▲                    ▲
        │                    │                    │
   pqc-shared        secure-intake-client    @loggiecid/core
  (extends types)    (imports types)        (embeds containers)
```

---

## Data Flow

1. **Define** — Envelope formats are declared in `types/` with explicit field schemas
2. **Detect** — `detectOmniVersion(blob)` inspects an unknown payload and returns its version string (or null)
3. **Parse** — `parseOmniEnvelope(blob)` returns a typed, validated envelope or a structured error
4. **Validate** — `validateOmniEnvelope(blob)` checks structural correctness without parsing into a typed object
5. **Canonicalize** — `canonicalString(envelope)` produces a deterministic string representation (RFC 8785-subset) for hashing and proof generation

---

## Key Guarantees

| Property | Implementation |
|----------|---------------|
| **Canonical authority** | All `omnituum.*` version strings originate here. No other package may declare them. |
| **Zero dependencies** | `dependencies: {}`. No runtime imports. Types and validators only. |
| **Deterministic canonicalization** | RFC 8785-subset: sorted keys, NFC normalization, no-float assertion, fail-closed on unknown fields |
| **Backward compatibility** | Deprecated types are aliased, listed in `deprecated.ts`, and removed only at major version bumps |
| **Scope boundary** | `loggie.*` version strings are explicitly excluded. Loggie types may embed Omni containers but the registry never declares Loggie formats. |

---

## Dependencies

### Internal (consumers)

| Package | Relationship |
|---------|-------------|
| `@omnituum/pqc-shared` | Extends `OmniHybridV1` with app-semantic meta fields |
| `@omnituum/secure-intake-client` | Imports types for envelope encryption/submission |
| `@loggiecid/core` | Bundles registry (zero-dep guarantee preserved) |

### External

None. Zero runtime dependencies by design.
