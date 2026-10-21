// gen-fwgs-stub.sh — creates the public/build.h stub that bindgen needs.
//
// xash3d-fwgs's build.h is generated from public/build.c at wscript time
// (it computes XASH_BUILD_COMMIT_DATE and friends). Bindgen needs a
// populated build.h present in the source tree. We don't need it to match
// upstream — only to satisfy the platforms/structures the bindgen call
// inspects.
//
// Bindgen discovers structure layouts through:
//     XASH_LITTLE_ENDIAN | XASH_BIG_ENDIAN  → struct field order
//     XASH_32BIT | XASH_64BIT              → pointer size, struct alignment
//
// The minimal stub below is what the bindgen of v0.x headers needed. As the
// upstream xash3d-fwgs ABI evolves, this stub may need to add more
// platform/version macros; treat E0080 "index out of bounds" errors during
// goldsrc-sys's first build compile as a hint to update this file.

set -e
DEST="${1:-/tmp/xash3d-fwgs/public/build.h}"
mkdir -p "$(dirname "$DEST")"

cat > "$DEST" <<'EOF'
#ifndef BUILD_H_STUB_FOR_BINDGEN
#define BUILD_H_STUB_FOR_BINDGEN

/* Platform macros — POSIX host for now. Switch to XASH_WIN32 and add
 * XASH_LITTLE_ENDIAN when cross-compiling for Windows from a Linux host. */
#define XASH_POSIX  1
#undef  XASH_WIN32
#undef  XASH_APPLE
#undef  XASH_LINUX

/* Endianness — host is little-endian. */
#define XASH_LITTLE_ENDIAN  1
#undef  XASH_BIG_ENDIAN

/* Pointer size. Bindgen runs on the host, but we want struct layouts
 * to match what the actual DLL or WASM module uses. For TS's i386 .so
 * artifacts, this is XASH_32BIT; for FWGS's amd64 .so, XASH_64BIT. */
#define XASH_32BIT  1
#undef  XASH_64BIT
typedef int intptr_expected_x32;
typedef long long int64_expected_x64;

/* Version. Mirrors xash3d-fwgs master at vendoring time. */
#define XASH_VERSION_MAJOR  0
#define XASH_VERSION_MINOR  20
#define XASH_VERSION_PATCH  0

/* Engine identity. */
#define XASH_BUILD_COMMIT_DATE  "2026-10-21"

#endif /* BUILD_H_STUB_FOR_BINDGEN */
EOF

echo "gen-fwgs-stub.sh: wrote $DEST"
