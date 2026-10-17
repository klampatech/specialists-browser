// --- Minimal surface area so this file compiles in isolation. ----
interface Vec3 { x: number; y: number; z: number; }

interface TraceResult {
  flFraction: number;            // added — disassembly reads +0x10
  vecEndPos:   Vec3;             // +0x14
  vecPlaneNormal: Vec3;          // +0x24
  pEnt:        any | null;
  // remaining fields as needed
}

declare function UTIL_TraceLine(
  v1: Vec3, v2: Vec3, fNoMonsters: number, ignoreEnt: any, tr?: any,
): TraceResult;

declare function UTIL_VecToAngles(v: Vec3): Vec3;

interface CTSGroundAmmo {
  pev:   any;   // entvars_t* (or TS-extended); unknown fields left as `any`
  edict: any;
}

// --- Constants pulled from .data; values are TODOs. ---------------
const ANGLE_STEP_COUNT     = 8;
const MAX_TRACE_DISTANCE   = 0;      // [ebx-0x6b684]   TODO: read from .data
const UNIT_THRESHOLD       = 0;      // [ebx-0x6f408]   TODO: read from .data
const UNIT_Z_FALLBACK      = 1.0;    // [ebx-0x6f3fc]   likely 1.0; verify
const ANGLE_X_OFFSET       = 0;      // [ebx-0x6dea4]   TODO: read from .data
const WALL_OFFSET          = 0;      // [ebx-0x6df4c]   TODO: read from .data
const NO_HIT_VALUE         = 60.0;   // 0x42b40000
const NO_HIT_PEV_OFFSET    = 0x58;   // see disassembly 92d50..92d59

export function PutOnWall(this: CTSGroundAmmo): void {
  // refPoint: pointer-to-Vec3 stored at [GOT+0x1888]; deref once.
  const refPoint: Vec3 = ((globalThis as any).__TS_GOT_1888__) as Vec3;

  let bestDistance = 9999;
  let bestHitPos:  Vec3 = { x: 0, y: 0, z: 0 };
  let bestNormal:  Vec3 = { x: 0, y: 0, z: 0 };

  for (let i = 0; i < ANGLE_STEP_COUNT; i++) {
    const angle = (i * 2 * Math.PI) / ANGLE_STEP_COUNT;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const dz = refPoint.z;

    const length = Math.sqrt(1 + dz * dz);  // sqrt(cos² + sin² + refPoint.z²)

    // FIX (checklist #2b): asm `je 92a34` jumps to normalize when
    // ST(0) >= sentinel; fall-through (ST(0) < sentinel) sets unit = (0,0,C).
    let unitX: number, unitY: number, unitZ: number;
    if (length < UNIT_THRESHOLD) {
      unitX = 0;
      unitY = 0;
      unitZ = UNIT_Z_FALLBACK;
    } else {
      const inv = UNIT_Z_FALLBACK / length;  // fdivr [ebx-0x6f3fc]
      unitX = dx * inv;
      unitY = dy * inv;
      unitZ = dz * inv;
    }

    const endPos: Vec3 = {
      x: this.pev.origin.x + unitX * MAX_TRACE_DISTANCE,
      y: this.pev.origin.y + unitY * MAX_TRACE_DISTANCE,
      z: this.pev.origin.z + unitZ * MAX_TRACE_DISTANCE,
    };

    const trace = UTIL_TraceLine(
      this.pev.origin, endPos, /* fNoMonsters */ 1, this.edict,
    );

    // FIX (checklist #2a): asm compares flFraction, not vecEndPos.x.
    if (trace.flFraction >= 1.0 /* [ebx-0x6f018] sentinel */) {
      continue;
    }

    let hitEnt: any = trace.pEnt;
    if (hitEnt === null) {
      // cvar-lookup fallback at [ebx+0x1aa8]+0x114 — semantic
      // placeholder; verify against TS source.
      // TODO(asm-ambiguous): confirm cvar identity.
      continue;
    }

    // Offsets 0x7c/0x16c/0x118 — unknown fields. Typed as `any` so this
    // compiles; cross-reference against a TS dump before lowering to TS.
    const outer = (hitEnt as any).field_at_0x7c;
    if (outer != null) {
      const inner = (outer as any).field_at_0x0;
      if (inner != null) {
        if (((inner as any).field_at_0x16c as number) >= 0) continue;
        if (((inner as any).field_at_0x118 as number) < 0)  continue;
      }
    }

    const ddx = this.pev.origin.x - trace.vecEndPos.x;
    const ddy = this.pev.origin.y - trace.vecEndPos.y;
    const ddz = this.pev.origin.z - trace.vecEndPos.z;
    const dist = Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz);

    if (dist < bestDistance) {
      bestDistance = dist;
      bestHitPos  = { ...trace.vecEndPos };
      bestNormal  = { ...trace.vecPlaneNormal };
    }
  }

  // FIX (checklist #3): pev field at offset 0x58, not angles.y at 0x48.
  if (bestDistance > 9998) {
    this.pev[NO_HIT_PEV_OFFSET] = NO_HIT_VALUE;   // TODO: name this field
    return;
  }

  const newOrigin: Vec3 = {
    x: bestHitPos.x + bestNormal.x * WALL_OFFSET,
    y: bestHitPos.y + bestNormal.y * WALL_OFFSET,
    z: bestHitPos.z + bestNormal.z * WALL_OFFSET,
  };
  this.pev.origin = newOrigin;

  // Side-effect call (MSVC hidden-return-pointer convention).
  UTIL_VecToAngles(newOrigin);

  // origin -> angles, then add ANGLE_X_OFFSET to angles.x.
  this.pev.angles = { x: this.pev.origin.x, y: this.pev.origin.y, z: this.pev.origin.z };
  this.pev.angles.x += ANGLE_X_OFFSET;
}
