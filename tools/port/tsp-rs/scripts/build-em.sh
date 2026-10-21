#!/usr/bin/env bash
# build-em.sh — environment setup for compiling tsp-rs to wasm32.
# 
# WHAT THIS DOES:
# 1. Puts emcc on PATH.
# 2. Sets FWGS_DIR to a xash3d-fwgs source checkout (must include
# a generated public/build.h — see scripts/gen-fwgs-stub.sh).
# 3. Sets LIBCLANG_PATH so bindgen can find libclang (system
# libclang-dev isn't installed; we use a local symlink).
# 4. Sets BINDGEN_EXTRA_CLANG_ARGS to add -isystem for clang's
# bundled stddef.h (no system glibc-dev installed).
# 5. Exports everything as `sourceable` environment for cargo.
# 
# USAGE:
# 
# source tools/port/tsp-rs/scripts/build-em.sh
# # Now the env is correct; the actual build command:
# cargo build --target wasm32-unknown-emscripten --release \
# -p ts-client-dll --no-default-features --features ts30

# --- 1. emscripten toolchain on PATH ---
: "${EMSDK_ROOT:=/home/kyle/emsdk}"
if [[ ! -x "$EMSDK_ROOT/upstream/emscripten/emcc" ]]; then
    echo "emsdk not found at $EMSDK_ROOT — set EMSDK_ROOT" >&2
    return 1 2>/dev/null || exit 1
fi
export PATH="$EMSDK_ROOT:$EMSDK_ROOT/upstream/emscripten:$PATH"

# --- 2. xash3d-fwgs source tree (must have public/build.h stubbed) ---
: "${FWGS_DIR:=/tmp/xash3d-fwgs}"
if [[ ! -d "$FWGS_DIR/common" ]]; then
    echo "xash3d-fwgs not found at $FWGS_DIR — set FWGS_DIR or clone:
    git clone --depth 1 https://github.com/FWGS/xash3d-fwgs.git $FWGS_DIR
    # Then copy the stub build.h in:
    cp $EMSDK_ROOT/../share/fwgs-build.h $FWGS_DIR/public/build.h
    # (script helps with that: scripts/gen-fwgs-stub.sh)" >&2
    return 1 2>/dev/null || exit 1
fi

# --- 3. libclang for bindgen ---
: "${LIBCLANG_PATH:=/home/kyle/.local/lib}"
if [[ ! -L "$LIBCLANG_PATH/libclang.so" ]] && [[ ! -f "$LIBCLANG_PATH/libclang.so" ]]; then
    echo "libclang.so not at \$LIBCLANG_PATH — see scripts/install-libclang.sh" >&2
    return 1 2>/dev/null || exit 1
fi
export LIBCLANG_PATH

# --- 4. clang resource + emsdk sysroot as system include paths ---
#         (no system glibc-dev installed; clang needs stddef.h etc.)
clang_resource="$EMSDK_ROOT/upstream/lib/clang/24/include"
emsdk_sysroot="$EMSDK_ROOT/upstream/emscripten/cache/sysroot/include"
export BINDGEN_EXTRA_CLANG_ARGS="-isystem $clang_resource -isystem $emsdk_sysroot"

echo "build-em.sh: env ready.
   emcc         $(which emcc)
   FWGS_DIR     $FWGS_DIR
   LIBCLANG_PATH $LIBCLANG_PATH
   BINDGEN_EXTRA_CLANG_ARGS $BINDGEN_EXTRA_CLANG_ARGS"
