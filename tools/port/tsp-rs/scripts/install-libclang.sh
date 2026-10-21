#!/usr/bin/env bash
# install-libclang.sh — installs libclang.so into ~/.local/lib so
# bindgen can find it. We need this because libclang-dev (the apt
# package providing libclang.so) isn't installed on this host.
# 
# On a fresh Debian/Ubuntu, the standard install is
# apt install libclang-dev clang
# That gives you /usr/lib/llvm-*/lib/libclang.so.{19}.
# 
# When apt isn't available (no root, locked-down CI, etc.) we
# fall back to downloading the libclang1-19 .deb directly and
# symlinking:
# /home/kyle/.local/lib/libclang.so → libclang-19.so.19 (real file)

set -e

DEST="${LIBCLANG_PATH:-/home/kyle/.local/lib}"
mkdir -p "$DEST"

# Use whatever version is already extracted; if absent, download.
SCRATCH=/tmp/libclang-dl
if [[ ! -f $SCRATCH/extracted2/usr/lib/x86_64-linux-gnu/libclang-19.so.19 ]]; then
    mkdir -p $SCRATCH/extracted2
    cd $SCRATCH
    # Bookworm / trixie source for libclang1-19
    url="$(apt-cache show libclang1 2>/dev/null | grep '^Filename:' | head -1 | awk '{print "http://ftp.debian.org/debian/pool/main/" $2}')"
    if [[ -z $url ]]; then
        echo "apt-cache show libclang1 failed; falling back to hardcoded URL"
        url='http://ftp.debian.org/debian/pool/main/l/llvm-toolchain-19/libclang1-19_19.1.7-3+b1_amd64.deb'
    fi
    curl -sLfo libclang.deb "$url"
    mkdir -p extracted
    cd extracted
    ar x ../libclang.deb
    tar xf data.tar.xz
    cd ..
    mkdir -p extracted2
    cp -r extracted/usr/lib/x86_64-linux-gnu/* extracted2/
    cp -r extracted/usr/lib/llvm-19/lib/* extracted2/
fi

LIB=$(find $SCRATCH/extracted2 -name 'libclang-19.so.19' | head -1)
if [[ -z $LIB ]]; then
    echo "libclang-19.so.19 missing after extraction; aborting" >&2
    exit 1
fi
ln -sf "$LIB" "$DEST/libclang.so"
ln -sf "$LIB" "$DEST/libclang-19.so"
ln -sf "$LIB" "$DEST/libclang-19.so.19"
echo "install-libclang.sh: linked libclang.so -> $LIB"
ls -la "$DEST"/libclang*
