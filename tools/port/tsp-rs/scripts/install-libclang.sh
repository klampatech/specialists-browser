#!/usr/bin/env bash
# install-libclang.sh — installs a libclang.so that bindgen can load.
#
# WHY IT DOES NOT USE APT
# -----------------------
# On a fresh Debian/Ubuntu the standard install is
#
#     apt install libclang-dev clang
#
# and that gives /usr/lib/llvm-*/lib/libclang.so.{19}. But apt is a
# NETWORK DEPENDENCY ON A MIRROR, and on 2026-11-11 GitHub's hosted
# runners could not resolve the Ubuntu mirrors at all:
#
#     E: Failed to fetch https://security.ubuntu.com/ubuntu/pool/...
#        Temporary failure resolving 'security.ubuntu.com'
#
# The Rust port's job in CI died in that apt call, in the install step,
# BEFORE A SINGLE TEST RAN — and so did the deploy's browser
# verification. Five attempts across two workflows over twenty minutes,
# the same failure every time.
#
# So the library is fetched from somewhere that is NOT the Ubuntu
# mirrors. Two places are tried, and BOTH are verified by loading the
# result, because a library that is present and unloadable is worse
# than one that is absent:
#
#   1. THE PyPI WHEEL. The `libclang` wheel ships a native
#      libclang.so that has LLVM LINKED IN STATICALLY — it depends on
#      libc, libm, libdl and nothing else. No libLLVM, no libxml2, no
#      libz3, no chain of runtime libraries that the machine might not
#      have. 24 MB, from PyPI, which is not the Ubuntu mirrors.
#   2. THE DEBIAN POOL .deb. libclang1-19 unpacked by hand. It works
#      on a machine that already has a compatible LLVM runtime, which
#      is why it is second and not first.
#
# apt remains a fallback in the workflow, not the first path.
#
# WHAT IT PRODUCES
# ----------------
# $HOME/.local/lib/libclang.so — and the port's own scripts/test.sh
# already looks in $HOME/.local/lib, so nothing else has to know.
#
# A LINK THAT DOES NOT RESOLVE IS WORSE THAN NO LINK: bindgen reports
# a missing libclang and not a broken one. So the last thing this
# script does is CHECK that the library actually loads, and fail
# loudly if it does not.
set -euo pipefail

DEST="${LIBCLANG_PATH:-$HOME/.local/lib}"
SCRATCH="${LIBCLANG_SCRATCH:-$HOME/.local/cache/libclang-dl}"

# THE WHEEL VERSION. Pinned, like the port's rust-toolchain.toml:
# a build that changes under you is a build you cannot reproduce.
LIBCLANG_WHEEL_VERSION="${LIBCLANG_WHEEL_VERSION:-18.1.1}"

# THE .deb FILES, NEWEST FIRST.
#
# These are the Debian bookworm pool builds of the LLVM 19 runtime
# library. The URLs are verified to resolve and to return 200, but a
# pool file is eventually superseded and removed, so there is more than
# one and they are tried in order. The library is built against glibc
# 2.36, which every Ubuntu since 22.04 satisfies.
#
# The name is libclang1-19 (the runtime library), NOT libclang1 — the
# latter is a transitional package that depends on this one and
# contains no library at all. Asking apt for it by name is how one
# ends up unpacking a package with no libclang in it.
LIBCLANG_DEBS=(
  "http://ftp.debian.org/debian/pool/main/l/llvm-toolchain-19/libclang1-19_19.1.7-22+b1_amd64.deb"
  "http://ftp.debian.org/debian/pool/main/l/llvm-toolchain-19/libclang1-19_19.1.7-3+b1_amd64.deb"
  "http://ftp.debian.org/debian/pool/main/l/llvm-toolchain-19/libclang1-19_19.1.7-3~deb12u1_amd64.deb"
)

# AND THE LLVM RUNTIME IT LINKS AGAINST, WHICH IS A DIFFERENT PACKAGE.
#
# libclang-19.so.19 has a DT_NEEDED on libLLVM.so.19.1, and that file
# lives in libllvm19 — not in libclang1-19. It is only fetched when
# the machine has no usable one of its own, because the pool build of
# libLLVM wants libxml2.so.16 and libz3.so.4, and dragging those in
# is the dependency chain this script exists to avoid.
LLVM_DEBS=(
  "http://ftp.debian.org/debian/pool/main/l/llvm-toolchain-19/libllvm19_19.1.7-22+b1_amd64.deb"
  "http://ftp.debian.org/debian/pool/main/l/llvm-toolchain-19/libllvm19_19.1.7-3+b1_amd64.deb"
  "http://ftp.debian.org/debian/pool/main/l/llvm-toolchain-19/libllvm19_19.1.7-3~deb12u1_amd64.deb"
)

# ---------------------------------------------------------------- helpers

# DOES THIS LIBRARY LOAD? `ldd` resolves the whole chain, and it is in
# glibc, so it is always there. A library with an unresolved dependency
# is reported by ldd as "not found" — and that is exactly the state
# bindgen reports as a missing libclang.
loads() {
  local lib="$1"
  [[ -e "$lib" ]] || return 1
  ldd "$lib" 2>/dev/null | grep -q 'not found' && return 1
  return 0
}

# WHAT IS MISSING, said plainly. The point of this is that the next
# person to read the log does not have to guess.
missing_deps() {
  ldd "$1" 2>/dev/null | grep 'not found' | sed 's/^[[:space:]]*//' | sort -u
}

# ------------------------------------------------------------ the wheel
install_from_wheel() {
  local whl
  echo "install-libclang.sh: trying the PyPI libclang wheel (${LIBCLANG_WHEEL_VERSION})"
  local out
  out="$(python3 -m pip download --no-deps --only-binary=:all: \
            --dest "$SCRATCH" "libclang==${LIBCLANG_WHEEL_VERSION}" 2>&1)" || {
    echo "install-libclang.sh:   ...pip could not fetch it: $(printf '%s' "$out" | tail -1)"
    return 1
  }
  whl="$(find "$SCRATCH" -maxdepth 1 -name 'libclang-*.whl' | head -1)"
  if [[ -z "$whl" ]]; then
    echo "install-libclang.sh:   ...no wheel in the download"
    return 1
  fi
  local unpacked="$SCRATCH/wheel"
  rm -rf "$unpacked"
  mkdir -p "$unpacked"
  # The wheel is a zip; python3 unpacks it without needing unzip.
  python3 -c 'import sys, zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])' \
    "$whl" "$unpacked" || return 1
  local so
  so="$(find "$unpacked" -name 'libclang.so' | head -1)"
  if [[ -z "$so" ]]; then
    echo "install-libclang.sh:   ...the wheel holds no libclang.so"
    return 1
  fi
  install -m 0755 "$so" "$DEST/libclang.so"
  if ! loads "$DEST/libclang.so"; then
    echo "install-libclang.sh:   ...the wheel's libclang does not load:"
    missing_deps "$DEST/libclang.so" | sed 's/^/      /'
    rm -f "$DEST/libclang.so"
    return 1
  fi
  echo "install-libclang.sh:   ...the wheel's libclang loads"
  return 0
}

# -------------------------------------------------------------- the .deb
#
# fetch_and_unpack <url> <file name inside the .deb to find> <destination>
#
# The .deb is an ar archive: the payload is data.tar.{xz,zst,gz}. The
# compression has changed under Debian over the years, so let tar work
# it out and fall back to an explicit zstd read if it cannot.
fetch_and_unpack() {
  local url="$1" want="$2" dest="$3" ok=0
  mkdir -p "$dest"
  ( cd "$SCRATCH" && curl -sSfL --retry 2 --retry-delay 2 -o libclang.deb "$url" ) || return 1
  rm -rf "$dest"
  mkdir -p "$dest"
  ( cd "$dest" && ar x "$SCRATCH/libclang.deb" ) || return 1
  if ! ( cd "$dest" && tar xf data.tar.* 2>/dev/null ); then
    ( cd "$dest" && tar --zstd -xf data.tar.zst ) || return 1
  fi
  if find "$dest" -name "$want" -print -quit | grep -q .; then
    ok=1
  fi
  return $((1 - ok))
}

install_from_deb() {
  local extract="$SCRATCH/extracted" url got
  echo "install-libclang.sh: trying the Debian pool .deb"
  for url in "${LIBCLANG_DEBS[@]}"; do
    echo "install-libclang.sh:   ...$(basename "$url")"
    if fetch_and_unpack "$url" libclang-19.so.19 "$extract"; then
      got="$(find "$extract" -name 'libclang-19.so.19' | head -1)"
      break
    fi
  done
  if [[ -z "${got:-}" ]]; then
    echo "install-libclang.sh:   ...no libclang .deb could be fetched"
    return 1
  fi
  ln -sf "$got" "$DEST/libclang.so"
  ln -sf "$got" "$DEST/libclang-19.so"
  ln -sf "$got" "$DEST/libclang-19.so.19"

  # THE RUNTIME, ONLY IF THE MACHINE HAS NONE.
  #
  # libclang-19.so.19 needs libLLVM.so.19.1. If the machine has one
  # that loads — most do — the loader finds it and there is nothing to
  # do. If it does not, the pool build of libLLVM is fetched, and it
  # drags in libxml2.so.16 and libz3.so.4, which is the chain the
  # wheel avoids entirely.
  if ! loads "$DEST/libclang.so"; then
    if ! missing_deps "$DEST/libclang.so" | grep -q 'libLLVM'; then
      echo "install-libclang.sh:   ...the libclang does not load:"
      missing_deps "$DEST/libclang.so" | sed 's/^/      /'
      return 1
    fi
    echo "install-libclang.sh:   ...no usable libLLVM on this machine; fetching one"
    local llvm_extract="$SCRATCH/extracted-llvm" llvm_got=""
    for url in "${LLVM_DEBS[@]}"; do
      if fetch_and_unpack "$url" libLLVM.so.19.1 "$llvm_extract"; then
        llvm_got="$(find "$llvm_extract" -name 'libLLVM.so.19.1' | head -1)"
        break
      fi
    done
    if [[ -z "$llvm_got" ]]; then
      echo "install-libclang.sh:   ...the LLVM runtime could not be fetched"
      return 1
    fi
    cp -f "$llvm_got" "$DEST/libLLVM.so.19.1"
    ln -sf libLLVM.so.19.1 "$DEST/libLLVM.so.19"
  fi

  if ! loads "$DEST/libclang.so"; then
    echo "install-libclang.sh:   ...the .deb's libclang does not load:"
    missing_deps "$DEST/libclang.so" | sed 's/^/      /'
    return 1
  fi
  echo "install-libclang.sh:   ...the .deb's libclang loads"
  return 0
}

# ------------------------------------------------------------------ main
mkdir -p "$DEST" "$SCRATCH"

# ALREADY HERE? Then there is nothing to do — but only if it LOADS.
if [[ -e "$DEST/libclang.so" ]] && loads "$DEST/libclang.so"; then
  echo "install-libclang.sh: $DEST already holds a libclang that loads"
  ls -la "$DEST"/libclang* 2>/dev/null || true
  exit 0
fi

install_from_wheel || install_from_deb || {
  echo "install-libclang.sh: no libclang could be installed without apt" >&2
  exit 1
}

# A link that does not resolve is worse than no link: bindgen reports
# a missing libclang and not a broken one. Say so here, where it can be
# acted on — and FAIL, because a job that carries on to the tests with
# a broken libclang produces a confusing failure a long way from here.
if ! loads "$DEST/libclang.so"; then
  echo "install-libclang.sh: $DEST/libclang.so does not load:" >&2
  missing_deps "$DEST/libclang.so" | sed 's/^/      /' >&2
  exit 1
fi

echo "install-libclang.sh: libclang is in place and it loads"
ls -la "$DEST"/libclang*
