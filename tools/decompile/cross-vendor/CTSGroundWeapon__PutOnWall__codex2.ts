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
