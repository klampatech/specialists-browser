#!/usr/bin/env bash
# build-ts-dll.sh — Build the TS server DLL WASM side module from
# hlsdk-portable's full source tree + the TS overlays (ts_stub.cpp,
# cts_game_rules.cpp, future TS translations).
#
# Why direct emcc + SIDE_MODULE=1:
# emscripten's Emscripten.cmake disables SHARED library support. CMake's
# add_library(... SHARED ...) silently produces .a archives. The official
# hlsdk-portable 0.1.3 .wasm was built with a direct emcc invocation; we
# reproduce that pattern here.
#
# Build output:
#   build/ts_emscripten_wasm32.wasm
#   Deployed to: webxash/public/xash3d-fwgs/dist/dlls/ AND
#                webxash/public/dlls/hl_emscripten_wasm32.wasm
#                (engine resolves dlopen on the latter)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/../../.." && pwd)"
HLSDK="${HLSDK:-/tmp/hlsdk-portable}"
[[ -d "$HLSDK" ]] || { echo "ERROR: hlsdk-portable not at $HLSDK"; exit 1; }

EMSDK_ROOT="${EMSDK_ROOT:-/home/kyle/emsdk}"
if [[ -f "$EMSDK_ROOT/emsdk_env.sh" ]]; then
    source "$EMSDK_ROOT/emsdk_env.sh" >/dev/null
fi

SRC="$SCRIPT_DIR/src"
OUT="$SCRIPT_DIR/build"
DEST="$REPO/webxash/public/xash3d-fwgs/dist/dlls"
DEST2="$REPO/webxash/public/dlls"
mkdir -p "$OUT" "$DEST" "$DEST2"

# === Apply patches to /tmp/hlsdk-portable ===
#
# 1. Replace `return new CHalfLifeMultiplay;` with `return new CTSGameRules;`
#    in dlls/gamerules.cpp — both occurrences.
# 2. Insert `#include "cts_game_rules.h"` at the TOP of gamerules.cpp (after other #includes).
# 3. Strip any stale #include lines from prior patches inside function bodies.
#
# These patches are what hooks TS behavior at every multiplayer code
# point. The factory in InstallGameRules now returns our class, which
# inherits from CHalfLifeMultiplay — so engine calls dispatch to our
# overrides first, then fall through to HL1's defaults.

PATCH_MARKER="$OUT/.ts_patches_applied"
if [[ ! -f "$PATCH_MARKER" ]] || [[ "$HLSDK/dlls/gamerules.cpp" -nt "$PATCH_MARKER" ]]; then
    echo "Patching hlsdk-portable (CTSGameRules hook)..."
    if grep -q "return new CTSGameRules;" "$HLSDK/dlls/gamerules.cpp"; then
        echo "  gamerules.cpp already has 'new CTSGameRules' (factory wired)"
    else
        sed -i 's|return new CHalfLifeMultiplay;|return new CTSGameRules;|g' \
            "$HLSDK/dlls/gamerules.cpp"
        # Insert #include for cts_game_rules.h after the function opens
        sed -i 's|^\tSERVER_EXECUTE();$|\tSERVER_EXECUTE();\n\n#include "cts_game_rules.h"|' \
            "$HLSDK/dlls/gamerules.cpp"
        echo "  Replaced 'new CHalfLifeMultiplay' with 'new CTSGameRules' (x2 sites)"
        # Strip any stale #include lines that earlier patches left inside
        # function bodies, then ensure the include sits at the top of the
        # file (after the other #includes).
        sed -i '/^#include "cts_game_rules.h"$/d' "$HLSDK/dlls/gamerules.cpp"
        if ! grep -q '^#include "cts_game_rules.h"$' "$HLSDK/dlls/gamerules.cpp"; then
            LAST_INC=$(grep -n "^#include" "$HLSDK/dlls/gamerules.cpp" | tail -1 | cut -d: -f1)
            sed -i "${LAST_INC}a #include \"cts_game_rules.h\"" "$HLSDK/dlls/gamerules.cpp"
            echo "  Inserted include after line $LAST_INC (top of gamerules.cpp)"
        fi
    fi
    touch "$PATCH_MARKER"
fi

# === Discover source files (hlsdk-portable's dlls/ + game_shared/ + pm_shared/) ===

# Use the exact SVDLL_SOURCES list from hlsdk-portable's CMakeLists.txt
# (we pre-extracted this into hlsdk-sources.txt). This avoids pulling
# in single-player-only stubs like mpstubb.cpp that fail to compile.
HLSDK_SOURCES=()
while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    # CMakeLists paths are relative to dlls/, e.g. "../game_shared/foo.cpp"
    resolved="$(realpath -m "$HLSDK/dlls/$line")"
    [[ -f "$resolved" ]] && HLSDK_SOURCES+=("$resolved")
done < "$SCRIPT_DIR/hlsdk-sources.txt"

# TS overlays (this directory's src/)
TS_SOURCES=()
for f in "$SRC"/*.cpp; do
    [[ -f "$f" ]] && TS_SOURCES+=("$f")
done

echo "Building TS server DLL WASM side module"
echo "  HLSDK sources: ${#HLSDK_SOURCES[@]}"
echo "  TS overlays:   ${#TS_SOURCES[@]}"
echo "  TS overlay files:"
for f in "${TS_SOURCES[@]}"; do
    echo "    $(basename "$f")"
done

emcc \
    "${HLSDK_SOURCES[@]}" \
    "${TS_SOURCES[@]}" \
    -O3 -flto \
    -fvisibility=hidden \
    -DCLIENT_DLL=0 \
    -DHL_BUILD=1 \
    -DXASH_EMSCRIPTEN=1 \
    -DXASH_WASM=1 \
    -DXASH_LITTLE_ENDIAN=1 \
    -Dstricmp=strcasecmp \
    -D_strcasecmp=strcasecmp \
    -D_strcmpi=strcasecmp \
    -Dstrnicmp=strncasecmp \
    -D_strnicmp=strncasecmp \
    -D_strncasecmp=strncasecmp \
    -D_snprintf=snprintf \
    -D_vsnprintf=vsnprintf \
    -I"$HLSDK" \
    -I"$HLSDK/dlls" \
    -I"$HLSDK/game_shared" \
    -I"$HLSDK/pm_shared" \
    -I"$HLSDK/common" \
    -I"$HLSDK/engine" \
    -I"$HLSDK/public" \
    -I"$HLSDK/external" \
    -I"$SRC" \
    -sSIDE_MODULE=1 \
    -sERROR_ON_UNDEFINED_SYMBOLS=0 \
    -sALLOW_MEMORY_GROWTH=1 \
    -mno-bulk-memory -mno-bulk-memory-opt \
    -Wl,--strip-all \
    -Wl,--gc-sections \
    -o "$OUT/ts_emscripten_wasm32.wasm" \
    2>&1 | tail -50

echo
echo "Output: $OUT/ts_emscripten_wasm32.wasm"
ls -la "$OUT/ts_emscripten_wasm32.wasm"

# Inspect
if [[ -x /tmp/wabt-1.0.42/bin/wasm-objdump ]]; then
    echo
    echo "Import count:"
    /tmp/wabt-1.0.42/bin/wasm-objdump -j Import -x \
        "$OUT/ts_emscripten_wasm32.wasm" | grep -c ' <- ' || true
    echo
    echo "Memory:"
    /tmp/wabt-1.0.42/bin/wasm-objdump -j Memory -x \
        "$OUT/ts_emscripten_wasm32.wasm" 2>/dev/null | grep -E "memory|pages" | head -3 || true
fi

echo
echo "Decide whether to run rewrite-got.py (D.7.19 proof: the rewrite
turns the working 52-import raw emcc WASM into a 49-import version
that traps on first call_indirect with 'function signature mismatch'
when running on the current build). Default: skip. Pass
--with-rewrite to opt in. Add --with-densify to also run
rewrite-got-densify.py after (D.7.52: covers call_indirect trap by
re-emitting the elem with all decls in [0, tableSize))."
if [[ "${1:-}" == "--with-rewrite" ]] && [[ -f "$SCRIPT_DIR/rewrite-got.py" ]]; then
    echo "Running rewrite-got.py (--with-rewrite)..."
    REWRITE_IN="$OUT/ts_emscripten_wasm32.wasm"
    REWRITE_OUT="$OUT/ts_emscripten_wasm32.rw.wasm"
    if python3 "$SCRIPT_DIR/rewrite-got.py" "$REWRITE_IN" "$REWRITE_OUT" 2>&1; then
        # rewrite-got.py's pipeline produces these intermediate files:
        #   .rw.wasm          (post-wat2wasm)
        #   .rw.wasm.reordered                (dylink-first)
        #   .rw.wasm.reordered.dylinkpatched  (dylink-first + tableSize-patched)
        # Pick the most-processed one that exists.
        candidates=(
            "$REWRITE_OUT.reordered.dylinkpatched"
            "$REWRITE_OUT.reordered"
            "$REWRITE_OUT"
        )
        for f in "${candidates[@]}"; do
            if [[ -f "$f" ]]; then
                mv "$f" "$REWRITE_IN"
                echo "  Deployed $(basename "$f") version"
                break
            fi
        done
    else
        echo "  WARNING: rewrite-got.py failed; using original WASM"
    fi

    # D.7.52 follow-on: chain rewrite-got-densify.py. Reads the post-rewrite
    # WASM, replaces the (elem (;0;) (global.get 1) func ...) line with one
    # containing funcref(func D) for every D < tableSize, then re-reorders
    # dylink.0 to the front. Run with --with-densify after --with-rewrite.
    if [[ "${2:-}" == "--with-densify" ]] && [[ -f "$SCRIPT_DIR/rewrite-got-densify.py" ]]; then
        echo
        echo "Running rewrite-got-densify.py (--with-densify)..."
        DENSIFY_IN="$REWRITE_IN"
        DENSIFY_OUT="$OUT/ts_emscripten_wasm32.densified.wasm"
        if python3 "$SCRIPT_DIR/rewrite-got-densify.py" "$DENSIFY_IN" "$DENSIFY_OUT" 2>&1; then
            mv "$DENSIFY_OUT" "$DENSIFY_IN"
            echo "  Deployed densified version"
        else
            echo "  WARNING: rewrite-got-densify.py failed; using rewrite-only WASM"
        fi
    fi
else
    echo "Skipping rewrite-got.py (raw emcc WASM deployed as-is — works on current build)."
fi

# === Safety gate: inspect freshly built WASM before deploying ===
# Gate criteria (webXash breaks with 283-import / 229-GOT.func WASM):
#   - Refuse if total import count  > 60
#   - Refuse if any GOT.func import entry exists (GOT.func count > 0)
# Leave existing deployed WASMs untouched on refusal.
WASM_OBJ="$OUT/ts_emscripten_wasm32.wasm"
WABT_BIN="${WABT_BIN:-/tmp/wabt-1.0.42/bin/wasm-objdump}"
IMPORT_COUNT=0
GOT_FUNC_COUNT=0

if [[ -x "$WABT_BIN" ]] && [[ -f "$WASM_OBJ" ]]; then
    # Capture full Import section dump
    DUMP=$("$WABT_BIN" -j Import -x "$WASM_OBJ" 2>/dev/null) || true

    # Count total import lines (each import ends with " <- ")
    IMPORT_COUNT=$(printf '%s\n' "$DUMP" | grep -c ' <- ' || true)

    # Count GOT.func import entries specifically
    GOT_FUNC_COUNT=$(printf '%s\n' "$DUMP" | grep -c 'GOT.func' || true)

    if [[ "$IMPORT_COUNT" -gt 60 ]]; then
        echo "ERROR: Safety gate refused deploy." >&2
        echo "  WASM import count $IMPORT_COUNT exceeds threshold of 60." >&2
        echo "  File: $WASM_OBJ" >&2
        echo "  GOT.func entries: $GOT_FUNC_COUNT" >&2
        echo "  Leaving existing deployed WASMs untouched." >&2
        exit 1
    fi

    if [[ "$GOT_FUNC_COUNT" -gt 0 ]]; then
        echo "ERROR: Safety gate refused deploy." >&2
        echo "  WASM contains $GOT_FUNC_COUNT GOT.func import(s) (gotp3 broken on current build)." >&2
        echo "  File: $WASM_OBJ" >&2
        echo "  Import count: $IMPORT_COUNT" >&2
        echo "  Leaving existing deployed WASMs untouched." >&2
        exit 1
    fi

    echo
    echo "[gate] import_count=$IMPORT_COUNT  got_func=$GOT_FUNC_COUNT  PASS"
else
    echo "WARNING: WABT wasm-objdump not available at $WABT_BIN — skipping safety gate." >&2
fi

# Deploy to both engine paths
cp "$OUT/ts_emscripten_wasm32.wasm" "$DEST/"
echo
echo "Deployed to: $DEST/ts_emscripten_wasm32.wasm"
cp "$OUT/ts_emscripten_wasm32.wasm" "$DEST2/hl_emscripten_wasm32.wasm"
echo "Also at:     $DEST2/hl_emscripten_wasm32.wasm (replaces official hl.dll)"
echo
echo "Backup of official hl.dll: /tmp/hl_emscripten_wasm32.wasm.bak"
echo "To restore: cp /tmp/hl_emscripten_wasm32.wasm.bak webxash/public/dlls/hl_emscripten_wasm32.wasm"