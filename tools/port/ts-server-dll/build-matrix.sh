#!/bin/bash
# D.7.22 build matrix runner.
# For each test case, run emcc with that flag delta against the
# canonical cts_game_rules.{h,cpp} source (which has g_engfuncs.pfnX
# calls), and report the import count.

set -u

REPO="/home/kyle/Development/specialists-browser"
SRCDIR="$REPO/tools/port/ts-server-dll/src"
OUT="$REPO/tools/port/ts-server-dll/build-matrix"
HLSDK="/tmp/hlsdk-portable"
EMSDK="/home/kyle/emsdk"
WABT="/tmp/wabt-1.0.42/bin"

export PATH="$WABT:$EMSDK:$EMSDK/upstream/emscripten:$PATH"
source "$EMSDK/emsdk_env.sh" >/dev/null 2>&1

HLSDK_SOURCES=()
while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    resolved="$(realpath -m "$HLSDK/dlls/$line")"
    [[ -f "$resolved" ]] && HLSDK_SOURCES+=("$resolved")
done < "$REPO/tools/port/ts-server-dll/hlsdk-sources.txt"

TS_SOURCES=("$SRCDIR"/cts_fog.cpp "$SRCDIR"/cts_game_rules.cpp "$SRCDIR"/ts_stub.cpp)
# Apply CTSGameRules hook patches (idempotent — guarded by marker)
PATCH_MARKER="$OUT/.ts_patches_applied"
mkdir -p "$OUT"
if [[ ! -f "$PATCH_MARKER" ]] || [[ "$HLSDK/dlls/gamerules.cpp" -nt "$PATCH_MARKER" ]]; then
    if grep -q "return new CTSGameRules;" "$HLSDK/dlls/gamerules.cpp"; then
        :
    else
        sed -i 's|return new CHalfLifeMultiplay;|return new CTSGameRules;|g' "$HLSDK/dlls/gamerules.cpp"
        sed -i 's|^\tSERVER_EXECUTE();$|\tSERVER_EXECUTE();\n\n#include "cts_game_rules.h"|' "$HLSDK/dlls/gamerules.cpp"
    fi
    touch "$PATCH_MARKER"
fi

run_one() {
    local label="$1"; shift
    local flags=("$@")
    local out="$OUT/$label.wasm"
    local log="$OUT/$label.log"
    echo "=== $label: '${flags[@]}' ===" | tee "$log"
    emcc "${HLSDK_SOURCES[@]}" "${TS_SOURCES[@]}" \
        "${flags[@]}" \
        -DCLIENT_DLL=0 -DHL_BUILD=1 -DXASH_EMSCRIPTEN=1 -DXASH_WASM=1 -DXASH_LITTLE_ENDIAN=1 \
        -Dstricmp=strcasecmp -D_strcasecmp=strcasecmp -D_strcmpi=strcasecmp \
        -Dstrnicmp=strncasecmp -D_strnicmp=strncasecmp -D_strncasecmp=strncasecmp \
        -D_snprintf=snprintf -D_vsnprintf=vsnprintf \
        -I"$HLSDK" -I"$HLSDK/dlls" -I"$HLSDK/game_shared" -I"$HLSDK/pm_shared" \
        -I"$HLSDK/common" -I"$HLSDK/engine" -I"$HLSDK/public" -I"$HLSDK/external" \
        -I"$SRCDIR" \
        -sSIDE_MODULE=1 -sERROR_ON_UNDEFINED_SYMBOLS=0 -sALLOW_MEMORY_GROWTH=1 \
        -Wl,--strip-all -Wl,--gc-sections \
        -o "$out" \
        >"$log" 2>&1
    if [[ ! -f "$out" ]]; then
        echo "  FAIL: no .wasm output" | tee -a "$log"
        return
    fi
    local imports
    imports="$("$WABT/wasm-objdump" -j Import -x "$out" | grep -c ' <- ')"
    local size
    size="$(stat -c%s "$out")"
    local gotf gotm
    gotf="$("$WABT/wasm-objdump" -j Import -x "$out" | grep -c 'GOT.func')"
    gotm="$("$WABT/wasm-objdump" -j Import -x "$out" | grep -c 'GOT.mem')"
    local sha
    sha="$(sha256sum "$out" | head -1 | cut -c1-15)"
    echo "  → $imports imports ($gotf GOT.func + $gotm GOT.mem), $size bytes, $sha..." | tee -a "$log"
}

# Baseline (current)
run_one "T-base-O3-flto" \
    -O3 -flto -fvisibility=hidden

# T01: drop LTO, keep O3
run_one "T01-O3-nolto" \
    -O3 -fno-lto -fvisibility=hidden

# T02: -O2 with LTO
run_one "T02-O2-flto" \
    -O2 -flto -fvisibility=hidden

# T03: -O2 no LTO
run_one "T03-O2-nolto" \
    -O2 -fno-lto -fvisibility=hidden

# T04: -O3 flto default visibility (no -fvisibility=hidden)
run_one "T04-O3-flto-default-vis" \
    -O3 -flto

# T05: -fno-pic + default vis
run_one "T05-O3-flto-fno-pic" \
    -O3 -flto -fvisibility=hidden -fno-pic

# T06: -Os (size-optimized)
run_one "T06-Os-flto" \
    -Os -flto -fvisibility=hidden

# T07: minimal-flags test
run_one "T07-O3-flto-min" \
    -O3 -flto -fvisibility=hidden -fno-exceptions -fno-rtti

# T08: -sRELOCATABLE=0
run_one "T08-O3-flto-no-reloc" \
    -O3 -flto -fvisibility=hidden -sRELOCATABLE=0

# T09: -Oz
run_one "T09-Oz-flto" \
    -Oz -flto -fvisibility=hidden

echo
echo "=== Summary ==="
for w in "$OUT"/*.wasm; do
    [[ -f "$w" ]] || continue
    bn=$(basename "$w" .wasm)
    imports="$("$WABT/wasm-objdump" -j Import -x "$w" | grep -c ' <- ')"
    gotf="$("$WABT/wasm-objdump" -j Import -x "$w" | grep -c 'GOT.func')"
    size=$(stat -c%s "$w")
    printf "  %-30s %d imports (%d GOT.func), %d bytes\n" "$bn" "$imports" "$gotf" "$size"
done
