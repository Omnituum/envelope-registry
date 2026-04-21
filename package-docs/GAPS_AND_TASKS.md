# @omnituum/envelope-registry — Gaps and Tasks

**Date:** 2026-04-21 (updated — migrated to GAPS_AND_TASKS Schema v1.0 per DOC_STANDARD; sweep batch 4a-extended, 4 / 5. New **ER-##** prefix activated per DOC_STANDARD v0.5.2. Prior: 2026-03-18.)
**Module:** envelope-registry
**Status:** active
**Version:** 0.1.2
**Tests:** vitest
**Dependencies:** Zero (runtime — non-negotiable for bundling guarantees)
**Disposition:** Canonical envelope-type authority. Zero runtime dependencies — adding any runtime dep breaks the bundling guarantee for `@loggiecid/core` and every other consumer. Strict scope boundary: `loggie.*` version strings cannot be added (design principle, not convenience). 11 ER-## items, 0 closed.

---

## Status Summary

- **Tracked:** 11
- **Complete:** 0
- **Open:** 11

---

## Gaps

- [ ] **ER-01** — JSON Schema completeness (schemas/ directory must cover all fields + constraints defined in TypeScript types; generate from or validate against TypeScript source to prevent drift)
- [ ] **ER-02** — Canonical crosscheck gate (`canonical-crosscheck.test.ts` must verify `canonicalString()` output matches committed fixture bytes exactly)
- [ ] **ER-03** — Drift detection in CI (`scripts/check-drift.sh` must run in CI for every PR; any commit changing a type without updating its JSON Schema should fail)
- [ ] **ER-04** — Deprecation timeline enforcement (`deprecated.ts` listing with CI check that fails when deprecated types exceed their stated removal deadline — 3 minor versions or next major)
- [ ] **ER-05** — OmniEnvelopeV1 coverage parity (ensure `omnituum.envelope.v1` base container has equal test coverage with the hybrid variant)
- [ ] **ER-06** — Error message quality (`validate.ts` errors should include field path + expected type, not "validation failed"; consumers (secure-intake, loggie-core) need actionable errors)
- [ ] **ER-07** — Version string registry export (`KNOWN_VERSIONS` array export so consumers can enumerate without hardcoding)
- [ ] **ER-08** — Streaming envelope format `omnituum.stream.v1` (chunked/streaming encryption containers; required for large-file encryption in **PQV** + **SI**)
- [ ] **ER-09** — Group envelope format `omnituum.group.v1` (group key management; required for multi-recipient beyond Loggie's envelope V2)
- [ ] **ER-10** — Code generation from JSON Schema (generate TypeScript types from JSON Schema, or vice versa, to eliminate manual drift)
- [ ] **ER-11** — Changelog automation (auto-generate CHANGELOG entries when types or version strings change)

---

## P0 — Must Fix Before Production

- [ ] **JSON Schema completeness** — `schemas/` directory exists but may not cover all fields and constraints defined in TypeScript types. JSON Schemas must be generated from or validated against the TypeScript source to prevent drift.
- [ ] **Canonical crosscheck gate** — `canonical-crosscheck.test.ts` must verify that `canonicalString()` output matches committed fixture bytes exactly. If this test doesn't exist or is skipped, canonicalization drift is undetectable.
- [ ] **Drift detection in CI** — `scripts/check-drift.sh` exists but must run in CI for every PR. Any commit that changes a type without updating the corresponding JSON Schema should fail.

---

## P1 — Should Fix Soon

- [ ] **Deprecation timeline enforcement** — `deprecated.ts` lists deprecated types but no automated removal schedule. Add a CI check that fails when deprecated types exceed their stated removal deadline (3 minor versions or next major).
- [ ] **OmniEnvelopeV1 coverage** — The base container type (`omnituum.envelope.v1`) may have lower test coverage than the hybrid variant. Ensure parse, validate, and canonical paths are equally tested for both formats.
- [ ] **Error message quality** — `validate.ts` error messages should include the field path and expected type, not just "validation failed". Consumers (secure-intake, loggie-core) need actionable errors for debugging.
- [ ] **Version string registry export** — Provide a `KNOWN_VERSIONS` array export so consumers can enumerate all recognized versions without hardcoding.

---

## P2 — Nice to Have

- [ ] **Streaming envelope format** — `omnituum.stream.v1` for chunked/streaming encryption containers. Required for large file encryption in pqc-vault and secure-intake.
- [ ] **Group envelope format** — `omnituum.group.v1` for group key management containers. Required for multi-recipient scenarios beyond Loggie's envelope V2.
- [ ] **Code generation from JSON Schema** — Generate TypeScript types from JSON Schema (or vice versa) to eliminate the possibility of manual drift between the two representations.
- [ ] **Changelog automation** — Auto-generate changelog entries when types or version strings change.

---

## Known Constraints

- **Zero dependencies is non-negotiable** — Adding any runtime dependency breaks the bundling guarantee for `@loggiecid/core` and every other consumer.
- **Scope boundary is strict** — `loggie.*` version strings cannot be added. This is a design principle, not a convenience choice. Violating it couples protocol layers.
- **Canonicalization is append-only** — Once a canonicalization rule is defined for a version, it cannot be changed. New rules require a new version string.
- **Backward compatibility** — Deprecated types must remain exported until the stated removal deadline. Silent removal breaks downstream builds.
