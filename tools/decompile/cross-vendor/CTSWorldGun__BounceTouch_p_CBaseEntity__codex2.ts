/**
 * CTSWorldGun::BounceTouch — touch handler for a world-dropped weapon
 * bouncing off another entity.
 *
 * Two paths branch on a high-offset pev byte ([pev+0x1a5] & 0x2):
 *
 *   slow-motion:
 *     - call engine query via [pOther+0x60]->vtable[0x10]
 *     - if 2D speed ≤ [ebx-0x6f074]², scale BOTH the velocity vec3
 *       (pev+0x20..0x2c) and the secondary vec3 (pev+0x5c..0x68) by
 *       a friction coefficient ([ebx-0x6decc] or [ebx-0x6dec0]
 *       depending on a sub-gate)
 *     - zero pev+0x58
 *
 *   normal:
 *     - if engine vfunc(pOther) × [ebx-0x6cb60] ≤ 3D speed, AND a
 *       flat-hit gate ([trace_copy+0x2c] == [ebx-0x6df40]) fires,
 *       AND [pOther+0xc8] != 0, lock the flag at +0xc8 to 1 and
 *       play EMIT_SOUND_DYN with a pitch derived from
 *       engine_globals.vtable[0x168](...)
 *
 * Throughout the body the disassembly uses [ebp+0x0] for every pev
 * access, where ebp = pOther (the first STACK arg). `this` (in ecx)
 * is not referenced. So everything pev+OFFSET below is pOther's pev,
 * not the gun's.
 *
 * @param this    The CTSWorldGun (in ECX, not used in body).
 * @param pOther  The CBaseEntity being touched.
 * @returns       void
 */

// ---- stubs so this compiles in isolation ----
type CTSWorldGun  = unknown;
type CBaseEntity  = any;
type TraceResult  = any;

declare const ENGINE_GLOBALS:    any;
declare function UTIL_GetGlobalTrace():  TraceResult;
declare function EMIT_SOUND_DYN(
  entity:    any,
  channel:   number,
  sample:    string,
  volume:    number,
  attenuation: number,
  flags:     number,
  pitch:     number,
): void;

// --- minimal RawView shape for offset access on pev / trace ---
interface RawView {
  readFloat(o: number): number;     writeFloat(o: number, v: number): void;
  readU32  (o: number): number;     writeU32  (o: number, v: number): void;
  readU8   (o: number): number;     writeU8   (o: number, v: number): void;
  scaleVec3(o: number, k: number):  void;
}
function asRawView(x: any): RawView { return x as RawView; }

// --- globals from disassembly (TODO cross-ref vs ts_i386.so) ---
const PEV_DAMP          = 0.95;   // [ebx-0x6de58]   GOT double (~0.95)
const SLOW2D_GATE       = 1.0;    // [ebx-0x6f074]   GOT float
const FRICTION_SLOW     = 0.4;    // [ebx-0x6decc] / [ebx-0x6dec0] ≈ 0.4
const POST_VFUNC_SCALE  = 0.04;   // [ebx-0x6cb60]
const FLAT_HIT_GLOBAL   = 0.0;    // [ebx-0x6df40]   TBD; treat as zero for now
const ENGINE_GLOBALS_PTR= 0x1aa8;  // ebx-relative offset
const VTABLE_RANDOM     = 0x168;  // engine vfunc index on ENGINE_GLOBALS

const SOUND_GUN_PICKUP  = 'weapons/gun_pickup.wav';  // [ebx-0x6c1ba]
const CHAN_STATIC       = 6;                            // HLSDK channel enum

export function BounceTouch(this: CTSWorldGun, pOther: CBaseEntity): void {
  // NOTE: every pev access below touches pOther's pev, NOT this->pev.
  const pev = asRawView(pOther.pev);

  // ---- Always: pev+0x28 *= PEV_DAMP (velocity.z scaled down) ----
  pev.writeFloat(0x28, pev.readFloat(0x28) * PEV_DAMP);

  if ((pev.readU8(0x1a5) & 0x2) !== 0) {
    // ---- SLOW-MOTION DAMPING ----
    // engine query via pOther's interface ptr at +0x60, vtable slot 0x10
    // TODO(asm-ambiguous): which interface? Looks like a server-side
    //   engine IHandleEntity / physics query. Confirm via HLSDK.
    (pOther as any).interfaceAt(0x60).callVfunc(0x10, pOther);

    const vx = pev.readFloat(0x20);
    const vy = pev.readFloat(0x24);
    const xySpeed = Math.sqrt(vx * vx + vy * vy);

    // Gate: xySpeed == SLOW2D_GATE² sends us to a *different* scale
    // constant ([ebx-0x6dec0] vs [ebx-0x6decc]). Both are ≈ 0.4.
    // TBD: pull exact double from .rodata.
    if (xySpeed <= SLOW2D_GATE) {
      pev.scaleVec3(0x20, FRICTION_SLOW);   // velocity
      pev.scaleVec3(0x5c, FRICTION_SLOW);   // secondary vec3 (likely angvelocity)
    }
    pev.writeU32(0x58, 0);
    return;
  }

  // ---- NORMAL PATH ----
  // 3D speed = sqrt(vx² + vy² + vz²). The disassembly reads pev+0x20,
  // +0x24, AND +0x28 here, vs only +0x20 and +0x24 in the slow branch.
  // Previous version of this code used 2D speed here — that was wrong.
  const vx = pev.readFloat(0x20);
  const vy = pev.readFloat(0x24);
  const vz = pev.readFloat(0x28);
  const totalSpeed = Math.sqrt(vx * vx + vy * vy + vz * vz);

  const slowed = (pOther as any).interfaceAt(0x60).callVfunc(0x10, pOther) * POST_VFUNC_SCALE;
  if (slowed > totalSpeed) return;     // entity is still in flight

  // Snapshot engine's last global trace.
  const traceRaw = UTIL_GetGlobalTrace();
  const trace    = asRawView(traceRaw);

  // [trace+0x2c] compared equal to [ebx-0x6df40] ⇒ "flat hit" gate.
  // TODO(asm-ambiguous): trace_t field at offset 0x2c. Candidates:
  //   vecEndPos.z, vecPlaneNormal.z, or TS-extended; needs trace_t dump.
  //   Also: 0x2c could be an int not a float.
  const traceField = trace.readFloat(0x2c);
  const isFlatHit = traceField === FLAT_HIT_GLOBAL;
  if (!isFlatHit) return;

  // [pOther+0xc8]: disassembly is `cmp [ebp+0xc8], 0; je end` —
  // RETURN if zero, CONTINUE if non-zero. Previous version had this
  // polarity inverted. Real semantics of the flag still TBD, but
  // polarity is unambiguous.
  if ((pOther as any).byteAt(0xc8) === 0) return;

  // Normalise the flag to 1 (binary writes 1 here regardless of the
  // value it held on entry, if non-zero).
  (pOther as any).writeU8(0xc8, 1);

  // ---- Pitch computation ----
  // Stack args for the engine vfunc call are (in callee-first order):
  //   arg1 = [pev+0x208]
  //   arg2 = uninitialised local
  //   arg3 = 0.5
  //   arg4 = uninitialised gap
  //   arg5 = 10
  //   arg6 = 0
  // Real signature TBD via engine-internals cross-reference. Likely
  // RANDOM_FLOAT([pev+0x208], 0x5), but the extra slots are
  // unexplained.
  const sampleIdx   = pev.readU32(0x208);
  const engineGlob  = asRawView(ENGINE_GLOBALS).readU32(ENGINE_GLOBALS_PTR);
  const engineBase  = asRawView(engineGlob);
  const pitchBase   = (engineBase as any).vfunc(VTABLE_RANDOM)(
                        /* [pev+0x208] */ sampleIdx,
                        /* unknown */     0,
                        /* 10 */         10,
                        /* 0.5 */        0.5,
                      );
  const pitch       = pitchBase + 100;     // +0x64

  EMIT_SOUND_DYN(
    /* entity */ pOther.edict,
    /* channel */ CHAN_STATIC,
    /* sample  */ SOUND_GUN_PICKUP,
    /* volume  */ 1.0,
    /* atten   */ 0.8,
    /* flags   */ 0,
    /* pitch   */ pitch,
  );
}
