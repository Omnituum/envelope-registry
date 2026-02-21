# Migration Notes

## Deprecated Aliases (Phase 2)

The following type aliases are maintained for back-compatibility.
They will be removed at the **next major version bump** (or after 3 minor releases, whichever comes first).

### `HybridEnvelope` in `@omnituum/secure-intake-client`

- **Old:** `import type { HybridEnvelope } from '@omnituum/secure-intake-client'`
- **New:** `import type { OmniHybridV1 } from '@omnituum/envelope-registry'`
- **Reason:** `HybridEnvelope` was a local copy of the registry type. The source of truth is `OmniHybridV1` in the registry.
- **Status:** Deprecated alias exported from `secure-intake-client/src/index.ts`. Internally the package uses `OmniHybridV1` directly.

### `HybridEnvelope` in `@omnituum/pqc-shared`

- **Old:** `import type { HybridEnvelope } from '@omnituum/pqc-shared'`
- **New:** `import type { OmniHybridV1 } from '@omnituum/envelope-registry'` (for crypto-only fields) or keep using `HybridEnvelope` if you need `meta.senderName`/`meta.senderId`.
- **Reason:** `HybridEnvelope` extends `OmniHybridV1` with app-semantic meta fields. It is a legitimate product-level extension, not a duplicate.
- **Status:** Kept as a type alias (not interface extends) to discourage further field additions.

### `ENVELOPE_VERSION` in `@omnituum/pqc-shared`

- **Old:** `import { ENVELOPE_VERSION } from '@omnituum/pqc-shared'`
- **New:** `import { OMNI_VERSIONS } from '@omnituum/envelope-registry'` then use `OMNI_VERSIONS.HYBRID_V1`
- **Reason:** Version constants live in the registry. The pqc-shared re-export exists for back-compat.
- **Status:** Re-exported, sourced from registry. Will be removed at next major.
