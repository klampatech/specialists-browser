#!/usr/bin/env bash
# install-libclang.sh — installs libclang.so into ~/.local/lib so
# bindgen can find it.
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
# So the library is fetched DIRECTLY as a .deb from the Debian pool and
# unpacked by hand. The file is a few tens of megabytes, it comes from
# a different host than the Ubuntu mirrors, and it needs neither root
# nor apt. apt remains a fallback in the workflow, not the first path.
#
# WHAT IT PRODUCES
# ----------------
# $HOME/.local/lib/libclang.so -> the real libclang-19.so.19, and the
# port's own scripts/test.sh already looks in $HOME/.local/lib — so
# nothing else has to know about this.
#
# A LINK THAT DOES NOT RESOLVE IS WORSE THAN NO LINK: bindgen reports
# a missing libclang and not a broken one. So the last thing this
# script does is CHECK that the link resolves, and fail loudly if it
# does not.
set -euo pipefail

DEST="${LIBCLANG_PATH:-$HOME/.local/lib}"
SCRATCH="${LIBCLANG_SCRATCH:-$HOME/.local/cache/libclang-dl}"

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

# ALREADY HERE? Then there is nothing to do.
if [[ -n "$(find "$DEST" -maxdepth 1 -name 'libclang*.so*' -print -quit 2>/dev/null)" ]]; then
  echo "install-libclang.sh: $DEST already holds a libclang"
  ls -la "$DEST"/libclang* 2>/dev/null || true
  exit 0
fi

mkdir -p "$DEST" "$SCRATCH"

# NOT under /tmp: the symlinks this script creates point INTO the
# extracted library, and a /tmp that gets cleaned leaves them broken.
# bindgen then says "Unable to find libclang" -- while the files are
# plainly there -- because it does not follow a broken symlink to
# discover that. That is not a failure anyone can diagnose from the
# message, so the extraction lives somewhere durable.
EXTRACT="$SCRATCH/extracted"

if [[ ! -f "$EXTRACT/usr/lib/x86_64-linux-gnu/libclang-19.so.19" ]]; then
  rm -rf "$EXTRACT"
  mkdir -p "$EXTRACT"
  cd "$SCRATCH"

  deb=""
  for url in "${LIBCLANG_DEBS[@]}"; do
    echo "install-libclang.sh: trying $url"
    if curl -sSfL --retry 2 --retry-delay 2 -o libclang.deb "$url"; then
      deb="$url"
      break
    fi
    echo "install-libclang.sh:   ...not available"
  done
  if [[ -z "$deb" ]]; then
    echo "install-libclang.sh: no libclang .deb could be fetched" >&2
    exit 1
  fi

  cd "$EXTRACT"
  ar x "$SCRATCH/libclang.deb"

  # The payload's compression has changed under Debian over the years
  # (xz, then zstd), so let tar work it out and fall back to an
  # explicit zstd read if it cannot.
  if ! tar xf data.tar.* 2>/dev/null; then
    tar --zstd -xf data.tar.zst
  fi
  cd "$SCRATCH"
fi

LIB=$(find "$EXTRACT" -name 'libclang-19.so.19' | head -1)
if [[ -z "$LIB" ]]; then
  echo "install-libclang.sh: libclang-19.so.19 missing after extraction; aborting" >&2
  exit 1
fi

ln -sf "$LIB" "$DEST/libclang.so"
ln -sf "$LIB" "$DEST/libclang-19.so"
ln -sf "$LIB" "$DEST/libclang-19.so.19"

# A link that does not resolve is worse than no link: bindgen reports
# a missing libclang and not a broken one. Say so here, where it can be
# acted on — and FAIL, because a job that carries on to the tests with
# a broken libclang produces a confusing failure a long way from here.
for f in "$DEST/libclang.so" "$DEST/libclang-19.so"; do
  if [[ ! -e "$f" ]]; then
    echo "install-libclang.sh: $f does not resolve" >&2
    exit 1
  fi
done

echo "install-libclang.sh: linked libclang.so -> $LIB"
ls -la "$DEST"/libclang*
