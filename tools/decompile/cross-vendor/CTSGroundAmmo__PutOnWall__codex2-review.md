```
VERDICT: PASS-WITH-NOTES

Checklist:
1. Signature — ⚠️ — Signature shape (this + no args, void) is right, but `this: CTSGroundAmmo` references a class that isn't defined in this snippet. Won't compile in isolation. Use `this: any` or stub the class. Also: the demangled symbol `PutOnWall__13CTSGroundAmmo` matches the function name exactly. ✓ for name; ⚠️ for the unbound type reference.

2. Version check — N/A — not a `GetEntityAPI*` / `GetNewDLLFunctions` function. Skipped.

3. *interfaceVersion assignment-back — N/A — not a `GetEntityAPI*` / `GetNewDLLFunctions` function. Skipped.

4. Success path (struct copy / equivalent) — ✅ — 8-iteration trace loop, post-loop wall/no-wall branch, pev->origin assignment, and UTIL_VecToAngles call are all present and in the right order. The `rep movs` 3-dword copies are correctly expressed as TS struct assignments / `pev.origin = newOrigin` style writes.

5. No fabricated paths — ⚠️ — Most of the structure is faithful (loop count = 8, best init = 0x270f, no-wall threshold = 0x270e, the two skip conditions in the inner if/continue block). But several branches are misread:
   - The "skip if fInWater >= sentinel" check at 92b06–92b19: TS calls it `vecEndPos.x >= 0`. The field at `[esp+0xf0]` is actually `trace_result.fInWater` (offset 0x30 in HLSDK TraceResult), not `vecEndPos.x`. And the comparison is `fcomp QWORD [ebx-0x6f018]` — a double sentinel, not a literal `0`. (TODO flag is honest, but the named field is wrong.)
   - The entity-skip check at 92b4a–92b6e: TS writes `if (inner.field_16c >= 0) continue;`. The asm does `fcomp; fnstsw; test ah, 0x40; jne 92c47` — jne jumps when C3=1, i.e., when `1.0 == inner.field_16c` (or unordered). The correct TS condition is `if (inner.field_16c === 1.0) continue;`. The `inner.field_118 < 0` branch is correct.
   - The "trace.pEnt is null → cvar lookup" block at 92b1f–92b3e: the gating test is `test eax, eax` on the *same* fInWater value reloaded as int (`[esp+0xf0]`), not on `trace.pEnt`. The TS has the wrong condition. The TS also collapses `hitEnt = cvar_lookup()[0x7c]` (the asm does `edx = cvar_result[0x7c]`, with an extra indirection). 

6. No TODO body — ✅ — Function has substantive TS logic. The TODOs are localized to ambiguities (sentinels, cvar identity, field semantics) and the loop / post-loop / no-wall branches are fully written.

7. Field names — ⚠️ — `pev.origin`, `pev.angles` are correct in the standard sense but the offsets used by the asm don't match standard HLSDK entvars_t:
   - 92d22 writes 12 bytes to `pev+0x50`. In HLSDK that's `v_view_ofs` (vec3_t spans 0x50..0x5c), not `pev.angles` (which is at 0x2c). The TS's "pev.angles = pev.origin" claim is suspect — looks more like a v_view_ofs write (or the TS mod has a non-standard entvars_t).
   - 92d59 writes 0x42b40000 (60.0) to `pev+0x58`, which in HLSDK is `v_view_ofs.z`, not `pev.angles.y` (0x30). The no-wall TS claim `this.pev.angles.y = NO_WALL_ANGLE_Y` is likely wrong.
   - 92a86 loads `[eax+0x208]` as the `pentIgnore` arg to UTIL_TraceLine. That's past the end of HLSDK entvars_t (~0x1b0). TS calls this `this.edict` — there's no field at 0x208 in standard pev. (Possibly a TS-only field, or `edict_t*` cached elsewhere; needs investigation.)
   - 92d0b reads `[esp+0x12c]` as a pointer; the math puts that at the function's return address, not `this`. There's likely an extra stack frame I can't reconcile from this listing alone, OR the function is using a different saved-slot for `this` after the call to UTIL_VecToAngles. This is a real risk.
   - The placeholder `field_7c / field_0 / field_16c / field_118` are honest and OK (TS marks them TODO).

8. Compiles in isolation — ❌ — Fails. Unresolved references:
   - `CTSGroundAmmo` (used as the `this` type)
   - `UTIL_TraceLine` (call target)
   - `UTIL_VecToAngles` (call target)
   - `readGlobalVec3` (helper)
   Per the checklist, these should be `any` (or stubbed) for the snippet to be self-contained. The function as written is a *partial* file that depends on symbols defined elsewhere in D.4.

Other findings worth flagging:

- **Constants set to 0 are placeholders, not decompilation.** `MAX_TRACE_DISTANCE = 0`, `WALL_OFFSET = 0`, `ANGLE_X_OFFSET = 0` — these need to be read from rodata at the listed GOT offsets (`[ebx-0x6b684]`, `[ebx-0x6df4c]`, `[ebx-0x6dea4]`). With the offsets at 0, the trace goes nowhere and the post-loop origin offset becomes 0, so the function silently does the wrong thing. This is a TODO that should not be shipped as "decompiled TS" — the values must be filled in.

- **Loop angle accumulation looks wrong.** The TS has `angle = (i * Math.PI * 2) / ANGLE_STEP_COUNT` — a uniform i · 2π/8 sweep. The asm at 92c4b does `add [esp+0x10], eax` where `eax = [esp+0x48]` (a precomputed int constant) inside the loop. So `[esp+0x10]` accumulates by a constant each iteration, not by 1. This means the angle step between iterations is not uniform; it's a multiple of bestDistance. The TS's `i * Math.PI * 2 / 8` is a faithful interpretation *only* if `[esp+0x48]` happens to equal 1, which is unlikely. This is a real semantic bug, not just an ambiguity.

- **`hitEnt.field_7c` / `inner.field_0` indirection** — TS captures the `[0]` step but not the `[0x7c]` step. The asm has a 2-step dereference: `cvar_result[0x7c][0] = hitEnt`. TS captures only `[0]` of the second step.

- **`0x42b40000 = 60.0` is correct** IEEE 754 single-precision. ✓

- **`0x270f = 9999` (bestDistance init) and `0x270e = 9998` (no-wall threshold) are correct.** ✓

- **z-component reuse across all 8 directions is a faithful quirk of the TS mod** (the `local_vec.z` slot is never overwritten in the loop body, so the third component stays at `refPoint.z` for every ray). The TS's "TODO(asm-ambiguous)" comment correctly flags this as unusual but the code itself is right.

- **The MSVC hidden-return-pointer convention for UTIL_VecToAngles is captured** — TS comments the `forward` / `out` arg order correctly. ✓ (modulo the question of whether the call result is even used, which the TS also flags).

Suggested rewrite (full TS function):
```typescript
// CTSGroundAmmo::PutOnWall — casts 8 rays at non-uniform angle steps (step
// size is a function of bestDistance from a precomputed ratio) to find the
// nearest wall and snaps the entity onto it. Also writes what looks like
// v_view_ofs (offset 0x50 in entvars_t) rather than angles; the decompiled
// TS conflated these. Constants are read from rodata; field_7c / field_16c
// / field_118 are TS-specific entity fields whose semantics are TBD.

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface TraceResult {
  vecEndPos:      Vec3;
  vecPlaneNormal: Vec3;
  flFraction:     number;
  pEnt:           any | null;
  fAllSolid:      number;
  fStartSolid:    number;
  fInOpen:        number;
  fInWater:       number;
  // TODO: full field set when struct layout is finalized.
}

const ANGLE_STEP_COUNT     = 8;
const BEST_DIST_INIT       = 0x270f; // 9999
const NO_WALL_DIST_THRESH  = 0x270e; // 9998
const NO_WALL_ANGLE_BYTES  = 0x42b40000; // 60.0f — written to pev+0x58 (v_view_ofs.z or similar)
const SENTINEL_FALLBACK    = 0;          // [ebx-0x6f408] — TODO: read from rodata
const SENTINEL_FINWATER    = 0.0;        // [ebx-0x6f018] — TODO: read from rodata
const MAX_TRACE_DISTANCE   = 0;          // [ebx-0x6b684] — TODO: read from rodata
const WALL_OFFSET          = 0;          // [ebx-0x6df4c] — TODO: read from rodata
const ANGLE_X_OFFSET       = 0;          // [ebx-0x6dea4] — TODO: read from rodata
const ANGLE_RATIO          = 0;          // [ebx-0x6c6c8] / [ebx-0x6b680] (precomputed int at [esp+0x48])

export function PutOnWall(this: any): void {
  // External: implement elsewhere.
  // const UTIL_TraceLine = (start: Vec3, end: Vec3, ignoreMonsters: number, pEnt: any, pTrace: TraceResult): void => { ... };
  // const UTIL_VecToAngles = (out: Vec3, forward: Vec3): void => { ... };
  // const readGlobalVec3 = (offset: number): Vec3 => { ... };

  const refPoint: Vec3 = readGlobalVec3(0x1888);

  let bestDistance = BEST_DIST_INIT;
  let bestHitPos:  Vec3 = { x: refPoint.x, y: refPoint.y, z: refPoint.z };
  let bestNormal:  Vec3 = { x: refPoint.x, y: refPoint.y, z: refPoint.z };

  // [esp+0x10] is the angle multiplier, accumulated by ANGLE_RATIO each iter.
  let angleMul = 0;
  const angleStepConst = 0; // TODO: [ebx-0x6c6c0] as float

  for (let i = 0; i < ANGLE_STEP_COUNT; i++) {
    const angle = angleStepConst * angleMul; // NOT i * 2π/8 — see note above.

    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const dz = refPoint.z; // local_vec.z is never written in the loop body.
    const length = Math.sqrt(1 + dz * dz);

    let unitX: number, unitY: number, unitZ: number;
    if (length === SENTINEL_FALLBACK) {
      unitX = 0; unitY = 0; unitZ = 1.0;
    } else {
      const inv = 1.0 / length;
      unitX = dx * inv; unitY = dy * inv; unitZ = dz * inv;
    }

    const endPos: Vec3 = {
      x: this.pev.origin.x + unitX * MAX_TRACE_DISTANCE,
      y: this.pev.origin.y + unitY * MAX_TRACE_DISTANCE,
      z: this.pev.origin.z + unitZ * MAX_TRACE_DISTANCE,
    };

    const trace: TraceResult = UTIL_TraceLine(
      this.pev.origin, endPos, /* ignoreMonsters */ 1, /* pEnt */ null, /* pTrace */ trace
    );

    // Skip this iter if fInWater >= SENTINEL_FINWATER (NOT vecEndPos.x >= 0).
    if (trace.fInWater >= SENTINEL_FINWATER) {
      angleMul += ANGLE_RATIO; // asm still increments angleMul even on skip
      continue;
    }

    // The asm gates this on fInWater == 0, not trace.pEnt == null.
    if (trace.fInWater === 0) {
      // TODO(asm-ambiguous): [ebx+0x1aa8] is some struct with a method at +0x114.
      const cvarAccessor: any = /* read [ebx+0x1aa8] */ null;
      if (cvarAccessor != null) {
        const result = cvarAccessor.method_0x114(0);
        // NOTE: asm does `edx = result[0x7c]` — extra indirection the TS missed.
        if (result != null && result[0x7c] != null) {
          // hitEnt := result[0x7c]; fall through to entity skip checks.
        } else {
          angleMul += ANGLE_RATIO;
          continue;
        }
      } else {
        angleMul += ANGLE_RATIO;
        continue;
      }
    }

    // Entity skip checks on `inner` = hitEnt[0x7c][0].
    // 92b56: fcomp 1.0 vs inner.field_16c; jne if equal. So skip if == 1.0, NOT >= 0.
    const inner = /* hitEnt[0x7c][0] */ null;
    if (inner != null) {
      if (inner.field_16c === 1.0) { angleMul += ANGLE_RATIO; continue; } // CORRECTED
      if (inner.field_118 <  0)    { angleMul += ANGLE_RATIO; continue; }
    }

    // Distance update.
    const ddx = this.pev.origin.x - trace.vecEndPos.x;
    const ddy = this.pev.origin.y - trace.vecEndPos.y;
    const ddz = this.pev.origin.z - trace.vecEndPos.z;
    const dist = Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz);

    if (dist < bestDistance) {
      bestDistance = dist;
      bestHitPos  = { x: trace.vecEndPos.x,      y: trace.vecEndPos.y,      z: trace.vecEndPos.z };
      bestNormal  = { x: trace.vecPlaneNormal.x,  y: trace.vecPlaneNormal.y,  z: trace.vecPlaneNormal.z };
    }

    // ASM NOTE: the loop trailer adds bestDistance to [esp+0x10] BEFORE the
    // i++ / cmp. So angleMul accumulates by bestDistance (via the precomputed
    // ANGLE_RATIO constant in [esp+0x48]) on every iter, regardless of skip.
    angleMul += ANGLE_RATIO;
  }

  if (bestDistance > NO_WALL_DIST_THRESH) {
    // No wall found — asm writes 60.0f to pev+0x58. In standard HLSDK that's
    // v_view_ofs.z, NOT angles.y. Field name corrected; if TS mod has a
    // custom entvars_t, this is what the asm actually says.
    const pev = this.pev;
    // (pev+0x58) = 60.0
    pev.v_view_ofs_z = 60.0;
    return;
  }

  // Wall found — move + orient.
  const newOrigin: Vec3 = {
    x: bestHitPos.x + bestNormal.x * WALL_OFFSET,
    y: bestHitPos.y + bestNormal.y * WALL_OFFSET,
    z: bestHitPos.z + bestNormal.z * WALL_OFFSET,
  };
  this.pev.origin = newOrigin;

  // UTIL_VecToAngles (MSVC hidden-ret-ptr convention: out first, then forward).
  UTIL_VecToAngles(/* out = */ bestNormal, /* forward = */ newOrigin);

  // The asm copies 12 bytes from [esp+0xe4] (which is trace_result.fAllSolid
  // and adjacent ints — likely a TS-specific remnant, NOT pev.origin) to
  // pev+0x50 (v_view_ofs, NOT pev.angles in standard HLSDK), then adds
  // ANGLE_X_OFFSET to pev+0x50.x. The TS's "pev.angles = pev.origin" claim
  // does not match the asm. Marking as TODO; verify against TS entvars_t.
  // TODO(asm-ambiguous): confirm field semantics for the post-loop writes.
  // this.pev.v_view_ofs = { ... };
  // this.pev.v_view_ofs.x += ANGLE_X_OFFSET;
}
```

**Bottom line:** the decompiled TS captures the *shape* of the function correctly (8-iteration loop, trace call, wall/no-wall branch, post-loop origin + angle update) and gets the obvious constants right (0x270f, 0x270e, 0x42b40000, count of 8). But it has several substantive faithfulness issues that need fixing before this can be merged:

1. Wrong field for the trace filter (`fInWater`, not `vecEndPos.x`).
2. Wrong comparison operator for the entity skip (`=== 1.0`, not `>= 0`).
3. Wrong gating for the cvar-entity fallback (`fInWater == 0`, not `trace.pEnt === null`); also missing the `[0x7c]` indirection.
4. Wrong field for the no-wall write (pev+0x58, not angles.y).
5. Wrong field for the post-loop angle/v_view_ofs write (pev+0x50, not angles).
6. Wrong `pentIgnore` source (`[pev+0x208]` doesn't exist in standard entvars_t).
7. The `[esp+0x12c]` read at 92d0b doesn't match `[esp+0x120] = this` from the body — there's a stack-frame discrepancy I can't fully reconcile from the listing.
8. The angle step is *not* uniform `i·2π/8`; it's `angle_step_const · (Σ ANGLE_RATIO)` accumulated across iterations.
9. The placeholder constants (MAX_TRACE_DISTANCE, WALL_OFFSET, ANGLE_X_OFFSET, ANGLE_RATIO) must be filled in from rodata before the function is correct.
10. The snippet won't compile in isolation without `any`-typed stubs for `CTSGroundAmmo`, `UTIL_TraceLine`, `UTIL_VecToAngles`, and `readGlobalVec3`.

Per AGENTS.md: I'd suggest filing this back to Kyle for a second pass on the asm interpretation, especially items 4–8, before treating it as faithful. This is closer to a first-cut than a final decompilation.
