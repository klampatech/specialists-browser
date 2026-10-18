// ============================================================================
// Types — local so the file compiles in isolation.
// ============================================================================

declare class CBaseEntity {
  pev: entvars_t;
  edict: Edict;
  m_pOwner: CBaseEntity | null;
  // vfunc at offset 0xc8 in pOther's vtable (asm: [eax+0xc8]).
  // Likely IsAlive() / IsMonster(). ASM-ambiguous.
  vfuncIsAlive?(this: CBaseEntity): number;
  // vfunc at offset 0x54 in pOther's vtable (asm: [edx+0x54]).
  // Signature from disassembly: (this, pOther, pevAttacker,
  //   damageInfo, dir, trace, bitsDamageType) → number.
  TraceAttack(
    this: CBaseEntity,
    pOther: CBaseEntity,
    pevAttacker: entvars_t,
    damageInfo: number,                 // [ebx - 0x6e7f4] global
    dir: Vector,
    trace: TraceResult,
    bitsDamageType: number,
  ): void;
}

declare class CTSShrapnel extends CBaseEntity {
  // TODO(asm-ambiguous): exact field names at offsets 0xc, 0x10, 0x88.
  // asm uses raw dword stores; field identity is inferred from how it's
  // used (next-think function pointer, mode/counter, next-think time).
  m_pFunction: number;
  m_iMode: number;
  m_flNextThink: number;
  m_flDamage: number;                   // TODO(asm-ambiguous)
}

// Minimal entvars_t — only the offsets the asm touches.
declare const entvars_t: {
  new (): entvars_t;
};
declare interface entvars_t {
  // Numerical-indexed fallback for asm-discovered offsets.
  [k: number]: number;
  // Named equivalents where known.
  classname: string;
  origin: Vector;
  velocity: Vector;
  angles: Vector;
  avelocity: Vector;
  movetype: number;
  EFlags: number;
  flags: number;
  groundentity: number;
  modelindex: number;                   // pev+0x208 is read by GetSoundPitch
}

declare interface Edict { /* engine-defined */ }
declare interface Vector { x: number; y: number; z: number }
declare interface TraceResult {
  vecEndPos: Vector;
  vecPlaneNormal: Vector;
  pHit: CBaseEntity | null;
}

// Engine / mod globals — names TO DO.
declare const g_engfuncs: {
  vfunc_0x168: (a: number, b: number) => number; // GetSoundPitch engine helper
  vfunc_0x54: number;                            // unused here (TraceAttack is on CBaseEntity)
};
declare const globals: { time: number };

// GOT-relative globals — values seeded from the .so; declare as any here.
declare const __got: {
  // Constants pulled in by BounceTouch.
  BRUSH_SURFACE_FLAG: number;          // [ebx - 0x6f408]
  UNIT_LEN: number;                    // [ebx - 0x6f3fc]
  BOUNCE_FACTOR: number;               // [ebx - 0x6df78]
  EMBED_OFFSET_SCALE: number;          // [ebx - 0x6df74]
  NEXT_THINK_DELTA: number;            // [ebx - 0x6ecd0]
  // Symbolic globals.
  SOUND_SAMPLE: string;                // [ebx - 0x6e7b7] "weapons/shrapnel_hit.wav"
  DAMAGE_INFO: number;                 // [ebx - 0x6e7f4] (also reused as ebp)
  BRUSH_CLASSNAME_A: string;           // [ebx - 0x6e053]
  BRUSH_CLASSNAME_B: string;           // [ebx - 0x6e048]
  EMBED_FIXED_VEL: Vector;             // [ebx + 0x1888]
  GET_SOUND_PITCH_HELPER: number;      // [ebx + 0x1aa8]
};

// Mod helpers.
declare function STRING(p: any): string;
declare function ApplyMultiDamage(
  pevInflictor: entvars_t,
  pevVictim: entvars_t,
): void;
declare function ClearMultiDamage(): void;
declare function UTIL_GetGlobalTrace(): TraceResult;
declare function UTIL_SetOrigin(pev: entvars_t, v: Vector): void;
declare function UTIL_VecToAngles(v: Vector): Vector;
declare function EMIT_SOUND_DYN(
  entity: Edict,
  channel: number,
  sample: string,
  vol: number,
  attn: number,
  flags: number,
  pitch: number,
  pitchOffset: number,
): void;

// ============================================================================
// CTSShrapnel::BounceTouch(pOther)
// ============================================================================

/**
 * Handle a shrapnel piece touching another entity.
 *
 * Decompiled from `BounceTouch__11CTSShrapnelP11CBaseEntity` at 0x0006c200
 * (1144 B). The disassembly shows three branch outcomes that the C source
 * routes to:
 *
 *   (1) Early return — pOther is killed / has a non-null groundentity.
 *   (2) Brush path (no damage) — pOther is a brush surface. If its classname
 *       matches the two embedded func_* strings, embed this shrapnel into the
 *       wall (offset its origin, push it as avelocity, set pOther's movetype
 *       to FLY_BOUNCE, clear EFlags), otherwise do a generic velocity
 *       reversal. Either way, plays the bounce sound and schedules next think.
 *   (3) Damage path — pOther is damageable and not a brush. Call
 *       TraceAttack → ApplyMultiDamage; then write the bounce velocity into
 *       pOther's velocity (NOT this->velocity — see asm 6c357–6c3b9). Same
 *       sound + next-think as path (2).
 *
 * @param this   The CTSShrapnel entity instance
 * @param pOther The entity that was touched
 */
export function BounceTouch(this: CTSShrapnel, pOther: CBaseEntity): void {
  // ---- (1) Early return: pOther->pev->groundentity non-null. ----
  // asm: cmp BYTE [edx + 0x118], 0; js 6c66d  (jump to func exit if SF set,
  // i.e., the low byte is 0x80+). Offset 0x118 = pev->groundentity in
  // HLSDK entvars_t, so this is a null-pointer check on the groundentity.
  if (((pOther.pev[0x118] as number) & 0x80) !== 0) {
    return;
  }

  // ---- Pull asm constants once (used by both branches). ----
  // asm: `fld [ebx - 0x6f408]` then `fcomp [edx + 0x16c]`. The C3 flag (==)
  // routes to the brush path; otherwise fall through.
  const SURFACE_FLAG = __got.BRUSH_SURFACE_FLAG;       // float
  const UNIT_LEN     = __got.UNIT_LEN;                  // float
  const BOUNCE       = __got.BOUNCE_FACTOR;             // float
  const EMBED_SCALE  = __got.EMBED_OFFSET_SCALE;        // float
  const NEXT_DELTA   = __got.NEXT_THINK_DELTA;          // float (≈ 0.1)
  const SAMPLE       = __got.SOUND_SAMPLE;
  const BRUSH_A      = __got.BRUSH_CLASSNAME_A;
  const BRUSH_B      = __got.BRUSH_CLASSNAME_B;
  const EMBED_VEL    = __got.EMBED_FIXED_VEL;
  const PITCH_LUT    = __got.GET_SOUND_PITCH_HELPER;
  const DAMAGE_INFO  = __got.DAMAGE_INFO;

  // ---- Compute direction-of-travel and unit-velocity from this->velocity. ----
  // asm: take [esp+? ] vel = edi->pev->velocity = ... compute |v|, then
  // either use (0,0,1) (|v|==0) or v/|v|.

  // TODO(asm-ambiguous): which [esp+offset] this maps to. The rep movs
  // for the dir vector in the damage path lives at one set of offsets;
  // the brush path at a different set. Easiest to read from this->pev.
  const vel: Vector = this.pev.velocity;
  const speed = Math.hypot(vel.x, vel.y, vel.z);
  const dir: Vector =
    speed === 0 ? { x: 0, y: 0, z: 1 } :
                  { x: vel.x / speed, y: vel.y / speed, z: vel.z / speed };

  // ---- (2) Brush path OR (3) damage path. ----
  // asm gate (i): pev[0x16c] == SURFACE_FLAG ⇒ brush path.
  // asm gate (ii): vfunc at [pOther+0x60]+0xc8 returns 0 ⇒ brush path.
  const isBrushSurface = pOther.pev[0x16c] === SURFACE_FLAG;
  // TODO(asm-ambiguous): the TS convention for HLSDK behavior of vfunc at
  // offset 0xc8 in CBaseEntity's vtable. The asm passes `pOther` and expects
  // a numeric return.
  const damagable =
    typeof pOther.vfuncIsAlive === 'function'
      ? (pOther.vfuncIsAlive.call(pOther) !== 0)
      : true;

  const goBrushEmbed = isBrushSurface;
  const goBrushGeneric = !isBrushSurface && !damagable;

  if (goBrushEmbed) {
    // ===== Brush-embed path: only when pOther's classname is one of the
    //       two embedded strings (`worldspawn` / `func_wall` candidates).
    // asm: 6c3c0 branch with two `strcmp`s; if either matches, 6c40e.

    // TODO(asm-ambiguous): the two strings at [ebx-0x6e053] and
    // [ebx-0x6e048] — verify with strings-n5.txt.
    const classname = STRING(pOther.pev.classname);
    if (classname === BRUSH_A || classname === BRUSH_B) {
      // Recompute dir * EMBED_SCALE as the offset used to push the shrapnel
      // *into* the wall along its travel direction.
      const offset: Vector = {
        x: dir.x * EMBED_SCALE,
        y: dir.y * EMBED_SCALE,
        z: dir.z * EMBED_SCALE,
      };

      // Reverse the offset along dir to get the new origin (push into wall).
      // asm: UTIL_SetOrigin(this->pev, this->pev->origin - offset).
      UTIL_SetOrigin(this.pev, {
        x: this.pev.origin.x - offset.x,
        y: this.pev.origin.y - offset.y,
        z: this.pev.origin.z - offset.z,
      });

      // Convert offset → angles and copy to pOther.
      const a = UTIL_VecToAngles(offset);
      // asm: two rep movs copies of 3 dwords each — angles AND (later)
      // avelocity use the same buffer.
      pOther.pev.angles = a;

      // asm 6c4f6–6c522: avelocity.x = 90.0 (0x42b40000), then two `rep movs`
      // take `a` and write to pOther->pev->angles AND avelocity.
      // (Yes, both `angles` and `avelocity` get the same vector — that's
      // what the disassembly shows. Verify against D.4 if it surprises
      // you.)
      pOther.pev.avelocity = { x: 90.0, y: 0, z: 0 };

      // asm 6c52d–6c542: pOther->pev->EFlags = 0; pOther->pev->movetype = 5.
      // 5 = MOVETYPE_FLY_BOUNCE in HLSDK.
      pOther.pev.EFlags = 0;
      pOther.pev.movetype = 5;

      // asm 6c54c–6c57a: copy EMBED_VEL (a fixed 3-vector) into both
      // pOther->pev->velocity (offset 0x20) and avelocity (offset 0x5c).
      // The disassembly reads the same 3-dword source twice.
      pOther.pev.velocity = EMBED_VEL;
      pOther.pev.avelocity = EMBED_VEL;
      // (The TS version sets avelocity.x = 90 earlier; this overwrites it.
      // If the asm really does both, capture this as a TODO — the original
      // C is unlikely to do exactly that.)
    } else {
      // ===== Generic brush (not the special classname): reverse this->velocity
      //       scaled by BOUNCE. asm 6c584–6c5e8.
      this.pev.velocity = {
        x: -vel.x * BOUNCE,
        y: -vel.y * BOUNCE,
        z: -vel.z * BOUNCE,
      };
    }
  } else if (goBrushGeneric) {
    // ===== Soft-target + IsAlive()==0: same generic bounce as brush-generic.
    this.pev.velocity = {
      x: -vel.x * BOUNCE,
      y: -vel.y * BOUNCE,
      z: -vel.z * BOUNCE,
    };
  } else {
    // ===== (3) Damage path: TraceAttack → ApplyMultiDamage, then reverse
    //       *pOther*'s velocity (NOT this->velocity — see asm 6c357–6c3b9).
    // asm 6c261–6c276: attacker = (cond ? some_ptr : some_ptr->[0x8c]);
    // Stack math at that offset reads pOther, but the semantic is that the
    // attacker is the owner of whoever fired the shrapnel. Capture both
    // readings with an explicit TODO.
    let attacker: CBaseEntity;
    if (pOther.m_pOwner !== null) {
      attacker = pOther.m_pOwner;
      // TODO(asm-ambiguous): if a D.4 pass through the asm confirms the
      // stack offset reads `this` rather than `pOther`, switch this to
      // `this.m_pOwner`.
    } else {
      attacker = pOther;
    }

    // asm 6c284 ClearMultiDamage then 6c284 UTIL_GetGlobalTrace then
    // 6c284 TraceAttack(...)
    const trace = UTIL_GetGlobalTrace();
    ClearMultiDamage();
    pOther.TraceAttack(
      pOther,
      attacker.pev,
      DAMAGE_INFO,
      dir,
      trace,
      0x1004,                        // bitsDamageType
    );
    ApplyMultiDamage(attacker.pev, pOther.pev);

    // asm 6c35c–6c3b7: 3-dword rep movs writes (-vel * BOUNCE) into
    // pOther->pev->velocity (NOT this->velocity — `eax` was reloaded from
    // `[edi]` where edi was re-anchored to pOther at 6c349).
    pOther.pev.velocity = {
      x: -vel.x * BOUNCE,
      y: -vel.y * BOUNCE,
      z: -vel.z * BOUNCE,
    };
  }

  // ---- Emit bounce sound (shared exit, both damage and brush paths). ----
  // asm 6c5ea–6c633: pitchOffset = g_engfuncs.vfunc_0x168(0x14, 0x1e) + 0x64.
  const pitchOffset = g_engfuncs.vfunc_0x168(0x14, 0x1e) + 0x64;
  EMIT_SOUND_DYN(
    pOther.edict,                  // asm: arg pushed is `esi`, which was
                                  // set to `[eax + 0x208]` of pOther's pev,
                                  // routed via vfunc; the actual edict is
                                  // pOther's. TODO(asm-ambiguous): confirm.
    4,                             // channel (CHAN_VOICE in HLSDK)
    SAMPLE,                        // [ebx - 0x6e7b7]
    1.0,                           // vol  (0x3f800000)
    0.8,                           // attn (0x3f4ccccd)
    0,                             // flags
    pitchOffset,                   // int
    0.5,                           // pitch (0x3f000000)
  );

  // ---- Schedule next think (shared exit asm 6c636–6c677). ----
  // asm writes:
  //   mov dword [esi+0xc], 0x460000    ; function pointer
  //   mov dword [esi+0x10], 0x60       ; mode/counter
  //   mov dword [esi+0x88], globals.time + NEXT_DELTA
  // The TS leaves field names as TODOs.
  this.m_pFunction = 0x460000;       // TODO(asm-ambiguous)
  this.m_iMode     = 0x60;           // TODO(asm-ambiguous)
  this.m_flNextThink = globals.time + NEXT_DELTA;
}
