#!/usr/bin/env bash
# build-wasm.sh — produce dist/ts-client_emscripten_wasm32.wasm from the
# vendored Rust port. The optimizer step is non-obvious in this stack, so
# it's captured here rather than left to memory.
#
# What this does, end to end:
#   1. Source the env (emsdk on PATH, libclang for bindgen, build.h stub in
#      xash3d-fwgs).
#   2. cargo build for wasm32-unknown-emscripten with --features ts30
#      (TS 3.0 ruleset only; the wasm build has no need for ts21's code).
#   3. wasm-opt -Oz with --all-features so the modern WASM features
#      (bulk-memory, sign-ext, mut-globals, nontrapping-f2i, reference-types,
#      multivalue, gc, +trunc-sat, exception-handling, bulk-memory-opt) are
#      all explicitly permitted; without this wasm-opt refuses the module
#      citing each feature individually.
#   4. Stage the optimized module into dist/.
#
# Why --no-default-features --features ts30:
#   The default features are empty (the upstream port does the same). For
#   WASM we explicitly skip both ts21 (smaller build) and tspkg (the
#   ureq/rustls/ring downloader — see tspkg comments in
#   crates/client/Cargo.toml).
#
# Why we don't run cargo xtask cross-compile like upstream:
#   xtask builds native executables; we need an emcc-linked side module,
#   which is a different target. The single cargo invocation below is
#   sufficient.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$REPO_ROOT/dist"
SRC_TARGET="$REPO_ROOT/target/wasm32-unknown-emscripten/release/client.wasm"
DEST="$DIST/ts-client_emscripten_wasm32.wasm"

# Step 1: env. Order matters — emsdk first, build-deps second.
: "${EMSDK_ROOT:=/home/kyle/emsdk}"
if [[ ! -x "$EMSDK_ROOT/upstream/bin/wasm-opt" ]]; then
    echo "wasm-opt not found at $EMSDK_ROOT/upstream/bin/wasm-opt" >&2
    exit 1
fi
export PATH="$EMSDK_ROOT/upstream/emscripten:$EMSDK_ROOT/upstream/bin:$PATH"
export LIBCLANG_PATH="${LIBCLANG_PATH:-/home/kyle/.local/lib}"
export FWGS_DIR="${FWGS_DIR:-/tmp/xash3d-fwgs}"

if [[ ! -d "$FWGS_DIR/common" ]]; then
    echo "xash3d-fwgs source tree not at $FWGS_DIR" >&2
    echo "  git clone --depth 1 https://github.com/FWGS/xash3d-fwgs.git $FWGS_DIR" >&2
    exit 1
fi

# Step 1.5: ensure the gen-fwgs-stub has been written. We run it every time;
# it's idempotent.
bash "$REPO_ROOT/scripts/gen-fwgs-stub.sh" "$FWGS_DIR/public/build.h" >/dev/null

# Step 2: build. We pass --release because the workspace profile sets
# debug = true for symbolize-able crashes but the linker's dead-code
# elimination still happens. wasm-opt at step 3 does the size cut.
cd "$REPO_ROOT"

# wasm-only build; --no-default-features is fine because the default set is
# empty. We just enable ts30 explicitly because the upstream cargo xtask's
# compile asserts at least one ruleset feature is on.
cargo build \
    --target wasm32-unknown-emscripten \
    --release \
    -p ts-client-dll \
    --no-default-features \
    --features ts30

# Step 3: optimize. --all-features unlocks every modern WASM extension the
# Rust compiler may emit. Without it, individual extensions trip validation
# one at a time.
mkdir -p "$DIST"
wasm-opt -Oz --all-features --strip-debug "$SRC_TARGET" -o "$DEST"

# Step 4: report.
RAW=$(stat -c %s "$SRC_TARGET" 2>/dev/null || echo 0)
OPT=$(stat -c %s "$DEST" 2>/dev/null || echo 0)
printf "build-wasm.sh: wrote %s\n" "$DEST"
python3 - <<PYEOF
raw = $RAW; opt = $OPT
def mb(n): return f"{n/1048576:.2f} MB"
def pct(a,b): return f"{(1-a/b)*100:.1f}%" if b else "n/a"
print(f"  raw:  {raw} bytes ({mb(raw)})")
print(f"  opt:  {opt} bytes ({mb(opt)}) - {pct(opt,raw)} reduction")
PYEOF
