#!/usr/bin/env bash
# build-ts-dll.sh — Compile TS server DLL as an Emscripten WASM side
# module that loads via dlopen in xash3d-fwgs.
#
# Why direct emcc instead of CMake:
# emscripten's Emscripten.cmake sets TARGET_SUPPORTS_SHARED_LIBS=FALSE,
# so `add_library(... SHARED ...)` silently becomes a static archive.
# Bypassing CMake and calling emcc with -sSIDE_MODULE=1 produces the
# real WASM side module. Verified: 5 imports for the stub (env.printf,
# env.__stack_pointer, env.__memory_base, env.__table_base, env.memory).
#
# Usage:
#   bash tools/port/ts-server-dll/build-ts-dll.sh
#
# Requires:
#   - emsdk (3.x or 6.x) at $EMSDK_ROOT or /home/kyle/emsdk
#   - The output goes to webxash/public/xash3d-fwgs/dist/dlls/ts_emscripten_wasm32.wasm

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/../../.." && pwd)"

EMSDK_ROOT="${EMSDK_ROOT:-/home/kyle/emsdk}"
if [[ -f "$EMSDK_ROOT/emsdk_env.sh" ]]; then
    source "$EMSDK_ROOT/emsdk_env.sh" >/dev/null
fi

SRC="$SCRIPT_DIR/src"
OUT="$SCRIPT_DIR/build"
DEST="$REPO/webxash/public/xash3d-fwgs/dist/dlls"

mkdir -p "$OUT" "$DEST"

echo "Building TS server DLL as WASM side module..."
emcc "$SRC/ts_stub.cpp" \
    -O2 \
    -sSIDE_MODULE=1 \
    -sERROR_ON_UNDEFINED_SYMBOLS=0 \
    -o "$OUT/ts_emscripten_wasm32.wasm"

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
    echo "Memory section:"
    /tmp/wabt-1.0.42/bin/wasm-objdump -j Memory -x \
        "$OUT/ts_emscripten_wasm32.wasm" | grep -E "memory|pages" | head -3
fi

# Copy to the engine's dlls dir so ts/gameinfo.txt can pick it up
cp "$OUT/ts_emscripten_wasm32.wasm" "$DEST/"
echo
echo "Deployed to: $DEST/ts_emscripten_wasm32.wasm"
echo
echo "To activate in TS: edit ts/gameinfo.txt to use"
echo "  gamedll_linux "dlls/ts_emscripten_wasm32.wasm""
echo "(instead of gamedll_linux "dlls/hl.dll")"
