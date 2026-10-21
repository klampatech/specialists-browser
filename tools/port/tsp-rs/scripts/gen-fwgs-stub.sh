#!/usr/bin/env bash
# gen-fwgs-stub.sh — creates the public/build.h stub that bindgen needs.
# 
# xash3d-fwgs generates this from public/build.c at wscript time, so a fresh
# checkout doesn't have it. Our goldsrc-sys bindgen call needs it present, and
# the struct-layout assertions in common/xash3d_types.h read the platform
# macros it defines.
# 
# We don't need it to match upstream — only to satisfy the assertions, which are
# the whole reason bindgen can produce correct layouts without us hand-writing
# every struct. Three groups of macros matter:
# 
# XASH_POSIX / XASH_WIN32 / XASH_APPLE / XASH_LINUX
# Which platform headers port.h pulls in. POSIX on a Linux host.
# XASH_LITTLE_ENDIAN / XASH_BIG_ENDIAN
# Field order in netadr_s and the byte-swap macros.
# XASH_32BIT / XASH_64BIT
# Which arm of STATIC_CHECK_SIZEOF(x, size32, size64) is checked, and how
# pointer-width alignment pads structs. THIS MUST follow the clang target,
# not the host: goldsrc-sys passes --target=<cargo TARGET>, so a native
# x86_64 build gets 64-bit layouts while a wasm32 build gets 32-bit. The
# clang builtins below detect it, which is why this derives the macro
# instead of hard-coding it — hard-coding XASH_32BIT made every native
# build fail with "customization_t unexpected size: 192 == 164".

set -e
DEST="${1:-/tmp/xash3d-fwgs/public/build.h}"
mkdir -p "$(dirname "$DEST")"

cat > "$DEST" <<'EOF'
#ifndef BUILD_H_STUB_FOR_BINDGEN
#define BUILD_H_STUB_FOR_BINDGEN

/* Platform. The host that runs bindgen is Linux. */
#define XASH_POSIX  1
#undef  XASH_WIN32
#undef  XASH_APPLE
#undef  XASH_LINUX

/* Endianness. Every host we build on is little-endian; bindgen would fail the
 * netadr_s layout check otherwise (it has endian-specific field order). */
#if defined(__BYTE_ORDER__) && __BYTE_ORDER__ == __ORDER_LITTLE_ENDIAN__
	#define XASH_LITTLE_ENDIAN  1
	#undef  XASH_BIG_ENDIAN
#else
	#error "build.h stub: host is big-endian; add XASH_BIG_ENDIAN here"
#endif

/* Pointer width. Follows the clang target, not the host: goldsrc-sys passes
 * --target=<cargo TARGET> to bindgen, and the struct sizes asserted below differ
 * between the 32-bit and 64-bit forms. */
#if defined(__wasm32__) || defined(__i386__) || defined(_M_IX86)
	#define XASH_32BIT  1
	#undef  XASH_64BIT
#elif defined(__x86_64__) || defined(__aarch64__) || defined(_M_X64) || defined(_M_ARM64)
	#define XASH_64BIT  1
	#undef  XASH_32BIT
#else
	#error "build.h stub: unknown pointer width; add a branch here"
#endif

/* Version. Mirrors xash3d-fwgs at vendoring time; only used for constants the
 * port's own code doesn't read. */
#define XASH_VERSION_MAJOR  0
#define XASH_VERSION_MINOR  20
#define XASH_VERSION_PATCH  0

/* Engine identity. Q_buildnum() parses this at runtime in the engine, not in the
 * port's bindings, so a placeholder date is fine here. */
#define XASH_BUILD_COMMIT_DATE  "2026-10-21"

#endif /* BUILD_H_STUB_FOR_BINDGEN */
EOF

echo "gen-fwgs-stub.sh: wrote $DEST"