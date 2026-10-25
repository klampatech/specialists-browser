#!/usr/bin/env bash
# Run the port's Rust test suite.
#
# WHY THIS SCRIPT EXISTS
# ----------------------
# The suite needs two things the environment does not hand you, and
# getting either wrong fails in a way that reads as "the port is broken":
#
#   - FWGS_DIR: the xash3d-fwgs headers. crates/goldsrc-sys's build script
#     needs them and panics with "FWGS headers not found" without them.
#   - LIBCLANG_PATH: where bindgen finds libclang. The port's other
#     scripts default it to ~/.local/lib, which install-libclang.sh fills
#     with symlinks into a download directory. That directory used to live
#     under /tmp -- so whenever /tmp was cleaned the symlinks went BROKEN
#     and bindgen said "Unable to find libclang" while the files were
#     plainly there, because it does not follow them.
#
# So: find a libclang that actually resolves, find a FWGS checkout, and
# run the tests with both set. One command, no guessing:
#
#     scripts/test.sh                 # the client suite
#     scripts/test.sh -p ts-server    # anything else cargo accepts
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

say() { printf '%s\n' "$*"; }
die() { printf 'test.sh: %s\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------- libclang
# A directory is usable if it holds a libclang.so that RESOLVES. `[[ -e ]]`
# follows symlinks, so a broken one is skipped -- which is the whole
# point: the broken ones are exactly the ones that used to be here.
find_libclang() {
  local candidates=() d f
  [[ -n "${LIBCLANG_PATH:-}" ]] && candidates+=("$LIBCLANG_PATH")
  candidates+=(/usr/lib/llvm-*/lib "$HOME/.local/lib")
  for d in "${candidates[@]}"; do
    [[ -d "$d" ]] || continue
    for f in "$d"/libclang.so "$d"/libclang-*.so; do
      [[ -e "$f" ]] || continue
      readlink -f "$d"
      return 0
    done
  done
  return 1
}

if ! LIBCLANG_DIR="$(find_libclang)"; then
  die "no usable libclang. Install one (apt-get install libclang-dev) or point
    LIBCLANG_PATH at a directory holding a libclang.so that resolves.
    scripts/install-libclang.sh installs one."
fi
export LIBCLANG_PATH="$LIBCLANG_DIR"

# --------------------------------------------------------------- FWGS_DIR
# The xash3d-fwgs headers. fetch-engine.sh puts a copy in /tmp; a checkout
# beside the port works too.
if [[ -z "${FWGS_DIR:-}" ]]; then
  for d in /tmp/xash3d-fwgs "$ROOT/../xash3d-fwgs" "$HOME/xash3d-fwgs"; do
    if [[ -f "$d/engine.h" || -f "$d/common/const.h" || -d "$d/engine" ]]; then
      FWGS_DIR="$(cd "$d" && pwd)"
      break
    fi
  done
fi
[[ -n "${FWGS_DIR:-}" ]] || die "no xash3d-fwgs checkout. Set FWGS_DIR, or run
    tools/deploy/fetch-engine.sh (which leaves one in /tmp/xash3d-fwgs)."
export FWGS_DIR

# The bindgen call needs public/build.h, which xash3d-fwgs GENERATES at
# wscript time -- a fresh checkout does not have it, and without it the
# build dies with "'build.h' file not found".
#
# The port's wasm build writes it; this script has to as well, or a clean
# machine cannot build the port at all. It is idempotent, and the same
# stub serves a native build and a wasm32 one: the pointer width is
# chosen by the C preprocessor from the clang target, not by this script.
bash "$ROOT/scripts/gen-fwgs-stub.sh" "$FWGS_DIR/public/build.h" >/dev/null

say "test.sh: LIBCLANG_PATH=$LIBCLANG_PATH"
say "test.sh: FWGS_DIR=$FWGS_DIR"

# The client suite by default; anything else cargo accepts can be passed.
if [[ $# -eq 0 ]]; then
  set -- --release -p ts-client
fi

exec cargo test "$@"
