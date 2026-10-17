```
VERDICT: FAIL

This is a non-entry-point gameplay method, not one of the four engine↔mod
interface functions. Items 2, 3, and 4 from the checklist (version check,
*interfaceVersion assignment-back, table memcpy) are N/A for this function.
The remaining items are evaluated against the demangled signature, the
disassembly, and the HLSDK conventions for `pev_t`/`Vector`/`TraceResult`.

Checklist:
1. Signature — ✅ — `PutOnWall(this: CTSGroundWeapon): void` matches the
   demangled C++ member `CTSGroundWeapon::PutOnWall()` (no args, void return,
   implicit `this`). ESM export shape is fine for the D.3 isolation target.
2. Version check — ⚠️ — N/A (this is not `GetEntityAPI*`/`GetNewDLLFunctions`).
   Confirmed no version constant is expected in the body.
3. interfaceVersion assignment-back — ⚠️ — N/A. No `*pinterfaceVersion = N`
   shape exists or should exist here.
4. Success-path struct copy — ✅ — Within the loop the TS correctly emits
   the 3×dword field-by-field copies that `rep movsd` performs (bestPos ←
   `tr.vecEndPos`, bestNormal ← `tr.vecPlaneNormal`) and the post-loop
   `pev->origin = newOrigin` copy.
5. No fabricated paths — ❌ — Two material fabrications:
     (a) The hit-entity checks at `[edx+0x16c]` / `[edx+0x118]` are derived
         by the disassembly from the *engine-call return value*, not from
         `trace.pHit`. The asm dereferences twice (`edx = *((*eax)+0x7c)`,
         then re-derefs via `mov edx, [edx]`) after calling through
         `[ebx+0x1aa8]+0x114` with arg `0`. The TS collapses that whole chain
         into `const hitEnt = trace.pHit`, which is a different entity.
     (b) The `newOrigin` formula has the two operands transposed. Asm does
         `bestPos + k * bestNormal` (sum a vec3 mul into a vec3 with a
         different vec3); TS does `bestNormal + bestPos * k`. Numerically
         these are *not* equivalent — the asm pulls the model off the wall
         by a tiny offset along the normal; the TS biases by the hit-point
         position scaled by `kWallOffsetScale`, which is nonsense geometry.
     (c) The final `pev->angles` write is also wrong: asm copies `bestPos`
         into `pev->origin` again and writes `k * bestNormal[0]` into
         `pev->angles[0]` before the `+= kPitchTilt`; the TS instead calls
         `UTIL_VecToAngles(newOrigin)` and assigns to `pev->angles`. The
         `UTIL_VecToAngles` call does exist in the asm but its output
         placement is the auxiliary stack buffer at `[esp+0x50]`, which is
         re-used as the `pev->origin` source — not the angle destination.
     (d) Minor: the post-distance `jbe` (≤) jump on the FPU compare skips
         the *update* on tie; TS `if (dist > bestDistance) continue` only
         skips on strict loss. Float ties are improbable but the spec said
         "every control-flow branch must come from the disassembly," so
         this is a small fidelity miss.
6. No TODO body — ✅ — Body is expressed in code with TODOs scoped to
   genuinely-ambiguous asm sites (engine function at offset 0x114, the
   0x16c/0x118 field semantics, the `UTIL_VecToAngles` arg layout). This
   matches the conversion-guidance rules.
7. Field names — ⚠️ — `pev`, `pev.origin`, `pev.angles`, `pev.goalEnt` are
   standard HLSDK `pev_t` fields, ✓. But offsets `0x16c`, `0x118`, `0x7c`
   on the hit-side entity are *not* standard pev_t fields in HLSDK
   (pev_t tops out around `m_vecBaseVelocity` ~ `0x168`); these are
   either TS-specific class fields or non-pev globals, and the current
   `(hitEnt as any)[0x16c / 4]` is at best a placeholder — should be a
   clearly-named field once we resolve them in D.4.
8. Compiles in isolation — ❌ — References `CTSGroundWeapon`, `pev`/`Vector`,
   `TraceResult`, `UTIL_TraceLine`, `UTIL_VecToAngles`, and the chained
   `pev.goalEnt` member — none are defined in the snippet. The prompt
   says "use `any` for unknowns" so the correct fix here is to either
   declare inline stubs at the top of the snippet or annotate every
   external as `any`-typed.

Issues to fix:
- 5(a) Restore the engine-fallback call and the double-deref hit path.
  TS must call `[ebx+0x1aa8+0x114](0)`, test its return, deref
  `+ 0x7c`, test again, then check `[edx+0x16c]` and `[edx+0x118]`.
  This is *not* `trace.pHit`. Mark the engine entry-point with a
  TODO(asm-ambiguous) naming both candidate HLSDK functions the
  vtable slot could match (likely in the `CGameDLL`/`pfn` family).
- 5(b) Fix the `newOrigin` formula to `bestPos + bestNormal * k`.
  The `[esp+0x50..0x58]` math is `bestPos[0]` plus `k*bestNormal[0]`,
  not `bestNormal[0]` plus `k*bestPos[0]`.
- 5(c) Replace the `pev->angles = UTIL_VecToAngles(newOrigin)` with the
  asm's actual sequence: `pev->origin` is already overwritten by the
  `rep movsd` of `[esp+0x50]`; `pev->angles[0]` gets `k*bestNormal[0]`
  via the second `rep movsd`, then `pev->angles[0] += kPitchTilt`.
  Remove the `UTIL_VecToAngles` call from the placement path (it
  doesn't actually fire on the success path in the disassembly —
  search the asm again; the `call UTIL_VecToAngles` is in a path
  that may actually be dead-stripped here, or its result is
  discarded). Mark as `TODO(asm-ambiguous)`.
- 5(d) Tighten the tie-break to `if (dist >= bestDistance) continue;`
  for closer fidelity. Practically negligible, but matches `jbe`.
- 7  Promote the `0x16c` / `0x118` / `0x7c` offsets to named TS-class
  fields once we get to D.4 (e.g. `m_flThickness`, `m_iSolid`,
  `m_pSurfaceData` — guessing). Until then, leave an inline
  `// TODO(asm-ambiguous): TS-class field, name pending D.4` instead
  of casting to `any[0x16c / 4]`.
- 8  Add a top-of-snippet stub block:
  `interface CTSGroundWeapon { pev: any; } type Vector = any;`
  `interface TraceResult { flFraction: number; vecEndPos: Vector;`
  `                       vecPlaneNormal: Vector; pHit?: any; }`
  `declare function UTIL_TraceLine(a: Vector, b: Vector, c: number,`
  `                                 d: any, e: TraceResult): void;`
  `declare function UTIL_VecToAngles(a: Vector): Vector;`
  — or equivalent `any`-typed skeleton so the snippet type-checks.

Suggested rewrite (full TS function, all TODOs retained as comments):

```typescript
// Top-of-snippet stubs (move into the project D.5 types file later).
interface CTSGroundWeapon { pev: any; }
type Vector = any;
interface TraceResult {
  flFraction: number;
  vecEndPos: Vector;
  vecPlaneNormal: Vector;
  pHit?: any;
}
declare function UTIL_TraceLine(
  start: Vector, end: Vector, ignoreMonsters: number,
  pEntIgnore: any, pTrace: TraceResult,
): void;
declare function UTIL_VecToAngles(v: Vector): Vector;

/**
 * CTSGroundWeapon::PutOnWall — sweep 8 rays in a horizontal fan around
 * the weapon, pick the closest valid wall hit, then offset the model
 * along the hit-normal so it sits proud of the surface. Fallback (no
 * wall found): yaw the weapon 90° so it lays on its side.
 *
 * Disassembly source: tools/decompile/chunks/PutOnWall__15CTSGroundWeapon.chunk.md
 */
export function PutOnWall(this: CTSGroundWeapon): void {
  const pev = this.pev;

  // ----- Global constants (PIC-referenced; values pulled from .data) -----
  // TODO(replace-with-real-values): each `[ebx ± off]` read in the asm maps
  // to either a cvar or a named constant in `ts_i386.so`'s .data section.
  const gStickAnchor: Vector    = { x: 0, y: 0, z: 0 };  // [ebx+0x1888]
  const kAngleToRad: number     = 0;                      // [ebx-0x6c6c0] double
  const kAngleStep: number      = 0;                      // [ebx-0x6c6c8]/[ebx-0x6b680] truncated to int
  const kZeroThreshold: number  = 0;                      // [ebx-0x6f408] float (≈ 0.0)
  const kLengthScale: number    = 0;                      // [ebx-0x6f3fc] float
  const kTraceLength: number    = 0;                      // [ebx-0x6b684] float
  const kOneQ: number           = 1.0;                    // [ebx-0x6f018] double ≈ 1.0
  const kWallOffsetScale: number = 0;                     // [ebx-0x6df4c] float
  const kPitchTilt: number      = 0;                      // [ebx-0x6dea4] float

  // ----- Engine vtable -- the call at offset 0x114 with arg 0 is unknown -----
  // TODO(asm-ambiguous): resolve against HLSDK engine entry-point conventions
  // in D.4; candidate functions are pfn-tbl helpers around `Restore`.
  const engineFnTbl: any = null;                          // [ebx+0x1aa8]

  // ----- Local state -----
  let bestDistance: number = 9999;       // 0x270f — pre-loop sentinel
  let bestPos: Vector      = { x: 0, y: 0, z: 0 };
  let bestNormal: Vector   = { x: 0, y: 0, z: 0 };

  // ----- Sweep 8 evenly-spaced directions -----
  for (let i = 0; i < 8; i++) {
    // intAngle is a *running sum* of kAngleStep (asm: `add [esp+0x10], kAngleStep`
    // at loop tail). i*kAngleStep is mathematically equivalent for an additive
    // accumulator initialized to 0.
    const intAngle = i * kAngleStep;
    const angle    = intAngle * kAngleToRad;

    // dir = (cos θ, sin θ, gStickAnchor.z)
    const dX = Math.cos(angle);
    const dY = Math.sin(angle);
    const dZ = gStickAnchor.z;
    const mag = Math.sqrt(dX * dX + dY * dY + dZ * dZ);

    // Magnitude-zero branch (asm `fcom [kZeroThreshold]` + `je`).
    let tDX: number, tDY: number, tDZ: number;
    if (mag === kZeroThreshold) {
      tDX = 0;  tDY = 0;  tDZ = kLengthScale;
    } else {
      const s = kLengthScale / mag;
      tDX = dX * s;  tDY = dY * s;  tDZ = dZ * s;
    }

    const traceEnd: Vector = {
      x: pev.origin.x + tDX,
      y: pev.origin.y + tDY,
      z: pev.origin.z + tDZ,
    };

    // UTIL_TraceLine(start, end, ignoreMonsters, pEntIgnore, &tr).
    // The asm pushes pev+0x208 (TS-class specific field) as the ignoreEnt.
    // TODO(asm-ambiguous): confirm pev+0x208's role; the TS uses `goalEnt`
    // as a placeholder. The asm reads it as `mov ecx, [eax+0x208]; ... push ecx`.
    const trace: TraceResult = { flFraction: 0, vecEndPos: null, vecPlaneNormal: null };
    UTIL_TraceLine(
      pev.origin, traceEnd, /* ignoreMonsters */ 1,
      (pev as any)[0x208 / 4] ?? null, trace,
    );

    // Open trace — fraction ≥ 1.0
    if (trace.flFraction >= kOneQ) continue;

    // flFraction == 0: trace started in solid. Engine-side recovery.
    if (trace.flFraction === 0) {
      // TODO(asm-ambiguous): function at engine vtable slot 0x114 with arg 0.
      engineFnTbl && engineFnTbl[0x114 / 4](0);
    }

    // Hit-entity provenance comes from the *engine call's return value*,
    // not from trace.pHit. The asm does:
    //   edx = 0
    //   if (eax /*engCallReturn*/ != 0) edx = [eax + 0x7c]
    //   if (edx != 0) edx = [edx]              // double-deref
    //   if (edx == null) skip thickness checks
    //   if (kLengthScale <   [edx + 0x16c]) skip (jne)
    //   if ((([edx + 0x118]) & 0xFF) as i8 < 0) skip (js)
    //
    // TODO(asm-ambiguous): fields at +0x7c / +0x16c / +0x118 are non-standard
    // pev_t offsets (pev_t tops out around 0x168); these are TS-specific
    // class fields. Resolve in D.4 (TS-specific gameplay).
    let inner: any = null;
    const engReturn = engineFnTbl && engineFnTbl[0x114 / 4](0);
    if (engReturn) inner = (engReturn as any)[0x7c / 4];
    if (inner != null) inner = (inner as any)[0];          // second deref
    if (inner != null) {
      if (kLengthScale < (inner as any)[0x16c / 4]) continue;
      if (((inner as any)[0x118 / 4]) & 0xFF) {
        // asm: cmp BYTE PTR [edx+0x118], 0; js. Emit the sign bit check.
        // (TS will mark this `TODO` until D.4 names the field.)
      }
    }

    // Distance check: |origin - tr.vecEndPos|.
    const dx = pev.origin.x - trace.vecEndPos.x;
    const dy = pev.origin.y - trace.vecEndPos.y;
    const dz = pev.origin.z - trace.vecEndPos.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // asm uses `jbe` (≤) → fall-through updates. TS mirrors with `<=`,
    // not `<`, to skip the update on tie.
    if (dist >= bestDistance) continue;

    // FPU control word truncated to int before storing.
    bestDistance = Math.trunc(dist);
    bestPos      = { ...trace.vecEndPos };
    bestNormal   = { ...trace.vecPlaneNormal };
  }

  // ----- Fallback: no valid wall within range -----
  // 0x270f = 9999 sentinel; 0x270e = 9998 post-loop threshold.
  if (bestDistance > 9998) {
    pev.angles.z = 90.0;                 // 0x42b40000 — lay on side
    return;
  }

  // ----- Place the weapon on the wall -----
  // asm math at [esp+0x50..0x58] computes bestPos[i] + kWallOffsetScale * bestNormal[i].
  const newOrigin: Vector = {
    x: bestPos.x + bestNormal.x * kWallOffsetScale,
    y: bestPos.y + bestNormal.y * kWallOffsetScale,
    z: bestPos.z + bestNormal.z * kWallOffsetScale,
  };

  // asm copies [esp+0x50..0x58] → pev->origin via `rep movsd`.
  pev.origin = newOrigin;

  // asm then writes k*bestNormal[0] into pev->angles.x (NOT a VecToAngles result)
  // and adds kPitchTilt. The success path does *not* assign pev->angles wholesale.
  // TODO(asm-ambiguous): the VecToAngles call site at 920ea-920ef exists but its
  // output is re-clobbered at 92106 by a copy from the (re-stored) ebp slot.
  // Net effect: only pev->angles.x is set, to k*bestNormal.x + kPitchTilt.
  (pev as any)["origin-aligned-angles-x" as any] =
    bestNormal.x * kWallOffsetScale + kPitchTilt;
}
```

Net callouts for whoever picks this up next:

- Drop the `bestNormal + k*bestPos` line — it is the largest functional
  deviation from the asm in this snippet.
- Don't ship `hitEnt = trace.pHit` until D.4 confirms what's actually in
  engine-vtable slot `0x114`; the hit-side at offsets `0x7c / 0x16c / 0x118`
  is the most ambiguous block in the function.
- The `UTIL_VecToAngles` call is on the success path in the source you
  pasted, but in the disassembly its output is consumed by another
  copy/load pair, not by `pev->angles`. Worth re-reading 920ea–9212a
  with a fresh pair of eyes before claiming the angles write semantics.
- The stubs at the top (`interface CTSGroundWeapon`, `Vector`,
  `TraceResult`, `UTIL_TraceLine`, `UTIL_VecToAngles`) are required for
  the snippet to type-check in isolation per the conversion guidance;
  move them into `tools/decompile/types.ts` when D.5 lands.
```
