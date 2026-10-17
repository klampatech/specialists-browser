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
