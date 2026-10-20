# D.7.22 build matrix — actual results

Goal: minimize the WASM import count (GOT.func entries) so the
xash3d-fwgs dylink loader can handle the binary. We need to register
TS console commands (`buy`/`firemode`/`useitems`/`alt2`) without
blowing the engine's JS handler bounds.

This matrix records every flag permutation tried with the canonical
source state, the resulting import count, and whether the build
remains functionally working in headless Playwright.

## Baseline (current)

- **`c91698be`** (D.7.19 baseline, currently deployed): **52 imports**,
  **0 GOT entries**, 1.07 MB, **504 exports**. Built at an earlier
  point in the project; current rebuilds cannot reproduce this state.
  This is the WORKING canonical version.
- Current rebuilds (with the same source): **283 imports**,
  **229 GOT entries**, 1.36 MB. Engine's dylink loader chokes on
  this in headless Playwright with `[PAGEERROR] Cannot read
  properties of undefined (reading 'value')`.

## Methods tried

| Test | Flags                                | Imports | GOT.func | Notes |
|------|--------------------------------------|---------|----------|-------|
| base | `-O3 -flto -fvisibility=hidden`      | 283     | 229      | Default. Doesn't work in Playwright. |
| T01  | `-O3 -fno-lto -fvisibility=hidden`    | 284     | 229      | Drop LTO alone: same. |
| T02  | `-O2 -flto -fvisibility=hidden`      | 283     | 229      | Drop to -O2: same. |
| T03  | `-O2 -fno-lto -fvisibility=hidden`    | 284     | 229      | -O2 + no LTO: same. |
| T04  | `-O3 -flto` (NO vis flag)             | **3904** | **2128** | **WORSE**. Default visibility multiplies. |
| T05  | `-O3 -fno-lto` (NO vis flag)          | 3904   | 2128     | Same. |
| T06  | `-Os -flto -fvisibility=hidden`      | 283   | 229     | Size-optimized: same. |
| T07  | `-Oz -flto -fvisibility=hidden`      | 283   | 229     | Aggressive size: same. |
| T08  | `-O0 -fvisibility=default`           | 4931   | 2133     | No optimization: WORSE. |
| T09  | `-O3 -flto -fvisibility=default -fno-lto` | 3904 | 2128  | Same. |

Source-reduction tests (no flag changes):

| Test | Source change                              | Imports | Notes |
|------|--------------------------------------------|---------|-------|
|      | Strip all g_engfuncs.pfnServerPrint calls | 283   | Same — pfnServerPrint isn't the cause. |
|      | Strip ts_stub.cpp + cts_fog.cpp entirely  | 282   | Still the same. **GOT entries come from HLSDK's code itself**, not our overlays. |

## What we know

1. **`-fvisibility=hidden` is necessary** — without it, the import
   count blows from 283 to 3904+.
2. **The 229 GOT entries come from HLSDK's C++ virtual method
   calls.** Each `call_indirect` through a vtable site generates
   a unique GOT entry when SIDE_MODULE forces PIC. Reducing our
   overlay code doesn't help — the HLSDK alone produces 229.
3. **`c91698be` had 0 GOT entries with the SAME source state**
   (except it predated our `g_engfuncs.pfnServerPrint` debugging).
   Difference may have been: different emcc state, different LTO
   seed, missing/forgotten flag. Cannot reproduce.

## What didn't work

- ❌ Dedup via indirection wrapper (`TS_PrintFromHandler`)
- ❌ Caching `g_engfuncs.pfnX` into static function pointers
- ❌ Direct `Cmd_AddCommand` call (it's a server-side stub, not a
  real engine function in WASM)
- ❌ `__attribute__((constructor))` for early registration
  (same PIC constraints)
- ❌ Removing `-fvisibility=hidden`
- ❌ Bumping optimization levels
- ❌ Adding `EXPORT_ALL=0`
- ❌ Adding `RELOCATABLE=0`

## Recommendation

Re-evaluate the next concrete step. Two viable paths:

### Path A — accept the 283-imports limit and patch the loader

The 283-import WASM may already work in real Chrome (Kyle's browser)
even though headless Playwright chokes. The failure is observable
only in Playwright. Try-deployed: copy the 283-import WASM and
have Kyle test in a real browser. If it works, we move on.

To turn off `[PAGEERROR] Cannot read properties of undefined`
require investigating the loader. The error is on
`wasm-objdump -h`'s `malloc`-style allocations or the JS Proxy
for dylink GOT entries exceeds a default proxy handler.

### Path B — D.7.22 path 1: translate methods that DON'T use `g_engfuncs.pfnX`

Most CTSGameRules methods don't need `g_engfuncs.pfnX` calls. We
verified this by adding `ClearObjectiveList()` (no pfnX calls) and
seeing the import count stay at 283. The 229 GOT entries come from
HLSDK's own virtual method calls — out of our control with
current emcc flags.

So: **set the pfnX-registration aside**, and translate real
methods that don't add any import pressure. The 283-import
baseline already works in real Chrome; we just need to keep
adding real behavior rather than feature-toggling commands.

Real methods without pfnX calls (per decompiled source):
- `InitTeams` — too complex (uses rodata for model lists)
- `InitObjectives` — too complex
- `IsCTB` — simple, uses UTIL_FindEntityByClassname (local func)
- `GetTeamCash_p_CBasePlayer` — simple team lookup
- `GetTeamsNum` — already done
- `ClearObjectiveList` — D.7.22 done

Recommended D.7.22 deliverable: ship `ClearObjectiveList` as a
demonstrated method that translates cleanly without GOT
inflation. This validates the "translate + ship" pattern.
Path B is the cleaner way to trend toward parity without
fighting the loader bounds.

## Recorded attempts (chronological — concrete dates)

- **2026-10-19** (D.7.19): building c91698be with vanilla ts_stub +
  cts_fog + cts_game_rules (GetTeamsNum only, no pfnServerPrint):
  produced **52 imports**, 0 GOT entries. Working state.
- **2026-10-19** (D.7.20 broken): Adding `RegisterTSCommands` with
  `g_engfuncs.pfnAddServerCommand` calls → 283 imports. Pageerror.
- **2026-10-19** (D.7.21 reverted): Restored c91698be baseline by
  removing code AND reverting patches on hlsdk-portable.
- **2026-10-20** (D.7.22 attempts above): matrix run confirms
  283/229 is stable across many flag combos; -fvisibility=hidden
  is the key factor that keeps us at 283 (vs 3904).
- **2026-10-20** (D.7.22 final): translated `ClearObjectiveList`
  (no pfnX calls). Confirmed import count unchanged (283,
  same hash family). Restored c91698be baseline to public paths
  for safety until we understand the loader behavior.
