# @omnituum/envelope-registry — Use Cases (Plain English)

**Date:** 2026-03-18

---

## What This Does (Simple)

The envelope registry is a rulebook. It defines exactly what an encrypted container looks like — what fields it has, what values are allowed, and how to verify it hasn't been tampered with.

Think of it like a postal standard: every package must have a return address, a weight, and a stamp in the right place. The registry defines *where* those fields go and *what's valid*. Without it, every package in the ecosystem would invent its own format and nothing would interoperate.

---

## Example 1 — Detecting an Unknown Envelope

**The story:** A service receives an encrypted blob. It doesn't know which version or format it is. It needs to figure out what it's looking at before it can decrypt it.

**Step by step:**
1. Pass the blob to `detectOmniVersion(blob)`
2. The registry checks the `version` field against its canonical list
3. Returns `"omnituum.hybrid.v1"` (or `null` if unrecognized)
4. The service now knows which decryption path to use

**Why it matters:** Without a canonical registry, every consuming package would need its own version-detection logic. That's how format drift starts.

---

## Example 2 — Validating an Envelope Before Decryption

**The story:** A server receives an envelope from an untrusted client. Before spending CPU on decryption, it wants to verify the envelope is structurally correct.

**Step by step:**
1. Pass the raw envelope to `validateOmniEnvelope(blob)`
2. The registry checks: required fields present, types correct, no unknown fields (fail-closed), version string recognized
3. Returns a validation result with specific error messages if anything is wrong
4. Only structurally valid envelopes proceed to decryption

**Why it matters:** Structural validation is cheap. Decryption is expensive. Validating first prevents wasting resources on malformed payloads.

---

## Example 3 — Canonical Hashing for Proof Generation

**The story:** A compliance system needs to prove that an encrypted envelope existed in a specific form at a specific time. It needs a deterministic hash — the same envelope must always produce the same hash, regardless of JSON key ordering or whitespace.

**Step by step:**
1. Pass the envelope to `canonicalString(envelope)`
2. The registry applies RFC 8785-subset rules: sorted keys, NFC normalization, no-float assertion
3. The canonical string is hashed with SHA-256
4. The hash is anchored on-chain or included in a proof bundle

**Why it matters:** If canonicalization isn't deterministic, the same envelope could produce different hashes. That breaks proof verification permanently.

---

## Example 4 — Migrating from Deprecated Types

**The story:** A package was importing `HybridEnvelope` from `pqc-shared`. That type is being consolidated into the registry as `OmniHybridV1`.

**Step by step:**
1. Check `MIGRATION.md` — deprecated aliases are documented with old/new import paths
2. Change `import type { HybridEnvelope } from '@omnituum/pqc-shared'` to `import type { OmniHybridV1 } from '@omnituum/envelope-registry'`
3. The old alias still works (re-exported for back-compat) but will be removed at the next major version
4. Run `lint:drift` to verify no package is using a deprecated path

**Why it matters:** Centralized types mean one migration path, not N packages each migrating independently.

---

## Why It Matters

Every system that encrypts, decrypts, validates, or hashes an envelope depends on the same format definitions. If those definitions are scattered across packages, they drift. When they drift, decryption fails, proofs break, and interoperability disappears.

The registry makes envelope formats a *canonical*, *verifiable*, *deterministic* protocol primitive — not an implementation detail buried in application code.

---

## When NOT to Use This

- **Application-level message formats** — Loggie protocol types (`loggie.*`) don't belong here. They live in `@loggiecid/core`.
- **Encryption/decryption logic** — The registry defines shapes, not crypto operations. Actual encryption lives in `pqc-shared`.
- **Storage or routing** — The registry doesn't know about inboxes, IPFS, or delivery. It only knows about container structure.
