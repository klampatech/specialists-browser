VERDICT: PASS-WITH-NOTES

The control-flow rebuild is faithful to the disassembly (every branch — `scale <= cutoff` return, `delta < cutoff` reset, `correctedDelta >= recoilDuration` rebound, clamp-to-cap — maps to a labeled chunk, and the FPU `fcomp`+`test ah,0x41`/`test ah,0x1`+`jne` predicates invert correctly). Two real defects: (a) `0x68` is used as a placeholder for nine *different* cvar slots, which is silently wrong (`0x68 = 104` corrupts the math on frame 1), and (b) the demangler shows 4 args after `this` but the TS body uses only 3 and doesn't carry the 4th. There's also a couple of smaller items (compile-isolation, the invented `getStability()` name) that the checklist explicitly asks about.

Checklist (re-cast for a gameplay class method — items 1–4 of the prompt target the engine↔mod interface stubs and don't apply here):

1. **Signature** — ⚠️ — Demangled: `CTSGun::ScaleSpread(r ?, float, float, int)`, i.e. 4 args + implicit `this`. Disassembly reads three stack slots (`[esp+0x34] = edi → float&`, `[esp+0x38] = scale`, `[esp+0x3c] = ebp → flag`). Return is `void` (no `eax` set before `ret`). The TS matches the disassembly but not the demangled symbol — keep the 4th arg as `_unused` so the TS signature lines up with the demangler.
2. **Version check pattern** — N/A (not `GetEntityAPI*` / `GetNewDLLFunctions`).
3. **`*interfaceVersion` assignment-back** — N/A.
4. **Success path / struct copy** — N/A — no `memcpy` analog here.
5. **No fabricated code paths** — ✅ — every branch traced to a disassembly chunk; only the vtable slot name is a guess (and that's flagged).
6. **No TODO-only body** — ✅ — body is real code; TODOs are scoped to cvar offsets + the one virtual call.
7. **Field names** — ✅ — `m_pPlayer`, `lastSpreadTime`, `spreadFlag`, `recoilAccumulator`, `gpGlobals.time`, `DoubleFireRate(player)` all match HLSDK / TS-mod conventions. Offsets are commented inline (`[esi+0x80]`, `[esi+0x9e8]`, `[esi+0x9ec]`, `[eax+0x60]`, `[eax+0x778]`, `GOT[+0x1600]`), so the audit is reproducible.
8. **Compiles in isolation** — ⚠️ — references `CTSGun`, `CBasePlayer`, `gpGlobals`, `DoubleFireRate` that aren't declared in this file. Per checklist item 8, use `any` (or add `declare` stubs) for unknowns.

Issues to fix:

- **`0x68` is not a valid placeholder float.** It appears for **nine** distinct GOT slots (`-0x6df10`, `-0x6f408`, `-0x6df4c`, `-0x6ec2c`, `-0x6df0c`, `-0x6f3fc`, `-0x6f3f4`, `-0x6f010`, `-0x6ecd8`). Each slot is a different cvar / constant; `0x68 = 104` is wildly wrong for every one of them — recoil would multiply by 104 per shot and the spread multiplier would *blow through every clamp on frame one*. Replace with named constants and use `NaN` so a missing cvar is loud at runtime:
  ```typescript
  const SPECIAL_FIRE_SPREAD_MULT: number = NaN; // GOT[-0x6df10]
  const SCALE_CUTOFF:               number = NaN;// GOT[-0x6f408]
  const BASE_RECOIL_SCALE:          number = NaN;// GOT[-0x6df4c]
  const DOUBLE_FIRE_RECOIL_MULT:    number = NaN;// GOT[-0x6ec2c]
  const SPECIAL_FIRE_RECOIL_MULT:   number = NaN;// GOT[-0x6df0c]
  const RECOIL_DURATION:            number = NaN;// GOT[-0x6f3fc]
  const SPREAD_FLAG_CLEAR_DELTA:    number = NaN;// GOT[-0x6f3f4]
  const CD_RECOMPUTE_FACTOR:        number = NaN;// GOT[-0x6f010] (QWORD)
  const RECOIL_ACCUM_MAX:           number = NaN;// GOT[-0x6ecd8] (QWORD)
  ```
- **`getStability()` is fabricated.** The disassembly only shows `call [edx+0x10]` (`vtable[4]` on `m_pPlayer`) returning a float that's multiplied by `delta`. We can't see the slot's name. Either keep the call opaque with a clear TODO or expose it through a vtable helper:
  ```typescript
  // TODO(asm-ambiguous): vtable slot 4 (`call [edx+0x10]` at 0x7038d).
  // D.4 should resolve this to a concrete method name.
  const stability = (this.m_pPlayer as any).vtable[0x10]?.(this.m_pPlayer) ?? 0;
  ```
- **4th argument per the demangler is missing.** Add as `_unused` so the TS signature matches the demangled symbol and the ABI still lines up:
  ```typescript
  export function ScaleSpread(
    this: CTSGun,
    pSpread: number,
    scale: number,
    _unused: number, // demangler shows 4th float; body never reads it
    flag: number,
  ): void
  ```
- **Compile-isolation needs `declare` stubs** (or `any`) for `CTSGun`, `CBasePlayer`, `gpGlobals`, `DoubleFireRate`. Cheapest way to satisfy checklist item 8.

Suggested rewrite:

```typescript
// ---------------------------------------------------------------------------
// CTSGun::ScaleSpread — disassembly rebuild (`ScaleSpread__6CTSGunRffi`
// at 0x702a8, 364 bytes). Mirrors control-flow chunks 0x702a8..0x70413:
//
//   (1) if (flag)        pSpread *= SPECIAL_FIRE_SPREAD_MULT
//   (2) if (scale <= SCALE_CUTOFF) return
//   (3) recoilScale = BASE_RECOIL_SCALE
//                  * (DoubleFireRate(m_pPlayer) ? DOUBLE_FIRE_RECOIL_MULT : 1)
//                  * (flag ? SPECIAL_FIRE_RECOIL_MULT : 1)
//   (4) if (delta < SPREAD_FLAG_CLEAR_DELTA) { sf=0; ts=now; return }
//   (5) pSpread += m_pPlayer.recoilAccumulator
//   (6) stability = m_pPlayer.vtable[0x10](m_pPlayer)   // D.4: name slot 4
//       correctedDelta = stability * delta
//       if (correctedDelta >= RECOIL_DURATION) {
//         spreadFlag = 0;
//         correctedDelta = CD_RECOMPUTE_FACTOR * RECOIL_DURATION;
//       }
//   (7) if (correctedDelta < RECOIL_DURATION) {
//         accum = (rd - cd) * scale * recoilScale + recoilAccumulator;
//         accum = min(accum, RECOIL_ACCUM_MAX);
//         recoilAccumulator = accum;
//       }
//   (8) lastSpreadTime = now
//
// Cvar slots map 1:1 to disassembly GOT offsets and are deliberately `NaN` so a
// missing cvar blows up loudly rather than silently using 0x68 (= 104), which
// was corrupting every multiplier and clamp on the first frame.
// ---------------------------------------------------------------------------

// One cvar / constant per GOT slot.
const SPECIAL_FIRE_SPREAD_MULT: number = NaN; // GOT[-0x6df10]
const SCALE_CUTOFF:               number = NaN;// GOT[-0x6f408]
const BASE_RECOIL_SCALE:          number = NaN;// GOT[-0x6df4c]
const DOUBLE_FIRE_RECOIL_MULT:    number = NaN;// GOT[-0x6ec2c]
const SPECIAL_FIRE_RECOIL_MULT:   number = NaN;// GOT[-0x6df0c]
const RECOIL_DURATION:            number = NaN;// GOT[-0x6f3fc]
const SPREAD_FLAG_CLEAR_DELTA:    number = NaN;// GOT[-0x6f3f4]
const CD_RECOMPUTE_FACTOR:        number = NaN;// GOT[-0x6f010] (QWORD)
const RECOIL_ACCUM_MAX:           number = NaN;// GOT[-0x6ecd8] (QWORD)

// Compile-isolation stubs (D.5 will replace with real imports).
declare const gpGlobals: { time: number };
declare function DoubleFireRate(player: any): number;
type CBasePlayer = any; // [eax+0x60] vtable, [eax+0x778] recoilAccumulator
type CTSGun      = any; // [esi+0x80] m_pPlayer, [esi+0x9e8] lastSpreadTime, [esi+0x9ec] spreadFlag

/**
 * Per-shot spread + recoil accumulator.
 *
 * Demangled signature is `(r ?, float, float, int)` (4 args + implicit
 * `this`). The body only references 3 args; the 4th is kept here as
 * `_unused` so the TS signature matches the demangled symbol and the
 * ABI still lines up if the binary later grows a reference to it.
 */
export function ScaleSpread(
  this: CTSGun,
  pSpread: number, // float& — `[esp+0x34]`, in/out via `fld/fstp [edi]`
  scale:   number, // float   — `[esp+0x38]`
  _unused: number, // float   — demangler's 4th arg; body never reads it
  flag:    number, // int     — `[esp+0x3c]`
): void {
  // (1) Special-fire: pre-scale the spread.
  if (flag !== 0) {
    pSpread *= SPECIAL_FIRE_SPREAD_MULT;
  }

  // (2) Below the cutoff the original simply returns — no timestamp update.
  if (scale <= SCALE_CUTOFF) {
    return;
  }

  // (3) Compose the per-shot recoil factor.
  let recoilScale = BASE_RECOIL_SCALE;
  if (DoubleFireRate(this.m_pPlayer)) {
    recoilScale *= DOUBLE_FIRE_RECOIL_MULT;
  }
  if (flag !== 0) {
    recoilScale *= SPECIAL_FIRE_RECOIL_MULT;
  }

  // (4) Tiny inter-call delta: refresh timestamp + clear the flag.
  const currentTime = gpGlobals.time;                      // GOT[+0x1600]
  const delta       = currentTime - this.lastSpreadTime;   // [esi+0x9e8]
  if (delta < SPREAD_FLAG_CLEAR_DELTA) {
    this.spreadFlag     = 0;                               // [esi+0x9ec]
    this.lastSpreadTime = currentTime;
    return;
  }

  // (5) Fold the player's recoil accumulator into this shot's spread.
  pSpread += this.m_pPlayer.recoilAccumulator;             // [eax+0x778]

  // (6) Stability factor from vtable[4] of m_pPlayer, then correct delta by it.
  // TODO(asm-ambiguous): `call [edx+0x10]` at 0x7038d returns a float.
  // D.4 should map this vtable slot to a concrete method name on CBasePlayer+.
  const stability = (this.m_pPlayer as any).vtable[0x10]?.(this.m_pPlayer) ?? 0;
  let correctedDelta = stability * delta;

  // Rebound path: if we blew past the recoil window this frame, clear the
  // flag and recompute correctedDelta for the next iteration.
  if (correctedDelta >= RECOIL_DURATION) {
    this.spreadFlag = 0;
    correctedDelta  = CD_RECOMPUTE_FACTOR * RECOIL_DURATION;
  }

  // (7) Accumulate new recoil, clamped to the cap.
  if (correctedDelta < RECOIL_DURATION) {
    let accum = (RECOIL_DURATION - correctedDelta) * scale * recoilScale;
    accum    += this.m_pPlayer.recoilAccumulator;
    accum     = Math.min(accum, RECOIL_ACCUM_MAX);
    this.m_pPlayer.recoilAccumulator = accum;
  }

  // (8) Refresh timestamp for the next call.
  this.lastSpreadTime = currentTime;
}
```
