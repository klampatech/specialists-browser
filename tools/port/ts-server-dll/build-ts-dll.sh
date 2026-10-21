#!/usr/bin/env bash
# build-ts-dll.sh — Build the TS server DLL WASM side module.
#
# ## Why CMake + Emscripten toolchain, not raw emcc
#
# The working baseline (`c91698be…`) was produced by CMake driving the
# Emscripten toolchain, NOT by a hand-rolled `emcc` invocation. That
# difference is load-bearing:
#
# | Section   | CMake+Emscripten | raw emcc (previous script) |
# |-----------|-----------------|---------------------------|
# | Start     | present         | MISSING                   |
# | DataCount | present         | MISSING                   |
# | dylink.0  | present, first  | present only after reorder |
#
# A side module without a Start section never runs its C++ global
# constructors or its data relocations, and Xash3D-FWGS's
# `getDylinkMetadata` loader halts on it. Every raw-emcc build in this
# repo reproduced the exact symptom
# `_Mem_Alloc: pool == NULL (alloc at ../engine/common/cmd.c:638)` then
# `hostmap Infinity` then a dead engine. Switching to the CMake build
# path took the module from 3 console milestones to 27.
#
# (The previous raw-emcc script is kept as
# build-ts-dll-raw-emcc.sh.legacy for reference. Do not use it.)
#
# ## Pipeline
#
#   1. Copy TS overlays into $HLSDK/dlls/ so CMake can see them.
#   2. Patch gamerules.cpp: `new CHalfLifeMultiplay` -> `new CTSGameRules`
#      (the factory in InstallGameRules — this routes engine calls through
#      our overrides).
#   3. Wire the overlay .cpp files into dlls/CMakeLists.txt's SVDLL_SOURCES.
#   4. cmake configure + build with the Emscripten toolchain.
#   5. rewrite-got.py — collapse the ~229 `GOT.func` imports that PIC
#      codegen emits into const-init globals (277 imports -> 47, GOT -> 0).
#   6. Safety gate, then deploy to both live paths.
#
# ## Usage
#
#   ./build-ts-dll.sh              # build + deploy
#   ./build-ts-dll.sh --no-deploy  # build only
#
# Env: HLSDK (default /tmp/hlsdk-portable), EMSDK_ROOT, CMAKE_BIN, WABT_BIN

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/../../.." && pwd)"

HLSDK="${HLSDK:-/tmp/hlsdk-portable}"
[[ -d "$HLSDK" ]] || { echo "ERROR: hlsdk-portable not at $HLSDK" >&2; exit 1; }

EMSDK_ROOT="${EMSDK_ROOT:-/home/kyle/emsdk}"
CMAKE_BIN="${CMAKE_BIN:-/tmp/cmake-3.30.0-linux-x86_64/bin}"
WABT_BIN="${WABT_BIN:-/tmp/wabt-1.0.42/bin/wasm-objdump}"
EMSCRIPTEN_TOOLCHAIN="$EMSDK_ROOT/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake"
[[ -f "$EMSCRIPTEN_TOOLCHAIN" ]] || { echo "ERROR: no Emscripten toolchain at $EMSCRIPTEN_TOOLCHAIN" >&2; exit 1; }

DEPLOY=1
[[ "${1:-}" == "--no-deploy" ]] && DEPLOY=0

export PATH="$CMAKE_BIN:$EMSDK_ROOT/upstream/emscripten:$EMSDK_ROOT/upstream/bin:$PATH"
if [[ -f "$EMSDK_ROOT/emsdk_env.sh" ]]; then
    source "$EMSDK_ROOT/emsdk_env.sh" >/dev/null 2>&1 || true
fi

SRC="$SCRIPT_DIR/src"
BUILD="$HLSDK/build-emscripten-ts"
OUT="$SCRIPT_DIR/build"
DEST="$REPO/webxash/public/xash3d-fwgs/dist/dlls"
DEST2="$REPO/webxash/public/dlls"
mkdir -p "$OUT" "$DEST" "$DEST2"

# === 1. Copy TS overlays into the hlsdk tree =================================
# CMake resolves SVDLL_SOURCES relative to dlls/, so the overlays have to
# physically live there.

echo "==> [1/6] Copying TS overlays into $HLSDK/dlls"
shopt -s nullglob
for f in "$SRC"/*.cpp "$SRC"/*.h; do
    cp -f "$f" "$HLSDK/dlls/"
    echo "    $(basename "$f")"
done
for sub in entities gamerules weapons; do
    if [[ -d "$SRC/$sub" ]]; then
        mkdir -p "$HLSDK/dlls/$sub"
        for f in "$SRC/$sub"/*.cpp "$SRC/$sub"/*.h; do
            cp -f "$f" "$HLSDK/dlls/$sub/"
            echo "    $sub/$(basename "$f")"
        done
    fi
done
shopt -u nullglob

# === 2. Patch gamerules.cpp — the factory hook ================================
# InstallGameRules() constructs the game-rules object. Returning our
# CTSGameRules (which derives from CHalfLifeMultiplay) makes every engine
# call dispatch through our overrides first, then fall through to HL1.

echo "==> [2/6] Patching gamerules.cpp factory -> CTSGameRules"
GAMERULES="$HLSDK/dlls/gamerules.cpp"
if grep -q "return new CTSGameRules;" "$GAMERULES"; then
    echo "    already wired"
else
    sed -i 's|return new CHalfLifeMultiplay;|return new CTSGameRules;|g' "$GAMERULES"
    # Strip stale in-body includes from earlier patch attempts, then put the
    # include at the top with the other #includes.
    sed -i '/^[[:space:]]*#include "cts_game_rules.h"$/d' "$GAMERULES"
    if ! grep -q '^#include "cts_game_rules.h"$' "$GAMERULES"; then
        LAST_INC=$(grep -n "^#include" "$GAMERULES" | tail -1 | cut -d: -f1)
        sed -i "${LAST_INC}a #include \"cts_game_rules.h\"" "$GAMERULES"
        echo "    factory replaced (2 sites), include at line $LAST_INC"
    fi
fi

# === 2b. Patch h_export.cpp — post-fnptrs init hook ========================
# `__attribute__((constructor))` runs at WASM instantiation, which is
# BEFORE the engine calls GiveFnptrsToDll. So g_engfuncs is still
# zeroed at constructor time and `pfnAddServerCommand` reads as NULL.
#
# GiveFnptrsToDll is exactly the right moment: it's when g_engfuncs
# first becomes valid. One extra line there lets us register the
# ts_pump console commands — the JS→DLL bridge that drives Think()
# independently of the engine's broken loopback connect.
#
# Kept as a build-script sed (not a hand edit) so re-runs from a
# pristine HLSDK tree are reproducible — same discipline as the
# gamerules.cpp factory patch above.

echo "==> [2b/6] Patching h_export.cpp GiveFnptrsToDll -> ts_post_init"
HEXPORT="$HLSDK/dlls/h_export.cpp"
if grep -q "ts_post_init" "$HEXPORT"; then
    echo "    already wired"
else
    # Declare + call the hook at the end of GiveFnptrsToDll's body.
    python3 - "$HEXPORT" <<'PYEOF2'
import re, sys
path = sys.argv[1]
text = open(path).read()
if 'ts_post_init' in text:
    print("    already wired")
    sys.exit(0)
# Add the extern declaration near the top (after the g_engfuncs decl).
text = text.replace(
    "enginefuncs_t\t g_engfuncs;",
    "// >>> TS-POST-INIT >>> (added by build-ts-dll.sh -- do not remove)\n"
    "// Provide via cts_game_rules.cpp. Called from GiveFnptrsToDll below,\n"
    "// which is the FIRST point where g_engfuncs is valid. Constructors\n"
    "// run earlier (WASM instantiation) so they can't register commands.\n"
    'extern "C" void ts_post_init(void);\n'
    "// <<< TS-POST-INIT <<<\n\n"
    "enginefuncs_t\t g_engfuncs;",
    1,
)
# Append the call at the end of GiveFnptrsToDll's body.
text = text.replace(
    "\tmemcpy( &g_engfuncs, pengfuncsFromEngine, sizeof(enginefuncs_t) );\n"
    "\tgpGlobals = pGlobals;\n}",
    "\tmemcpy( &g_engfuncs, pengfuncsFromEngine, sizeof(enginefuncs_t) );\n"
    "\tgpGlobals = pGlobals;\n"
    "\t// >>> TS-POST-INIT >>> (added by build-ts-dll.sh -- do not remove)\n"
    "\tts_post_init();\n"
    "\t// <<< TS-POST-INIT <<<\n}",
    1,
)
open(path, 'w').write(text)
print("    patched")
PYEOF2
fi

# === 3. Wire overlays into CMakeLists.txt ====================================
# Idempotent: guarded by marker comments so re-runs don't duplicate entries.

echo "==> [3/6] Wiring overlays into dlls/CMakeLists.txt"
CML="$HLSDK/dlls/CMakeLists.txt"
if grep -q "TS-TARGET-OVERLAYS" "$CML"; then
    echo "    already wired"
else
    OVERLAY_LIST=""
    for f in "$SRC"/*.cpp; do
        [[ -f "$f" ]] || continue
        base="$(basename "$f")"
        case "$base" in
            ts_*|cts_*) OVERLAY_LIST="${OVERLAY_LIST}	${base}
" ;;
        esac
    done
    python3 - "$CML" "$OVERLAY_LIST" <<'PYEOF'
import sys
path, overlays = sys.argv[1], sys.argv[2]
block = (
    "# >>> TS-TARGET-OVERLAYS >>> (added by build-ts-dll.sh -- do not remove)\n"
    "# The Specialists mod classes. They must live in the same side module the\n"
    "# engine dlopen's, so they go into the `server` SHARED target.\n"
    "list(APPEND SVDLL_SOURCES\n" + overlays + ")\n"
    "# <<< TS-TARGET-OVERLAYS <<<\n\n"
)
text = open(path).read()
anchor = "include_directories (. wpn_shared"
idx = text.index(anchor)
open(path, "w").write(text[:idx] + block + text[idx:])
print(f"    inserted {overlays.count(chr(10))} overlay sources")
PYEOF
fi

# Strip: the Release POST_BUILD step runs GNU strip, which cannot read WASM
# ("file format not recognized") and fails the link. wasm-strip is worse --
# it drops the dylink.0 custom section that Xash3D-FWGS's loader needs as the
# FIRST section. So: skip stripping entirely. The name section costs ~100KB
# and the module loads fine without it.
if grep -q "POST_BUILD DEPENDS" "$CML" && ! grep -q "Do NOT strip under EMSCRIPTEN" "$CML"; then
    echo "    disabling POST_BUILD strip (GNU strip can't read WASM)"
    python3 - "$CML" <<'PYEOF'
import sys
path = sys.argv[1]
text = open(path).read()
text = text.replace(
    "add_custom_command(TARGET ${SVDLL_LIBRARY}\n"
    "\t\t\tPOST_BUILD DEPENDS ${SVDLL_LIBRARY}\n"
    "\t\t\tCOMMAND ${CMAKE_STRIP} ${STRIP_FLAGS} $<TARGET_FILE:${SVDLL_LIBRARY}>)",
    "# Do NOT strip under EMSCRIPTEN: GNU strip can't read WASM and wasm-strip\n"
    "\t# drops the dylink.0 section the engine loader requires.\n"
    "\tif(FALSE)\n"
    "\t\tadd_custom_command(TARGET ${SVDLL_LIBRARY}\n"
    "\t\t\tPOST_BUILD DEPENDS ${SVDLL_LIBRARY}\n"
    "\t\t\tCOMMAND ${CMAKE_STRIP} ${STRIP_FLAGS} $<TARGET_FILE:${SVDLL_LIBRARY}>)\n"
    "\tendif()",
)
open(path, "w").write(text)
PYEOF
fi

# === 4. cmake configure + build ==============================================

echo "==> [4/6] Building with Emscripten toolchain"
cmake -S "$HLSDK" -B "$BUILD" \
    -DCMAKE_TOOLCHAIN_FILE="$EMSCRIPTEN_TOOLCHAIN" \
    -DCMAKE_BUILD_TYPE=Release \
    -DEMSCRIPTEN_FORCE_COMPILERS=ON \
    -DBUILD_CLIENT=OFF \
    2>&1 | tail -4

cmake --build "$BUILD" -j"$(nproc)" 2>&1 | tail -8

RAW_WASM="$BUILD/dlls/hl_emscripten_wasm32.so"
[[ -f "$RAW_WASM" ]] || { echo "ERROR: build produced no $RAW_WASM" >&2; exit 1; }
echo "    raw side module: $(stat -c%s "$RAW_WASM") bytes"

# === 5. rewrite-got.py — collapse GOT.func imports ===========================
# PIC codegen emits ~229 `(import "GOT.func" ...)` globals that the loader
# can't populate for same-module functions. The rewriter turns them into
# const-init globals holding the declaration index, taking the module from
# 277 imports / 229 GOT.func down to 47 / 0.

echo "==> [5/6] rewrite-got.py (GOT.func -> const-init globals)"
RW_OUT="$OUT/ts_emscripten_wasm32.rw.wasm"
python3 "$SCRIPT_DIR/rewrite-got.py" "$RAW_WASM" "$RW_OUT" 2>&1 | tail -4

# Pick the most-processed artifact (the dylink-first reorder lands alongside)
DEPLOY_WASM=""
for cand in "$RW_OUT.reordered" "$RW_OUT"; do
    [[ -f "$cand" ]] && { DEPLOY_WASM="$cand"; break; }
done
[[ -n "$DEPLOY_WASM" ]] || { echo "ERROR: rewrite-got produced no output" >&2; exit 1; }

# === 6. Safety gate + deploy =================================================
# The engine's dylink loader cannot handle side modules with a large import
# count, and a missing dylink.0 means it can't relocate at all. A missing
# Start section is the raw-emcc symptom that halts the engine. Refuse before
# touching either live path.

echo "==> [6/6] Safety gate"
IMPORT_COUNT=0
GOT_FUNC_COUNT=0
if [[ -x "$WABT_BIN" ]]; then
    DUMP=$("$WABT_BIN" -j Import -x "$DEPLOY_WASM" 2>/dev/null) || true
    IMPORT_COUNT=$(printf '%s\n' "$DUMP" | grep -c ' <- ' || true)
    GOT_FUNC_COUNT=$(printf '%s\n' "$DUMP" | grep -c 'GOT' || true)
else
    echo "WARNING: WABT wasm-objdump not at $WABT_BIN — gate limited" >&2
fi

if [[ "$IMPORT_COUNT" -gt 60 ]]; then
    echo "ERROR: Safety gate refused — $IMPORT_COUNT imports (limit 60)." >&2
    exit 1
fi
if [[ "$GOT_FUNC_COUNT" -gt 0 ]]; then
    echo "ERROR: Safety gate refused — $GOT_FUNC_COUNT residual GOT entries." >&2
    exit 1
fi
if ! "$WABT_BIN" -h "$DEPLOY_WASM" 2>/dev/null | grep -q dylink.0; then
    echo "ERROR: Safety gate refused — dylink.0 section missing." >&2
    exit 1
fi
if ! "$WABT_BIN" -h "$DEPLOY_WASM" 2>/dev/null | grep -q 'Start'; then
    echo "ERROR: Safety gate refused — Start section missing (raw-emcc symptom)." >&2
    exit 1
fi
echo "    import_count=$IMPORT_COUNT got_func=$GOT_FUNC_COUNT dylink=ok start=ok  PASS"

if [[ "$DEPLOY" == "1" ]]; then
    cp -f "$DEPLOY_WASM" "$DEST/ts_emscripten_wasm32.wasm"
    cp -f "$DEPLOY_WASM" "$DEST2/hl_emscripten_wasm32.wasm"
    echo
    echo "Deployed: $DEPLOY_WASM"
    echo "  -> $DEST/ts_emscripten_wasm32.wasm"
    echo "  -> $DEST2/hl_emscripten_wasm32.wasm"
    echo "  SHA $(sha256sum "$DEPLOY_WASM" | cut -d' ' -f1)"
else
    echo
    echo "Built (not deployed): $DEPLOY_WASM"
fi
