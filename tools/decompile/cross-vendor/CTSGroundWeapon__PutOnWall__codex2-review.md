The shell is returning empty chunks on every command in this sandbox — I can't pull `HANDOFF.md`, `SPEC.md`, or the decompile chunks to ground the review in the project's current state. The review below is based entirely on the three artifacts you pasted inline (HLSDK reference, disassembly, decompiled TS). I'm proceeding on that basis and **not** making any commits or hand-off edits because of the read-only sandbox and the AGENTS.md "update before commit" rule.

A second thing up front: **the checklist you pasted is the engine↔mod interface review template** (`GiveFnptrsToDll` / `GetEntityAPI*` / `GetNewDLLFunctions`). The artifact is `CTSGroundWeapon::PutOnWall()`. Items 1, 2, 3, 4, 7 do not apply. I'm answering them as "N/A" and applying the *spirit* of the checklist (signature, no fabricated paths, no TODO-only body, field names, isolation) to what's actually a GoldSrc entity-method review.

---

```
VERDICT: PASS-WITH-NOTES

Checklist (re-mapped to a PutOnWall-shaped function):

1. Signature — ✅ — demangled name `CTSGroundWeapon::PutOnWall()`
   matches the symbol exactly; `void` return matches the asm
   ending in plain `ret`; zero explicit args matches the asm
   reading `this` from `[esp+0x120]`. The TS "explicit this"
   signature is idiomatic TS for a member function port.

2. Version check — N/A — this is not an interface-entry function.

3. interfaceVersion assignment-back — N/A — not applicable.

4. Success-path struct copy — ✅ — three `rep movsd (ecx=3)`
   sites in the asm (sweep-anchor refresh at 91e54, copy
   tr.vecEndPos into bestPos at 92004, copy tr.vecPlaneNormal
   into bestNormal at 9201c, copy newOrigin into pev->origin
   at 920da, copy UTIL_VecToAngles result into pev->angles at
   920f9/92104/92116) are all represented as either TS spread
   copies (`{ ...trace.vecEndPos }`) or direct field assignment.
   The data flow is preserved.

5. No fabricated code paths — ⚠️ — most paths line up, but:
   - The "bestDistance" path is *not* the same. The asm
     truncates bestDistance to int via `fistp [esp+0x4c]` after
     each accepted update (with FPU control word set to round-
     down first); the TS keeps full precision `dist`. This
     changes behavior near fractional boundaries and at the
     post-loop threshold.
   - The hit-entity "thickness" cmp at 91f3a-91f45 uses the
     standard `fnstsw ax; test ah,0x40; jne target` idiom. The
     TS reads it as a strict `<` ("skip if kLengthScale <
     hitEnt[0x16c]"). Whether that maps to "equal" or "less"
     depends on the FPU flag → ah mapping at offset 0x40; the
     TS doesn't show its work. The branch is *plausible*, not
     *verified*.
   - The flFraction==0 engine-call recovery at 91f0e-91f1f is
     stubbed out with comments; the TS acknowledges this with
     a TODO but the function is incomplete without it.

6. No TODO-only body — ⚠️ — body is in code, not comments.
   TODO markers exist for unnamed globals and unknown engine
   indices, which the conversion guidance explicitly permits
   (`// TODO(asm-ambiguous):`). Not a fail, but eight TODO
   markers is a lot for one PR.

7. Field names — ⚠️ — confident mappings:
   - `pev.origin`, `pev.angles` ✓
   - `pev.angles.z` at fallback matches asm `pev[0x58]` ✓
   - `pev.angles.x` adjustment matches asm `pev[0x50]` ✓
   - `pev.goalentity` candidate (offset 0x208 in pev, used as
     the UTIL_TraceLine ignore-entity arg) is correct
     semantically ✓
   - `trace.flFraction`, `trace.vecEndPos`, `trace.vecPlaneNormal`
     match HLSDK's TraceResult ✓
   - The hit-entity fields at offsets 0x16c and 0x118 — the
     asm dereferences edx→[edx+0x7c]→[0x16c/0x118]. TS labels
     these "thickness" / "pev->solid" but neither matches a
     documented HLSDK edict_t/pev offset (pev->solid is much
     lower than 0x118). Either this is a TS-specific class
     field on a CBaseEntity-derived type, or the indirection
     is interpreted wrong. The TS's guesses should be TODO
     until D.4 cross-references the real type.
   - Global/cvar names — all marked TODO; appropriate, since
     strings-n5.txt wasn't pulled.

8. Compiles in isolation — ❌ strict, ⚠️ if hand-waved —
   depends on `Vector`, `CTSGroundWeapon`, `pev` (an
   `entvars_t`-like), `TraceResult`, `UTIL_TraceLine`,
   `UTIL_VecToAngles`, and an internal `engineFnTbl`. None
   defined in this snippet. The conversion guidance allows
   this ("output should compile in isolation (no external
   type references we don't define here)" — note that
   guidance is *strict* in saying "no external types"), so
   strict-isolation is a fail; lenient-isolation (declaring
   the others as needed) is fine.

Other issues worth flagging (call them out regardless of the verdict):

- bestDistance truncation: asm switches FPU cw to round-down
  (0xc) just for the fistp and restores it after. TS does
  not. The post-loop compare against 0x270e (9998) operates
  on the truncated integer, not on a float. The TS's `> 9998`
  check is on `bestDistance` as a float; if a fractional dist
  truncates to 9998 the asm places the weapon, the TS falls
  back. Match the asm or note the divergence.

- Post-loop cmp direction: at 92042 `cmp [esp+0x4c], 0x270e;
  jg 92134` (no-fallback) vs (bestDistance > 9998, fallback).
  TS is consistent with this. ✓

- The "constant magnitude" observation: TS computes `mag`
  per-iteration. The asm *also* does, but the result is
  always sqrt(1 + anchor.z²), constant across the loop.
  Computing it 8 times is harmless; flagging in case the
  hoisting is wanted later.

- The flFraction==0 path's engine call is a real control-flow
  branch in the asm. The TS comments it out. If the goal is
  "produce compilable, runnable TypeScript for D.3", this is
  a hole. If the goal is "decompile the shape with TODO
  markers for unknowns", it's fine — but the TS should say so.

- The "exact equality" zero-check on the FPU magnitude is
  semantically suspect: `sqrt(1 + anchor.z²)` is ≥ 1 for any
  real anchor.z, so the `je 91e18` (skip normalization) /
  fall-through (degenerate path) never actually fires under
  normal data. This branch is effectively dead. The TS
  preserves it but doesn't note the deadness. Worth a
  one-line comment.

- Cvar/global names ([ebx+0x1888], [ebx-0x6c6c0], etc.)
  need cross-reference against `strings-n5.txt` and the
  disassembled `.data` of ts_i386.so. That's D.3 / D.4 work,
  not blocking for this review but is a TODO backlog.
```

---

## Issues to fix

1. **`bestDistance` truncation** — match the asm's int-truncation. Either store `(dist | 0)` (TS float-to-int) or document that the TS intentionally keeps full precision. The post-loop threshold check *must* mirror the asm's `cmp [esp+0x4c], 0x270e` on the int field.

2. **`hitEnt` field labels** — drop the "thickness" and "pev->solid" guesses; leave both as `(hitEnt as any)[0x16c / 4] ?? 0` with `// TODO(asm-ambiguous)` until D.4 cross-references `strings-n*.txt` and the CBaseEntity-derived class layouts.

3. **Engine-call recovery branch** — either implement it (`engineFnTbl[0x114 / 4](0)`) or hoist the comparison so it's reachable. A commented-out call inside an `if` looks like a code path on the first pass; either delete the `if` or replace with a TODO function call that throws.

4. **`// TODO(asm-ambiguous)` on `mag === kZeroThreshold`** — note that this branch is provably dead for any real `anchor.z`, so it can be removed in a future pass when we trust TS-side inputs.

5. **Reuse `mag` outside the loop** — `mag` is loop-invariant; compute it once before the loop. Cosmetic.

6. **`kOneQ = 1.0`** — the asm compares `flFraction` (float) against `[ebx-0x6f018]` (double). 1.0 == 1.0 across both precisions, but if `[ebx-0x6f018]` isn't actually 1.0 (we don't know — it's a `[ebx - offset]`), the placeholder is misleading. Mark as `// TODO(asm-ambiguous): constant value pending cvar-name resolution`.

---

## Suggested rewrite (full TS function)

```typescript
/**
 * CTSGroundWeapon::PutOnWall — sweep 8 evenly-spaced rays in a
 * horizontal fan around the weapon, then snap the weapon to the
 * nearest valid wall (offset slightly along the surface normal so
 * the model sits proud of the surface). If no wall is found, lay
 * the weapon on its side (angles.z = 90°).
 *
 * Notes:
 * - All `kXxx` constants are unnamed globals pulled from PIC-referenced
 *   `[ebx ± offset]` slots. Their final values and cvars are TODO(D.4)
 *   pending cross-reference with tools/decompile/analysis/strings-n5.txt
 *   and the .data section of ts_i386.so. Values below are placeholders.
 * - The "mag ≈ 0" branch never fires for real anchor.z (since
 *   mag = sqrt(1 + anchor.z²) ≥ 1) and is preserved for spec parity.
 * - The hit-entity thickness/solid checks at offsets 0x16c and 0x118
 *   are TODO(D.4) — neither matches a documented HLSDK pev field, so
 *   these are likely sub-fields of a TS-specific CBaseEntity.
 * - The flFraction == 0 engine-function-pointer call is TODO(D.4);
 *   see asm at 91f0e-91f1f.
 */

import {
  Vector,
  TraceResult,
  UTIL_TraceLine,
  UTIL_VecToAngles,
} from './engine-bindings'; // TBD by D.5

type EngFnTbl = Record<number, (...args: any[]) => any>;

export function PutOnWall(this: CTSGroundWeapon): void {
  const pev = this.pev;

  // ===== Engine globals / constants =====
  const gStickAnchor: Vector    = /* TODO(D.4) [ebx+0x1888] deref */ { x: 0, y: 0, z: 0 };
  const kAngleToRad: number     = /* TODO(D.4) [ebx-0x6c6c0] double */ 0;
  const kAngleStep: number      = /* TODO(D.4) (int)([ebx-0x6c6c8] / [ebx-0x6b680]) */ 0;
  const kZeroThreshold: number  = /* TODO(D.4) [ebx-0x6f408] float */ 0;
  const kLengthScale: number    = /* TODO(D.4) [ebx-0x6f3fc] float */ 1;
  const kFractionOne: number    = /* TODO(D.4) [ebx-0x6f018] double */ 1.0;
  const kWallOffsetScale: number = /* TODO(D.4) [ebx-0x6df4c] float */ 0;
  const kPitchTilt: number      = /* TODO(D.4) [ebx-0x6dea4] float */ 0;
  const kInitialBest: number    = 9999;          // asm: 0x270f
  const kFallbackThreshold: number = 9998;      // asm: 0x270e

  // ===== Engine function-table (for flFraction == 0 recovery) =====
  // TODO(D.4): what is [ebx+0x1aa8]? Likely eng->pfn[0x114/4] of some
  // engine-side function table. The asm calls it with arg 0 when the
  // trace's flFraction == 0 (started-in-solid).
  const engineFnTbl: EngFnTbl | null = /* TODO(D.4) [ebx+0x1aa8] */ null;

  // ===== Pre-loop invariant =====
  // dir = (cos θ, sin θ, anchor.z) has magnitude sqrt(1 + anchor.z²),
  // constant for all θ. Compute once.
  const sweepMag = Math.sqrt(1 + gStickAnchor.z * gStickAnchor.z);

  // ===== Local state =====
  // Asm stores bestDistance as int via `fistp` in truncate mode. Mirror
  // that by keeping it as an int here so the post-loop threshold check
  // matches the binary exactly.
  let bestDistance: number = kInitialBest;
  let bestPos: Vector = { x: 0, y: 0, z: 0 };
  let bestNormal: Vector = { x: 0, y: 0, z: 0 };

  const tr = new TraceResult();

  for (let i = 0; i < 8; i++) {
    const angle = (i * kAngleStep) * kAngleToRad;

    const dX = Math.cos(angle);
    const dY = Math.sin(angle);
    const dZ = gStickAnchor.z;

    // Normalize-and-scale, or fall back to a purely-Z probe when mag == 0
    // (this branch is provably dead for real anchor.z; kept for spec parity).
    let tDX: number, tDY: number, tDZ: number;
    if (sweepMag === kZeroThreshold) {
      tDX = 0;
      tDY = 0;
      tDZ = kLengthScale;
    } else {
      const s = kLengthScale / sweepMag;
      tDX = dX * s;
      tDY = dY * s;
      tDZ = dZ * s;
    }

    const traceEnd: Vector = {
      x: pev.origin.x + tDX,
      y: pev.origin.y + tDY,
      z: pev.origin.z + tDZ,
    };

    // UTIL_TraceLine(start, end, ignoreMonsters, goalEnt, pTrace)
    UTIL_TraceLine(pev.origin, traceEnd, /* ignoreMonsters */ 1, pev.goalentity ?? null, tr);

    // Open trace — no wall in this direction, try the next.
    if (tr.flFraction >= kFractionOne) continue;

    // Trace started in solid. The asm invokes an engine-side recovery
    // function pointer at [ebx+0x1aa8][0x114/4](0) and uses its return
    // value + a follow-up dereference to inspect the hit entity. Until
    // D.4 identifies that engine entry, this branch is unimplemented.
    // TODO(D.4): resolve engineFnTbl[0x114 / 4] and the eax→[eax+0x7c]
    // deref into hitEnt equivalents below.
    let hitEnt: any = null;
    if (tr.flFraction === 0 && engineFnTbl) {
      const recovery = engineFnTbl[0x114 / 4](0);
      // asm: if (eax != 0) hitEnt = eax->[0x7c]
      hitEnt = recovery ? (recovery as any)[0x7c / 4] : null;
    }
    if (hitEnt === null) hitEnt = tr.pHit; // if no engine call or it returned null, fall back

    if (hitEnt !== null) {
      // TODO(D.4): 0x16c and 0x118 are *not* standard HLSDK pev offsets;
      // they're probably TS-specific CBaseEntity sub-fields.
      const thickness = (hitEnt as any)[0x16c / 4];
      if (kLengthScale < thickness) continue;             // too-thick surface, skip
      const solid = (hitEnt as any)[0x118 / 4] | 0;
      if (solid < 0) continue;                            // solid < 0 → reject
    }

    const dx = pev.origin.x - tr.vecEndPos.x;
    const dy = pev.origin.y - tr.vecEndPos.y;
    const dz = pev.origin.z - tr.vecEndPos.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Closest-hit bookkeeping. Asm: `jbe` skips the update when
    // bestDistance ≤ dist; fall-through (update) when bestDistance > dist.
    if (dist > bestDistance) continue;

    // The asm does `fistp [esp+0x4c]` here with FPU cw set to truncate
    // (round-down). Mirror that by storing the int-truncated value.
    bestDistance = dist < 0 ? Math.ceil(dist) : Math.floor(dist);
    bestPos = { x: tr.vecEndPos.x, y: tr.vecEndPos.y, z: tr.vecEndPos.z };
    bestNormal = { x: tr.vecPlaneNormal.x, y: tr.vecPlaneNormal.y, z: tr.vecPlaneNormal.z };
  }

  // ===== No valid wall within range — lay the weapon on its side. =====
  if (bestDistance > kFallbackThreshold) {
    pev.angles.z = 90.0;            // asm: 0x42b40000 → pev[0x58]
    return;
  }

  // ===== Place the weapon on the wall =====
  // newOrigin = bestNormal + bestPos * kWallOffsetScale
  const newOrigin: Vector = {
    x: bestNormal.x + bestPos.x * kWallOffsetScale,
    y: bestNormal.y + bestPos.y * kWallOffsetScale,
    z: bestNormal.z + bestPos.z * kWallOffsetScale,
  };
  pev.origin = newOrigin;

  // asm: push &newOrigin; call UTIL_VecToAngles; copy 12 bytes to pev->angles
  const anglesOut: Vector = UTIL_VecToAngles(newOrigin);
  pev.angles.x = anglesOut.x;
  pev.angles.y = anglesOut.y;
  pev.angles.z = anglesOut.z;

  // asm: pev[0x50] += [ebx-0x6dea4]
  pev.angles.x += kPitchTilt;
}
```

---

## What I would do next (suggested, not executed)

Per AGENTS.md I am *not* going to write this anywhere or commit — the sandbox is read-only and the next step belongs to your normal work session. My recommendations for the work session that picks this up:

- Update `HANDOFF.md` with the verdict and the open TODOs (`bestDistance` truncation, `engineFnTbl[0x114/4]`, hit-entity offsets 0x16c/0x118, cvar name resolution). Mark this D.3 sub-task done pending the four TODO blocks.
- Update `SPEC.md` only if the design changes (no design change implied here).
- Run the appropriate tier-2 smoke if any was registered for decompile output (I couldn't read `tools/smokes/` from the broken shell).
- Don't merge the TS into anything that compiles/bundles yet — D.5 is where `Vector`, `entvars_t`, `UTIL_TraceLine`, `UTIL_VecToAngles` get wired up.
- Send the four TODO blocks to D.4 as concrete investigations rather than leaving them inline.
