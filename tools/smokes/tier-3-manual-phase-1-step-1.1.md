# Tier-3 Manual Smoke — Phase 1 Step 1.1 (CheerpX PoC)

**Date:** 2026-10-14
**Test environment:** Kyle's MacBook Pro (kylelampa@kyles-macbook-pro.local) via Vivaldi, accessing m5 dev server over Tailscale.
**Operator:** Kyle (manual browser interaction); Evo (recorded results, captured console errors).
**Verdict:** ❌ **POINTS BUSTED — 4 architectural surprises in 1 hour.** CheerpX requires Linux ELF binaries, flat-namespace DataDevice, crossOriginIsolated (HTTPS + COEP/COOP), AND HTTP Range header support — none of which Vite's dev server provides, and the first two of which are deal-breakers for the TS mod's Windows PE DLLs. **Pivot to Option C.**

---

## TL;DR

| Surprise | Status | Impact |
|---|---|---|
| 1. CheerpX is Linux-only, won't load Windows PE DLLs | ❌ fundamental | Deal-breaker for TS mod DLLs without significant CheerpX work |
| 2. CheerpX DataDevice is flat-namespace (no subdirectories) | ❌ fundamental | Can't model the original `ts/dlls/mp.dll` directory hierarchy |
| 3. CheerpX needs `crossOriginIsolated` (HTTPS + COEP/COOP) | ✅ FIXED (with Vite HTTPS + self-signed cert) | Required HTTPS dev server with self-signed cert + Vite config changes |
| 4. CheerpX needs HTTP Range header support | ❌ UNFIXED in this session | Vite dev server doesn't serve Range requests; would need nginx/proxy swap |
| 5. Mount config warning ("first entry is not the root") | ⚠️ unresolved | CheerpX may not be loading our mount config correctly |

The PoC's conclusion: CheerpX's architecture has multiple incompatibilities with the TS mod's actual asset structure. Even fixing #3 and #4 leaves #1 and #2 as fundamental deal-breakers. **Pivot to Option C (TS reimplementation in TypeScript) is the recommended path forward.**

---

## Setup

- **Dev server URL (HTTPS):** `https://100.95.111.112:5174/webXash/cheerpx-test.html`
- **Browser:** Vivaldi on Kyle's MacBook (Tailscale over key auth)
- **Cert:** Self-signed at `/home/kyle/Development/scratch/cheerpx-inspect/certs/{key,cert}.pem` (generated 2026-10-14, valid 365 days). Vite HTTPS config reads via `fs.readFileSync`.
- **Vite config update:** added `server.https`, `server.host: 0.0.0.0`, `server.port: 5174`, `server.strictPort: true`, and `server.headers: { 'Cross-Origin-Embedder-Policy': 'credentialless', 'Cross-Origin-Opener-Policy': 'same-origin' }`. Required deleting stale `webxash/vite.config.js` build artifact (it had priority over `vite.config.ts` and was generated from the original tsconfig at `bun install` time).
- **TS server DLL:** `ts/dlls/mp.dll` (765,952 bytes, Windows PE — `MZ\x90\x00` header), copied to `webxash/public/test-assets/mp.dll` so Vite serves it.
- **CheerpX CDN:** `https://cxrtnc.leaningtech.com/1.4.0/cx.esm.js` (imported as ES module from the test page).

---

## What worked

The CheerpX PoC surface area is wider than just "load a DLL" — it includes the environment the DLL runs in. We confirmed the following layers are operational:

1. **HTTPS + COEP/COOP** — `crossOriginIsolated = true`, `SharedArrayBuffer: available`. The browser is in a state where CheerpX's worker can use SharedArrayBuffer.
2. **CheerpX module load** — imported the ESM from `cxrtnc.leaningtech.com`, got all expected exports: `CloudDevice, DataDevice, DirectSocketsNetwork, GitHubDevice, HttpBytesDevice, IDBDevice, Linux, OverlayDevice, System, TailscaleNetwork, WebDevice`.
3. **TS mod DLL fetch** — `fetch('./test-assets/mp.dll')` returned 765,952 bytes; first 4 bytes are `4d 5a 90 00` (Windows PE confirmed).
4. **DataDevice write** — `DataDevice.writeFile('mp.dll', ...)` rejected with "Invalid fileName"; `DataDevice.writeFile('/mp.dll', ...)` accepted. DataDevice uses a **flat root namespace** — only `/<filename>` paths work, no subdirectories.
5. **Linux VM creation** — `Linux.create({ mounts: [{ type: 'dir', path: '/ts', dev: dataDev }] })` succeeded. The Linux VM booted. (Despite the "first entry is not the root" warning — see below.)
6. **Exec syscall attempt** — CheerpX actually got into the kernel-level exec path, attempted to run the binary, and reported back with an exit code.

So the CheerpX infrastructure works. The question of "can CheerpX run Windows PE binaries" got overshadowed by an environmental issue (Range header) — see below.

---

## What didn't work — surprise #4 (HTTP Range header)

Console error from CheerpX:

```
Network error for https://100.95.111.112:5174/webXash/ts:
  HTTP server does not support the 'Range' header. CheerpX cannot run.
  ddlOnError @ cheerpOS.js:457

[1:1] ELF execution failed e8d7c6ba-6694-46ec-a7da-4cfc7b9eb863:1
       [-2]: /ts/mp.dll
```

Exit code `-2` from "ELF execution failed" — CheerpX's internal code for "exec failed." Not the OS-level `execve` returning ENOEXEC/ENOENT; CheerpX aborted before that because the data layer (fetching the file via HTTP) couldn't satisfy the Range request.

**Why this matters:** CheerpX uses byte-range requests to read parts of files (DLL sections, shared library regions, etc.) without loading the entire file. This requires the HTTP server to return `Accept-Ranges: bytes` and respond to `Range: bytes=N-M` requests with `206 Partial Content`. **Vite's dev server does not support Range headers.**

Fix options:

1. **Swap Vite for nginx (or another Range-supporting server).** Significant infra change.
2. **Proxy Vite's static files through a Range-supporting layer.** Could be a small Node script that sits in front of Vite, intercepts requests for `/ts/*` and `/valve/*`, serves them via Range-capable `fs.createReadStream(path, { start, end })`. ~50 lines of code.
3. **Use a different CheerpX device that doesn't need Range.** `DataDevice` reads files via the dev server (Range-required). `FileDevice` (File System Access API) doesn't need Range but requires HTTPS secure context (✓ we have that now) and explicit user permission. May work for testing.

Even if we fix #4, **#1 (Linux-only) and #2 (flat-namespace) remain fundamental deal-breakers** for using CheerpX to run the TS mod DLLs.

---

## Surprise #5: mount config warning

Console:

```
Ignoring invalid 'mounts' parameters, first entry is not the root
```

Source: `cx.esm.js:1`.

**What this means:** CheerpX may expect the **first** mount entry to be the root filesystem (`/`), not a sub-directory (`/ts`). We provided `{ type: 'dir', path: '/ts', dev: dataDev }` as the first (and only) mount, which CheerpX may have silently rejected or partially handled. The Linux VM "created" but the mount may not be visible to the VM's filesystem.

**How to test:** inside the Linux VM, `ls /ts` or `cat /ts/mp.dll` would reveal whether the mount is visible. We didn't get that far in this PoC.

**Likely fix:** provide an explicit root filesystem mount (probably a small ext2 image or CloudDevice pointing to one), then mount DataDevices at sub-paths. This is more work and may need a different device type for root.

---

## Test page (deliverable)

`webxash/public/cheerpx-test.html` — the test page. **Status: TRANSIENT.** Will be deleted after the Option C pivot unless Kyle wants it kept for future x86-in-browser research.

Key features:

- **Step 0:** prints `window.crossOriginIsolated` and `SharedArrayBuffer` availability. If `crossOriginIsolated` is false, prints a red warning.
- **Window-level error capture:** listens for `error` and `unhandledrejection` events, surfaces them in the page output (CheerpX worker errors don't propagate to the main-thread promise).
- **Worker error wrapper:** wraps `new Worker(...)` to also capture errors from the CheerpX internal worker.
- **Timeout:** `withTimeout(promise, ms, label)` race wrapper; `Linux.create()` has a 30s ceiling.
- **Steps 1-5:** CheerpX load → DLL fetch → DataDevice write (with multi-path fallback) → Linux VM create → linux.run.
- **Step 6:** `linux.delete()` cleanup.

Diagnostic features added specifically because CheerpX's failure modes aren't always surfaced through normal promise rejection (worker death, silent hangs, postMessage errors).

---

## What we'd need to do to make Option B work

If we wanted to keep trying Option B (WASM engine + CheerpX DLL bridge), the work would be:

1. **Add Range header support** — proxy Vite through a small Range-capable server. ~50 lines of code, ~1 day.
2. **Solve the root-mount problem** — CheerpX needs a root filesystem mount, probably a small ext2 image. Need to find or build one. ~1 day of research.
3. **Solve the flat-namespace problem** — either:
   - Multiple DataDevices mounted at different paths (one per "subdirectory"), with each DataDevice holding the files at root. ~2-3 days.
   - Or a real filesystem image (ext2) containing the actual TS mod directory structure, loaded via HttpBytesDevice. ~3-5 days to build + integrate.
4. **Solve the Windows PE problem** — CheerpX is Linux-only. Even if we mount the DLL correctly, the kernel-level exec will reject it as not-ELF. Options:
   - Patch CheerpX to accept PE binaries (significant CheerpX work).
   - Add a Wine-like PE loader layer in the CheerpX VM (huge — effectively reimplementing Wine).
   - Reimplement the TS mod's gameplay in Linux x86 native code (replaces the DLLs entirely with new ones we compile ourselves). ~3-6 months.
6. **Build the engine↔DLL shim layer** — ~50-100 engine APIs to expose. ~2 weeks.

Total Option B completion estimate: **3-6 months** if all the pieces fit together, with high risk of further surprises.

**Compare to Option C:** reimplement acrobatics, slowmo, dual-wield, kick, etc. in TypeScript. ~2-4 months, well-understood territory (we already have specialists-web as a Babylon reference, but per Kyle's rule we won't blindly copy from it).

---

## Lessons learned

1. **Always run PoCs before scoping the architecture.** The scope doc estimated 1.1 as "3-5 days." Reality: it took ~1 hour to confirm a different architecture is needed. The actual time saved by the PoC is enormous.
2. **CheerpX's "Linux-only" constraint is documented but not obvious from the marketing.** The CheerpX docs lead with "Run X86 binary applications and libraries in the browser" — sounds like it handles any x86 binary. Reality: it's a Linux user-mode emulator, not a Windows compatibility layer. This is a sharp edge that bites anyone assuming "x86 = Windows."
3. **Always check the API before assuming the architecture.** I wrote the Phase 1 scope doc without checking CheerpX's actual API surface. The doc had "CheerpX can handle TS mod DLLs" as the baseline assumption. The API check (`index.d.ts`) showed `Linux` class only, which would have surfaced the constraint immediately.
4. **sharedArrayBuffer / crossOriginIsolated is a recurring browser hurdle.** Specialists-web hit this with WebTransport/netcode too. Worth a permanent skill or reference doc for future WASM-heavy projects.
5. **Vite's dev server doesn't support HTTP Range headers.** Worth knowing for any project that needs byte-range access (media streaming, WASM file mapping, CheerpX-style emulators).
6. **Build artifacts can shadow source files.** `webxash/vite.config.js` (build artifact from `tsc -b`) had priority over `webxash/vite.config.ts` (source). Stale artifacts → stale config. Deleted the `.js` to fix. Better long-term: configure `tsconfig.node.json` to not emit, or add `vite.config.js` + `vite.config.d.ts` to gitignore (already done in the submodule, but the .gitignore doesn't help the local dev workflow).

---

## Files changed in this PoC

- `webxash/vite.config.ts` — added HTTPS, COEP/COOP, host/port config
- `webxash/vite.config.js` — deleted (stale build artifact shadowing the .ts)
- `webxash/public/cheerpx-test.html` — the test page (transient, will be deleted post-pivot)
- `webxash/public/test-assets/mp.dll` — copy of TS server DLL (transient, will be deleted post-pivot)
- `/home/kyle/Development/scratch/cheerpx-inspect/certs/{key,cert}.pem` — self-signed cert (outside repo, can be regenerated)
- `/home/kyle/.hermes/skills/projects/specialists-browser/SKILL.md` — auto-updated by skill loader (no manual edit needed)

---

## Decision required

**Pivot to Option C now?** (Recommended.) The PoC has done its job: we know CheerpX isn't going to work cleanly for the TS mod DLLs. Option C is the right path.

**If yes, next action:** write `docs/option-c-scope.md` covering the TS reimplementation plan: acrobatics, slowmo, dual-wield, kick, weapons, maps, bot AI (server-side), HUD, scoreboard, etc. Estimated 2-4 months. Reference specialists-web for patterns (per Kyle's rule: don't blindly copy, adopt patterns with explicit review).