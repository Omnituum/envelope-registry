#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# Drift Prevention Tripwires
#
# Run: npm run lint:drift (or directly: bash scripts/check-drift.sh)
# CI: Add to your CI pipeline as a gate.
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REGISTRY_ROOT="$(dirname "$SCRIPT_DIR")"
OMNITUUM_ROOT="$(dirname "$REGISTRY_ROOT")"

FAIL=0

# ─── Tripwire 1: No loggie.* strings in registry src ─────────────────────
echo "── Tripwire 1: No loggie.* in registry src/"
if grep -rn 'loggie\.' "$REGISTRY_ROOT/src/" 2>/dev/null; then
  echo "FAIL: loggie.* strings found in registry src/. Omni must not define Loggie protocols."
  FAIL=1
else
  echo "   PASS"
fi

# ─── Tripwire 2: No hardcoded "omnituum.hybrid.v1" literals in consumers ─
echo "── Tripwire 2: No \"omnituum.hybrid.v1\" literals in consumer src/"
# Check pqc-shared src (excluding node_modules, dist, tests)
FOUND=0
for pkg in pqc-shared secure-intake-client; do
  PKG_DIR="$OMNITUUM_ROOT/$pkg/src"
  if [ -d "$PKG_DIR" ]; then
    if grep -rn '"omnituum\.hybrid\.v1"' "$PKG_DIR" 2>/dev/null | grep -v '\.d\.ts'; then
      echo "   FOUND in $pkg/src/"
      FOUND=1
    fi
    # Also check single-quoted
    if grep -rn "'omnituum\.hybrid\.v1'" "$PKG_DIR" 2>/dev/null | grep -v '\.d\.ts'; then
      echo "   FOUND in $pkg/src/"
      FOUND=1
    fi
  fi
done
if [ "$FOUND" -eq 1 ]; then
  echo "FAIL: Hardcoded omnituum.hybrid.v1 literals found. Import OMNI_VERSIONS.HYBRID_V1 from registry."
  FAIL=1
else
  echo "   PASS"
fi

# ─── Tripwire 3: Registry has zero runtime dependencies ──────────────────
echo "── Tripwire 3: Registry dependencies: {}"
DEPS=$(node -e "const p=JSON.parse(require('fs').readFileSync('$REGISTRY_ROOT/package.json','utf8')); console.log(Object.keys(p.dependencies||{}).length)")
if [ "$DEPS" -ne 0 ]; then
  echo "FAIL: Registry has $DEPS runtime dependencies. Must be zero."
  FAIL=1
else
  echo "   PASS"
fi

# ─── Tripwire 4: No raw loggie.* literals in core/messaging type discriminants ─
# Scope: packages/core/src and packages/messaging/src (the protocol surface).
# Checks for raw string literals used as type discriminants or version assignments.
# Exempt: versions.ts (the single source of truth), tests, comments, .d.ts files.
echo "── Tripwire 4: No raw loggie.* literals in core/messaging src"
LOGGIE_SDK="$OMNITUUM_ROOT/../loggie-sdk"
if [ -d "$LOGGIE_SDK/packages" ]; then
  RAW_HITS=""
  for scope in core/src messaging/src; do
    SCOPE_DIR="$LOGGIE_SDK/packages/$scope"
    [ -d "$SCOPE_DIR" ] || continue
    HITS=$(grep -rn "'loggie\.\|\"loggie\." "$SCOPE_DIR" \
      --include='*.ts' --include='*.tsx' \
      2>/dev/null \
      | grep -v 'versions\.ts' \
      | grep -v '__tests__' \
      | grep -v '\.test\.' \
      | grep -v '\.spec\.' \
      | grep -v '/test/' \
      | grep -v '/fixtures/' \
      | grep -v '/dist/' \
      | grep -v '\.d\.ts' \
      | grep -v 'node_modules' \
      | grep -Ev ':\s*//' \
      | grep -Ev ':\s*\*' \
      | grep -Ev ':\s*\*\*' \
      | grep -Ev '//.*loggie\.' \
      | grep -v 'console\.' \
      | grep -v 'storage/keys\.ts' \
      || true)
    if [ -n "$HITS" ]; then
      RAW_HITS="${RAW_HITS}${HITS}\n"
    fi
  done
  if [ -n "$RAW_HITS" ]; then
    echo -e "$RAW_HITS"
    echo "FAIL: Raw loggie.* literals found outside versions.ts. Use LOGGIE_VERSIONS.* or typeof constants."
    FAIL=1
  else
    echo "   PASS"
  fi
else
  echo "   SKIP (loggie-sdk not found at $LOGGIE_SDK)"
fi

# ─── Tripwire 5: No raw envelope version literals in frontend src ────────
# Scope: loggie.seal.*, loggie.hybrid.*, loggie.intake.* (envelope protocol versions).
# NOT checked: loggie.batch.*, loggie.ai.*, loggie.folder.*, loggie.storage.*,
#   loggie.document.*, loggie.identity.* (different namespaces, separate concern).
echo "── Tripwire 5: No raw envelope version literals in frontend src"
FRONTEND="$OMNITUUM_ROOT/../loggie-frontend"
if [ -d "$FRONTEND/src" ]; then
  FE_HITS=$(grep -rn "'loggie\.seal\.\|\"loggie\.seal\.\|'loggie\.hybrid\.\|\"loggie\.hybrid\.\|'loggie\.intake\.\|\"loggie\.intake\." "$FRONTEND/src/" \
    --include='*.ts' --include='*.tsx' \
    2>/dev/null \
    | grep -v '__tests__' \
    | grep -v '\.test\.' \
    | grep -v '__fixtures__' \
    | grep -v '/dist/' \
    | grep -v '\.d\.ts' \
    | grep -v 'node_modules' \
    | grep -Ev ':\s*//' \
    | grep -Ev ':\s*\*' \
    | grep -Ev '//.*loggie\.' \
    || true)
  if [ -n "$FE_HITS" ]; then
    echo "$FE_HITS"
    echo "FAIL: Raw envelope version literals found in frontend src/. Import LOGGIE_VERSIONS.* from @loggiecid/core."
    FAIL=1
  else
    echo "   PASS"
  fi
else
  echo "   SKIP (loggie-frontend not found at $FRONTEND)"
fi

# ─── Summary ─────────────────────────────────────────────────────────────
echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "✓ All drift tripwires passed."
  exit 0
else
  echo "✗ Drift detected. Fix the issues above before merging."
  exit 1
fi
