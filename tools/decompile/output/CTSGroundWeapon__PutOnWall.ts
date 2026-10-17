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
