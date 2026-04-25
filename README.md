# Envelope Registry

Canonical envelope type registry for Omnituum crypto containers — defines, validates, and detects all envelope formats across the ecosystem.

## What This Is

The envelope registry is the single source of truth for envelope type definitions in the Omnituum stack. It provides:

- Canonical envelope type constants and version strings
- Type detection (`detect`) for unknown payloads
- Schema validation (`validate`) against registered envelope specs
- Type guards (`guards`) for compile-time safety
- Migration paths for deprecated envelope formats
- Drift detection scripts to catch divergence

Downstream consumers include `@omnituum/pqc-ble`, `@omnituum/pqc-shared`, `@darkwire/core`, `@loggiecid/messaging`, and `@loggiecid/contracts`.

## Status

**Stable** — v0.1.2. Core API frozen.

## Getting Started

**Prerequisites:** Node.js >= 18

```bash
# Install
npm install

# Build
npm run build

# Test
npm test

# Typecheck
npm run typecheck

# Check for schema drift
npm run lint:drift
```

## Documentation

- [Envelope Registry Overview](docs/ENVELOPE_REGISTRY_OVERVIEW.md) — architecture, type map
- [Use Cases](docs/USE_CASES_FOR_DUMMIES.md) — plain-English scenarios
- [Monetization Strategy](docs/MONETIZATION_STRATEGY.md) — revenue model
- [Gaps & Tasks](docs/GAPS_AND_TASKS.md) — roadmap and priorities
- [Migration Guide](MIGRATION.md) — deprecated format transitions

## Repository Structure

```
envelope-registry/
├── src/
│   ├── index.ts           # Public API
│   ├── types/             # TypeScript type definitions
│   ├── canonical.ts       # Canonical envelope specs
│   ├── canonical-spec.ts  # Spec constants
│   ├── detect.ts          # Envelope type detection
│   ├── validate.ts        # Schema validation
│   ├── guards.ts          # Type guards
│   ├── parse.ts           # Payload parsing
│   ├── versions.ts        # Version constants
│   ├── deprecated.ts      # Deprecated formats
│   └── errors.ts          # Error types
├── test/                  # Vitest test suites
├── schemas/               # JSON schemas (published)
├── scripts/               # Drift detection
├── docs/                  # Canonical documentation
└── dist/                  # Build output (tsup)
```

## License

[MIT](LICENSE)
