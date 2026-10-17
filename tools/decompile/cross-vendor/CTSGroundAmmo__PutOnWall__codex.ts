```typescript
// Inline type definitions — replace when D.4 lands.
interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface TraceResult {
  vecEndPos:      Vec3;
  vecPlaneNormal: Vec3;
  flFraction:     number;
  pEnt:           any | null;  // CBaseEntity | null — using `any` to avoid forward references.
  // TODO: full field set when struct layout is finalized.
}

/**
 * CTSGroundAmmo::PutOnWall — Casts rays in 8 horizontal directions to find
 * the nearest wall and snaps the entity onto it (offset along the wall normal).
 *
 * @param this  The CTSGroundAmmo entity instance (this in the original C++)
 * @returns     void
 */
export function PutOnWall(this: CTSGroundAmmo): void {
  // ----- Constants pulled from .data / .rodata via PIC. -----
  // TODO: read these from the actual data section.
  const ANGLE_STEP_COUNT   = 8;
  const MAX_TRACE_DISTANCE = 0;     // [ebx-0x6b684]
  const WALL_OFFSET        = 0;     // [ebx-0x6df4c]
  const ANGLE_X_OFFSET     = 0;     // [ebx-0x6dea4]
  const NO_WALL_ANGLE_Y    = 60.0;  // 0x42b40000 — fallback pev->angles.y when no wall found

  // ----- Setup: read the reference vec3_t from a global at [ebx+0x1888]. -----
  // The .z component is reused as the z-component of every ray direction,
  // which is unusual. Most likely this is the entity's spawn origin, the
  // player, or the thrower's position.
  // TODO(asm-ambiguous): identify [ebx+0x1888].
  const refPoint: Vec3 = readGlobalVec3(/* GOT offset 0x1888 */);

  // ----- Loop state — bestHitPos / bestNormal are placeholders overwritten -----
  // ----- on each successful trace that beats the previous best distance.   -----
  let bestDistance = 9999;  // [esp+0x4c] initialized to 0x270f
  let bestHitPos:  Vec3 = { x: refPoint.x, y: refPoint.y, z: refPoint.z };
  let bestNormal:  Vec3 = { x: refPoint.x, y: refPoint.y, z: refPoint.z };

  // ----- Loop: 8 horizontal directions (every π/4 radians). -----
  for (let i = 0; i < ANGLE_STEP_COUNT; i++) {
    const angle = (i * Math.PI * 2) / ANGLE_STEP_COUNT;

    // Direction vector: (cos(angle), sin(angle), refPoint.z).
    // TODO(asm-ambiguous): reusing refPoint.z as dir.z is unusual.
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const dz = refPoint.z;

    // length = sqrt(cos² + sin² + dz²) = sqrt(1 + dz²).
    const length = Math.sqrt(1 + dz * dz);

    // Normalize. Fall back to (0, 0, 1) when length equals a sentinel constant.
    let unitX: number, unitY: number, unitZ: number;
    // TODO(asm-ambiguous): the sentinel at [ebx-0x6f408] is unclear.
    if (length === 0 /* [ebx-0x6f408] */) {
      unitX = 0;
      unitY = 0;
      unitZ = 1.0;
    } else {
      const inv = 1.0 / length;
      unitX = dx * inv;
      unitY = dy * inv;
      unitZ = dz * inv;
    }

    // Trace endpoint = origin + unitDir * MAX_TRACE_DISTANCE.
    const endPos: Vec3 = {
      x: this.pev.origin.x + unitX * MAX_TRACE_DISTANCE,
      y: this.pev.origin.y + unitY * MAX_TRACE_DISTANCE,
      z: this.pev.origin.z + unitZ * MAX_TRACE_DISTANCE,
    };

    // Cast the trace.
    const trace: TraceResult = UTIL_TraceLine(
      this.pev.origin,
      endPos,
      /* ignore_monsters = */ 1,
      this.edict,
    );

    // Skip this iteration if vecEndPos.x >= sentinel constant.
    // TODO(asm-ambiguous): the sentinel at [ebx-0x6f018] is unclear. The asm
    //  loads vecEndPos.x as a float and `jae`s over the hit-processing block
    //  when ST(0) >= sentinel. May filter out traces that ran past world
    //  geometry or into "negative-x" territory.
    if (trace.vecEndPos.x >= 0 /* [ebx-0x6f018] */) {
      continue;
    }

    // If trace.pEnt is null, fall back to a cvar-based entity lookup.
    let hitEnt: any = trace.pEnt;
    if (hitEnt === null) {
      // TODO(asm-ambiguous): [ebx+0x1aa8] is a cvar pointer with a method at
      //  +0x114. Its identity and the method's semantics are unclear.
      const cvarAccessor: any = /* read [ebx+0x1aa8] */;
      if (cvarAccessor != null) {
        const fetched = cvarAccessor.value(0);
        if (fetched != null) {
          hitEnt = fetched;
        }
      }
      if (hitEnt === null) continue;
    }

    // Inspect hit entity fields (offsets [+0x7c], [+0x16c], [+0x118]).
    // The asm rejects the hit under certain conditions on these fields.
    // TODO(asm-ambiguous): field semantics for [+0x7c], [+0x16c], [+0x118].
    const outer = hitEnt.field_7c;
    if (outer != null) {
      const inner = outer.field_0;
      if (inner != null) {
        if (inner.field_16c >= 0 /* threshold */) continue;
        if (inner.field_118 < 0)    continue;
      }
    }

    // Distance from origin to vecEndPos.
    const ddx = this.pev.origin.x - trace.vecEndPos.x;
    const ddy = this.pev.origin.y - trace.vecEndPos.y;
    const ddz = this.pev.origin.z - trace.vecEndPos.z;
    const dist = Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz);

    // Update best if closer.
    if (dist < bestDistance) {
      bestDistance = dist;
      bestHitPos = {
        x: trace.vecEndPos.x,
        y: trace.vecEndPos.y,
        z: trace.vecEndPos.z,
      };
      bestNormal = {
        x: trace.vecPlaneNormal.x,
        y: trace.vecPlaneNormal.y,
        z: trace.vecPlaneNormal.z,
      };
    }
  }

  // ----- Post-loop: apply the result. -----
  if (bestDistance > 9998) {
    // No wall found — fall back to a default angle.
    this.pev.angles.y = NO_WALL_ANGLE_Y;
    return;
  }

  // Wall found — move the entity to hitPos + normal * WALL_OFFSET.
  const newOrigin: Vec3 = {
    x: bestHitPos.x + bestNormal.x * WALL_OFFSET,
    y: bestHitPos.y + bestNormal.y * WALL_OFFSET,
    z: bestHitPos.z + bestNormal.z * WALL_OFFSET,
  };
  this.pev.origin = newOrigin;

  // Compute angles via UTIL_VecToAngles.
  // The asm pushes (&newOrigin, &bestNormal) but the function declares one
  // Vector arg. With MSVC's hidden-return-pointer convention (Vector is too
  // large for register return), the layout becomes:
  //   hidden arg (eax) = &bestNormal — output angles buffer
  //   visible arg (edx) = &newOrigin — input forward vector
  // The result is not used to set pev->angles (the asm copies pev->origin
  // to pev->angles instead); the call may have engine-state side effects.
  // TODO(asm-ambiguous): confirm whether UTIL_VecToAngles result is used.
  UTIL_VecToAngles(/* forward = */ newOrigin, /* out = */ bestNormal);

  // The asm copies pev->origin to a temp buffer at [esp+0xd4], then copies
  // that temp buffer to pev->angles (pev->angles = pev->origin), and adds
  // ANGLE_X_OFFSET to angles.x. This appears to be TS-specific behavior —
  // using the entity's own position as its angles, with a small x-axis
  // adjustment.
  this.pev.angles = {
    x: this.pev.origin.x,
    y: this.pev.origin.y,
    z: this.pev.origin.z,
  };
  this.pev.angles.x += ANGLE_X_OFFSET;
}
```
