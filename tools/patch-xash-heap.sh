#!/usr/bin/env bash
# patch-xash-heap.sh — Raise xash.wasm's hard memory cap from 256MB to 2GB.
#
# Why: yohimik/webxash3d-fwgs (the upstream Dockerfile for xash.wasm) is
# gone (404). The shipped xash.wasm has memory[0]: initial=4096 max=4096,
# which caps the WASM heap at 256MB. With bot_quota ≥ 4 plus the full TS
# asset set, the engine's growMemory() call hits the cap mid-load and dies
# silently. This patches the memory declaration in the WASM binary
# directly via wabt's wasm2wat / wat2wasm round-trip.
#
# Usage:
#   bash tools/patch-xash-heap.sh
#
# Re-applies the (memory (;0;) 4096 4096) → (4096 32768) patch to both
# webxash/public/xash3d-fwgs/dist/xash.wasm (served by Vite) and
# webxash/node_modules/xash3d-fwgs/dist/xash.wasm (so a fresh
# `npm install` doesn't reintroduce the old binary).
#
# Requires:
#   /tmp/wabt-1.0.42/bin/{wasm2wat,wat2wasm,wasm-objdump}
#
# Idempotent: if the patch is already applied, the script detects the
# existing 32768 and skips the rewrite.

set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
PUBLIC_WASM="$REPO/webxash/public/xash3d-fwgs/dist/xash.wasm"
NODE_WASM="$REPO/webxash/node_modules/xash3d-fwgs/dist/xash.wasm"
WABT="${WABT:-/tmp/wabt-1.0.42/bin}"

if [[ ! -x "$WABT/wasm2wat" ]] || [[ ! -x "$WABT/wat2wasm" ]]; then
    echo "ERROR: wabt not found at $WABT (need wasm2wat + wat2wasm)."
    echo "       Get it from https://github.com/WebAssembly/wabt/releases"
    exit 1
fi

patch_one() {
    local wasm="$1"
    if [[ ! -f "$wasm" ]]; then
        echo "  $wasm not found, skipping"
        return 0
    fi
    local current
    current=$("$WABT/wasm-objdump" -j Memory -x "$wasm" 2>/dev/null | grep -E 'pages:' | head -1 | tr -d ' ')
    case "$current" in
        *max=32768*)
            echo "  already patched → $current"
            return 0 ;;
        *max=4096*) ;;
        *)
            echo "  unexpected memory spec: $current (skipping)"
            return 0 ;;
    esac

    local tmpdir
    tmpdir=$(mktemp -d)
    echo "  patching → $wasm"
    "$WABT/wasm2wat" "$wasm" -o "$tmpdir/x.wat" >/dev/null
    # Memory section can have multiple representations: pick the one
    # in active memory definitions (between `(memory` and the closing
    # paren, on a single line).
    python3 -c "
import re, sys
text = open('$tmpdir/x.wat').read()
# Match only standalone (memory ...) definitions (not (memory (;0;) following (import ...))
# The active memory is declared like:  (memory (;0;) 4096 4096)
new = re.sub(r'\(memory \(;0;\) 4096 4096\)',
              '(memory (;0;) 4096 32768)', text, count=1)
if new == text:
    print('patch did not apply — wat may use different layout', file=sys.stderr)
    sys.exit(2)
open('$tmpdir/x.wat', 'w').write(new)
"
    "$WABT/wat2wasm" "$tmpdir/x.wat" -o "$tmpdir/x.wasm" >/dev/null
    cp "$tmpdir/x.wasm" "$wasm"
    rm -rf "$tmpdir"
    "$WABT/wasm-objdump" -j Memory -x "$wasm" 2>/dev/null | grep -E 'pages:' | sed 's/^/    /'
}

echo "xash.wasm heap cap patch (256MB → 2GB)"
echo
patch_one "$PUBLIC_WASM"
patch_one "$NODE_WASM"
echo
echo "Tip: backup of the pre-patch WASM is kept at /tmp/xash.wasm.bak if you ran"
echo "     this session's binary edit; remove it once you're satisfied."
