# @omnituum/envelope-registry — Monetization Strategy

**Date:** 2026-03-18

---

## What This Enables

The envelope registry is infrastructure, not a product. It doesn't sell directly — it makes every product above it possible. Without canonical envelope definitions, nothing in the stack can interoperate, validate, or generate proofs.

Its revenue contribution is indirect but structural: it's the type authority that enables the Omnituum and Loggie ecosystems to sell verifiable, interoperable crypto containers.

---

## Who Pays

Nobody pays for the registry directly. It's MIT-licensed, zero-dependency, and free.

**Who pays because of it:**

| Persona | What They're Actually Buying | Registry's Role |
|---------|------------------------------|-----------------|
| Enterprise using `pqc-shared` Pro tier | Hybrid encryption library | Registry defines the envelope format they encrypt into |
| Customer using Loggie Passport-as-a-Service | Verifiable document proofs | Registry provides canonical hashing that makes proofs deterministic |
| Platform licensing `secure-intake` | PQC submission pipeline | Registry validates every envelope before processing |
| Compliance team using proof bundles | Offline verification | Registry's canonicalization is what makes verification repeatable |

---

## Pricing Model

**Free and open source (MIT).** The registry is a public good for the ecosystem.

Revenue accrues to the products built on top of it:

| Product | Registry Dependency | Revenue Range |
|---------|-------------------|---------------|
| `@omnituum/pqc-shared` Pro/Enterprise | Envelope types, validation | $99–499/month |
| `@omnituum/secure-intake` managed service | Parse, validate, canonical hash | $199–2,499/month |
| Loggie Passport-as-a-Service | Canonical hashing for proof generation | $79–249/month |
| Loggie Core SDK Enterprise | Envelope V2 wrapping around registry types | $499/month + usage |

---

## Entry Point

Developers discover the registry by using any Omnituum package. It's a transitive dependency of `pqc-shared`, `secure-intake-client`, and `@loggiecid/core`. No separate adoption step — it's already there.

---

## Expansion Path

1. **More envelope formats** — Each new format (e.g., `omnituum.stream.v1` for streaming encryption, `omnituum.group.v1` for group key management) increases the registry's surface area and the products that depend on it.
2. **JSON Schema distribution** — The `schemas/` directory enables external tooling (API gateways, validators, code generators) to consume Omnituum envelope definitions without importing TypeScript.
3. **Standards track** — If Omnituum envelope formats are submitted to a standards body, the registry becomes the reference implementation. That's a positioning asset, not a revenue stream.

---

## Moat

The moat isn't in the registry code — it's in the ecosystem dependency. Every package that validates, parses, or canonicalizes an envelope goes through this package. Replacing it means replacing the type definitions in every consumer simultaneously. That's a coordination cost that grows with ecosystem adoption.

Canonical, deterministic, verifiable envelope definitions are a protocol-level lock-in — not because the code is proprietary, but because the format is the standard.
