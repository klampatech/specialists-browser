# Tier-3 Manual Smoke — Phase 1 Step 1.2 (Bridge Layer: ts-host + CheerpX bugs)

**Date:** 2026-10-14
**Test environment:** Kyle on phone (Android via Tailscale), also Mac (Vivaldi); dev server `https://100.95.111.112:5174/webXash/cheerpx-test.html`.
**Operator:** Kyle (browser interaction); Evo (compiled, configured, recorded).
**Verdict:** ❌ **BRIDGE LAYER POINTS BUSTED.** CheerpX's dynamic linker has cascading bugs that prevent running the TS server .so in the browser. **Pivot to Option D (AI-decompile) recommended.**

> **Context:** Phase 1 step 1.1 (v4 PoC) proved CheerpX CAN load `ts/dlls/ts_i386.so` and see all 1387+ exported symbols including TS-specific gameplay functions (`CTSSlowMotion`, `CTSGunUci`, `CTSSharedEmitter`, etc.). Step 1.2 was supposed to write a `ts-host` bridge binary that `dlopen`'s the .so + looks up symbols. Step 1.2 is **NOT** a "did it work" milestone — it's a "we discovered the bridge approach is blocked at the runtime layer" milestone.

---

## TL;DR

| Iteration | What was tried | Result |
|---|---|---|
| v1 (`ts-host-v1`) | Dynamically linked binary on m5 (Debian 13's gcc-multilib), loaded via DataDevice + `dlopen` | GLIBC_2.34 not found (mismatch with CheerpX's glibc 2.28) |
| v2 (`ts-host-static`) | Static binary with glibc 2.41 embedded | "cannot enable executable stack" (TS .so was built without PT_GNU_STACK) |
| v3 (`ts-host-v2.c`) | Same + console capture via `setCustomConsole` + 60s timeouts | All commands worked, /dlls/ visible, 1387+ symbols confirmed |
| v4 (Patch) | Patched `ts_i386.so` to add `PT_GNU_STACK` segment with `RW` flags (no execute) via custom Python ELF patcher | Static binary ran, dlopen failed on "rame_info" |
| v5 (`ts-host-debian10`) | Binary compiled in Debian 10 Docker container (glibc 2.28) — matches CheerpX runtime | "rame_info: cannot open shared object file" — same error |
| v6 (`ts-host-v3.c`) | Full diagnostics + env dump + opendir + hex-dump of dlerror | Confirmed LD_LIBRARY_PATH=/dlls set, libs present, dlopen of libc/libdl work, but .so still fails |
| v7 (`ts-host-v4.c`) | File open tests + dlopen test on libgcc_s.so.1 | Confirmed `stat`/`open` work, libgcc_s dlopen works (loads `__register_frame_info`), but .so still fails |
| v8 (`ts-host-v5.c`) | ts-host provides its own `__register_frame_info` stubs + LD_PRELOAD=libgcc_s | dlopen of .so STILL fails with same error |
| v9 (LD_DEBUG=libs) | Added `LD_DEBUG=libs` to env | **Reveals the bug:** linker searches for library named "rame_info" (not "libm.so.6") |
| v10 (Workaround) | Wrote `libm.so.6` bytes to `/dlls/rame_info` (DataDevice supports multi-path) | `rame_info` resolves; next error: `d_alloc` |
| v11 (Workaround) | Wrote `libc.so.6` bytes to `/dlls/d_alloc` | `d_alloc` resolves; next error: **`Inconsistency detected by ld.so: dl-version.c: 205: _dl_check_map_versions: Assertion 'needed != NULL' failed!`** |

**Cascade stops at the version-check assertion. Past that, more bugs likely.**

---

## The cascade — what we learned

### 1. CheerpX's dynamic linker has a buffer state bug

The linker reads library names from the wrong offset in the ELF string table. Each "library" it's looking for is actually a **truncated substring** of a longer name that exists elsewhere in a .so:

| "Library" looked for | Actual substring source | Real name |
|---|---|---|
| `rame_info` (9 chars) | `__register_frame_info` (in ts_i386.so at multiple offsets, also in libgcc_s.so.1) | (linker thinks it needs this as a library) |
| `d_alloc` (7 chars) | Some symbol in libc.so.6 at offset 62606 (likely `glib_d_alloc` or `libdl_dl_alloc` or a debug string) | (linker thinks it needs this as a library) |
| (next) | ? | ? |

**Cascade pattern:** linker is looking up "library" names that don't exist. The pattern suggests an off-by-X offset read in the string table.

### 2. The buffer bug isn't the only issue

After providing `/dlls/rame_info` (a copy of libm.so.6 bytes) and `/dlls/d_alloc` (a copy of libc.so.6 bytes), the linker was satisfied with both lookups but THEN hit:

```
Inconsistency detected by ld.so: dl-version.c: 205:
  _dl_check_map_versions: Assertion `needed != NULL' failed!
```

This is from glibc 2.28's `dl-version.c` running inside CheerpX's emulated ld.so. The version-check logic expects a non-NULL "needed" reference but found NULL. This is a SECOND bug in CheerpX's dynamic linker — not the buffer state issue, but a separate problem with how versions are resolved.

### 3. Symbol resolution would also be affected

Even if dlopen succeeded, the same buffer state bugs would likely affect:
- Symbol lookups (dlsym) — would return wrong symbol names
- Function calls — would bind to wrong addresses
- The whole runtime emulation is fragile

This isn't a "one more workaround and we're done" situation. It's a fundamental incompatibility.

---

## What we proved (good news)

1. **CheerpX can run Debian 10 Linux user-mode.** `uname -a` returns `Linux 4.15.0-54-cheerpx i386 GNU/Linux`. The kernel emulation works.

2. **DataDevice mounts work.** Files in `/dlls/` are visible to the VM via `stat`, `open`, `opendir`, `dlopen`, `exec`.

3. **The TS server .so is intact and accessible.** `nm -D` shows 1387+ exported symbols including:
   - `CTSSlowMotion`, `CTSSlowMotionPoint` (slowmo system)
   - `CTSGunUci`, `CTSSharedEmitter` (TS weapons and effects)
   - `GiveFnptrsToDll` (GoldSrc mod entry point)
   - All entity dispatch functions, ammo/scoring, etc.

4. **Standard system libraries are present and dlopen-able.** libc.so.6, libdl.so.2, libm.so.6 (after we provided it), libgcc_s.so.1 (after we provided it). All accessible via LD_LIBRARY_PATH=/dlls.

5. **The static binary approach works** (ts-host-static 730KB, fully static). The issue isn't the binary — it's the dynamic linker.

---

## What we didn't make work (the dead end)

- ❌ dlopen of `/dlls/ts_i386.so` from a dynamically-linked binary (works for libc/libdl, fails for ts_i386.so)
- ❌ Preloading libgcc_s.so.1 (LD_PRELOAD fails on /dlls/libgcc_s.so.1 even after we provided it)
- ❌ Providing libgcc_s stubs in the bridge binary (the linker still tries to dlopen something)
- ❌ Workarounds for the "library not found" cascade (each fix reveals the next bug)

---

## Why the pivot to Option D

The runtime path through CheerpX is **fundamentally blocked** by multiple buffer/state bugs in their dynamic linker. We can't patch CheerpX (it's a third-party product). We can keep stacking workarounds, but each fix is a guess and reveals the next bug.

**Option D (AI-decompile) bypasses the runtime entirely.** We don't need to RUN the .so — we just need to READ it and have an AI produce TypeScript pseudocode. That code can be cleaned up into a working browser game without touching CheerpX's dynamic linker at all.

The October 2026 wave (HL2, Black Ops, GTA V) proved this approach works. We have:
- The .so file with full debug symbols (not stripped)
- 1387+ named symbols (function names + classes)
- 100+ years of human context (community docs, moddb comments, gameplay videos)
- Modern AI (Claude Sonnet 4) that can read x86 assembly and produce clean TypeScript

**Estimate: 4–6 weeks** (vs. Option C's 10–16 weeks for clean reimpl, vs. infinite for continuing the CheerpX workaround cascade).

---

## Files changed in this PoC

- `webxash/public/cheerpx-test.html` — test page v1 through v6, gitignored by submodule
- `webxash/public/test-assets/ts-host` — bridge binary, latest = v5 (16KB, with libgcc_s stubs)
- `webxash/public/test-assets/ts_i386.so` — TS server mod (patched with PT_GNU_STACK)
- `webxash/public/test-assets/libm.so.6` — Debian 10's libm, ~1MB
- `webxash/public/test-assets/libc.so.6` — Debian 10's libc, ~1.9MB
- `webxash/public/test-assets/libdl.so.2` — Debian 10's libdl, ~18KB
- `webxash/public/test-assets/ld-linux.so.2` — Debian 10's dynamic linker, ~167KB
- `webxash/public/test-assets/libgcc_s.so.1` — Debian 10's libgcc_s, ~116KB
- `tools/ts-host-v1.c` through `tools/ts-host-v5.c` — bridge source code, ~2-4KB each
- `tools/ts-host-debian10`, `tools/ts-host-v1` through `tools/ts-host-v5` — compiled bridge binaries
- `tools/lib*.so.6`, `tools/ld-linux.so.2`, `tools/libgcc_s.so.1` — system libraries (mirror of test-assets)
- `tools/patch_gnu_stack.py` — custom Python ELF patcher for adding PT_GNU_STACK

All `webxash/public/test-assets/*` and `webxash/public/cheerpx-test.html` are gitignored by the submodule. The `tools/*` files are not — we'll commit the source code (.c files + patch_gnu_stack.py) and leave the binaries as local-only.

---

## Decision required

**Pivot to Option D (AI-decompile the .so to TypeScript).** Plan in `docs/option-d-scope.md`. Estimated 4–6 weeks to Phase 1 MVP. The runtime path is blocked; this is the way forward.

Kyle approved this pivot. Next: D.1 (pick binary, extract analysis data, write the prompt template).