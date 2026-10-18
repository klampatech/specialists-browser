```
VERDICT: FAIL

Note on the checklist: this prompt's checklist was built for the engine↔mod
interface functions (GetEntityAPI*, GetNewDLLFunctions, GiveFnptrsToDll) per
the HLSDK reference at the top. CTSShrapnel::BounceTouch is a gameplay
function, not an engine↔mod interface, so checklist items 2/3 don't apply
literally. I've re-mapped them to the meaningful equivalents for this class
of function and called out where the original checklist is N/A.

Checklist:
1. Signature — ✅ pass — `BounceTouch(this: CTSShrapnel, pOther: CBaseEntity): void`
   matches `CTSShrapnel::BounceTouch(p CBaseEntity)` from nm/-D output. The
   TS uses the standard C++ thiscall convention (this implicit, pOther as
   the only stack arg), which is consistent with how the disassembly reads
   pOther from `[esp+0xa4]` at function entry.

2. Version check — N/A — re-mapped to "guard checks / early-return guards
   match the disassembly". ⚠️ needs review. The early-return for `pev->groundentity
   != 0` is correct. BUT the second guard at the fcomp / `jne 6c3c0` is
   misdecoded — see issue §1 below. The vfunc gate (`[eax+0xc8]`, returns
   0 → 6c3c0) is also reinterpreted with a TODO but in the right position.

3. interfaceVersion assignment — N/A — re-mapped to "no fabricated control
   flow". ❌ fail — see §1, §2, §5.

4. Success path: struct copy — N/A — re-mapped to "data flow preserved".
   ❌ fail — the damage-path bounce writes to pOther->velocity, not
   this->velocity. See §2.

5. No fabricated paths — ❌ fail — there is at least one fabricated /
   inverted branch (the fcomp check) and one fabricated destination for the
   post-ApplyMultiDamage velocity reversal. Some of these are flagged as
   TODO but they shape the wrong behavior.

6. No TODO-only body — ⚠️ borderline. The body isn't a pure TODO, but a
   lot of the *named-thing-but-it's-a-placeholder* pattern is heavy
   (`STR_BRUSH_A`, `STR_BRUSH_B`, `PLACEHOLDER_FIXED_VEC`,
   `engineGetSoundPitch`, all the `fBounce = 1.0 // TODO`s). The "shape" is
   real code, but a meaningful fraction of the data-flow is `TODO` rather
   than an asm-derived guess.

7. Field names — ⚠️ needs review. The known HLSDK `entvars_t` offsets that
   appear in the asm ARE inferable: `0x20` (velocity), `0x8` (origin),
   `0x118` (groundentity), `0x50` (angles), `0x58` (avelocity),
   `0x108` (movetype), `0x10c` (EFlags). The TS uses `pev.angles` /
   `pev.avelocity` / `pev.velocity` / `pev.origin` inconsistently with
   bracket access for the same struct; some TS names (e.g., `m_pFunction`,
   `m_iMode`, `m_flNextThink`) are invented without disassembly support.
   See §3–§6.

8. Compiles in isolation — ❌ fail. References types it never declares or
   imports: `CTSShrapnel`, `CBaseEntity`, `Vector`, `TraceResult`, `STRING`,
   `ApplyMultiDamage`, `ClearMultiDamage`, `UTIL_GetGlobalTrace`,
   `UTIL_SetOrigin`, `UTIL_VecToAngles`, `EMIT_SOUND_DYN`, `globals`,
   `engineGetSoundPitch`, `vfunc_IsDamagable`, `pOther.pev` as an
   indexable. The C++ side has them; the TS doesn't. Mixed
   `.pev.classname` / `.pev[0x118]` access on the same object is also a
   type problem.

Issues to fix (in priority order):

§1. The fcomp branch at 0x6c238 is in the wrong direction.
   asm:
     fld  [ebx - 0x6f408]            ; float constant C
     fcomp [edx + 0x16c]             ; cmp C with pev[0x16c]
     fnstsw ax / test ah,0x40 / jne  ; "C3 set (==)" → brush path 6c3c0
   TS now has:
     const isBrushSurface: boolean = fSurfaceFlag !== 0;
     if (isBrushSurface) { /* brush */ } else { /* damage */ }
   This inverts the asm regardless of what C is, and "non-zero" replaces
   the asm's "equality with this specific constant". Two separate
   corrections, not one: even with the same constant, the boolean is
   inverted; with a different constant, the condition is the wrong test.

§2. Damage-path velocity reversal writes to the wrong destination.
   asm after ApplyMultiDamage (6c357–6c3b9):
     6c357:  mov eax, [edi]            ; eax = pOther->pev (reloaded)
     6c35c:  lea edi, [eax+0x20]        ; edi = &pOther->pev->velocity
     6c35f…74:  load vx,vy,vz, xor signbits
     6c379–81: store to [esp+0x10..0x18]
     6c385:  fld bounce-factor [ebx-0x6df78]
     …                                ; multiply into [esp+0x30..0x38]
     6c3b7:  rep movs edi←esi, ecx=3   ; *pOther->pev->velocity := -v*bounce
     6c3b9:  jmp 6c636
   The TS has:
     this.pev.velocity = { x: -vel.x * fBounce2, … }
   That's wrong: the 3-dword `rep movs` writes to the `[edi]` that was
   `[eax+0x20]`, with eax coming from a re-load of `[edi]` after the
   `mov edi, [esp+0xac]` at 6c349. The point of the `mov edi,[esp+0xac]`
   right before the ApplyMultiDamage call is precisely to re-anchor
   `edi = pOther` so the post-call `mov eax, [edi]` reads
   `pOther->pev`. The brush-generic path at 6c584–6c5e8 (which actually
   targets `this`) reads `[esp+0xa0]` (this) instead and gets a
   different source. The TS has the two paths merged into the same
   semantics (`this.pev.velocity = …`) and the damage path inherits the
   wrong destination.

   (Side note: if the writer's C source really did mean
   "pOther takes the bounce on hit", that's a known gameplay choice
   in shrapnel mods where the bolt imparts momentum; flag this with
   `// TODO(asm-ambiguous): confirms TS source intent` rather than
   declaring the TS author chose "this bounces".)

§3. The TraceAttack call is not `(damage=0, bitsType=0x1004)`.
   asm (6c30c–6c333) pushes:
     [ebp] = [ebx-0x6e7f4]   ; a damage-info object/pointer (not 0!)
     &dir                   ; damage direction
     &trace                  ; trace
     0x1004                  ; bitsDamageType
     attacker->pev           ; pevAttacker
     pOther                  ; pOther
   The TS has:
     pOther.TraceAttack(attacker.pev, /* damage */ 0, dir, trace, 0x1004);
   The `0` for the damage value is fabricated; the asm has a
   dereferenced damage-info global in that slot. (`ebp` was loaded from
   `[ebx-0x6e7f4]` at 6c22c.) Capture the slot with a named local
   (`damageInfo = readGlobal(...); pOther.TraceAttack(attacker.pev,
   damageInfo, dir, trace, 0x1004);`) and TODO it.

§4. The `m_pOwner` ownership gate reads the wrong object (or is right
   and mislabeled).
   Stack math around 6c261–6c276 puts `[esp+0xa0]` at `pOther`, not
   `this`, once the call block at 6c249–6c256 is included:
     6c266 reads edx = [esp+0xa0]
     6c26d cmp   [edx+0x8c], 0
     6c274 je    6c27c
     6c276 mov   esi, [edx+0x8c]
   So the asm is `attacker = (pOther->m_pOwner != NULL) ? pOther->m_pOwner
   : pOther;`, not `(this->m_pOwner != NULL) ? this->m_pOwner : this`.
   The semantically obvious owner-tracking lives on `this` for a TS
   mod bolt, so two possibilities:
     (a) the TS author is right and the asm's `[esp+0xa0]` here is
         actually `this` (recovers a bug in my stack-offset counting);
     (b) the TS author is wrong and the original C really does treat
         `pOther`'s owner as the attacker.
   Either way, this needs an explicit `// TODO(asm-ambiguous): m_pOwner
   placement. Stack offsets in this block say pOther+0x8c; field-name
   convention suggests this+0x8c.` rather than a confident
   `attacker = this.m_pOwner ? this.m_pOwner : this`.

§5. The two `fcomp` fallthroughs to the brush path turn into one
   inverted "isBrushSurface" boolean.
   The asm has TWO independent gates that both fall through to 6c3c0:
     (i)  pev[0x16c] == constant (fcomp zero-flag)
     (ii) vfunc at [pOther+0x60]+0xc8 returns 0
   The TS merges these into "isBrushSurface = pev[0x16c] !== 0"
   (gate (i) only, with the wrong direction). The vfunc gate is
   still represented under the "else" branch as `fDamagable === 0`,
   which is correct in structure but loses the fcomp's contribution:
   in the asm, either condition alone routes to brush. That's the
   "is damageable" check, but should be written as
   `if (pev[0x16c] !== constant || pOther.isDamageable() === 0)`
   to match the asm's OR semantics (and that's exactly the test
   the original C does).

§6. Several "TODO = 1.0" bounces hide one shared constant.
   `[ebx-0x6df78]` is loaded five+ times across both bounce paths
   (damage, brush-generic, brush-embed gravity normalize). The TS
   hardcodes every one to `1.0` and gives each one its own TODO
   name. Define one helper (`bounceFactor = readFloatGlobal(
   BBOUNCE_FACTOR_GOT);`) at the top and reuse. Same with
   `[ebx-0x6df74]` (embed offset scale) and `[ebx-0x6ecd0]`
   (next-think delta — 0.1 — at 6c65f–6c667).

§7. Compile-in-isolation cleanup.
   The TS needs at minimum, defined locally:
     - `class CTSShrapnel extends CBaseEntity { pev: entvars_t;
       m_pOwner: CBaseEntity|null; m_pFunction: number;
       m_iMode: number; m_flNextThink: number;
       m_flDamage: number; nextTouchWith: number; }`
     - `class CBaseEntity { pev: entvars_t; edict: Edict;
       isDamageable(): number; vfunc_0xc8?(): number;
       TraceAttack(pOther, pevAttacker, damageInfo, dir,
         trace, bitsDamageType): void; }`
     - `type entvars_t = { [k:number]: number|string;
       classname:string; origin:Vector; velocity:Vector;
       angles:Vector; avelocity:Vector; movetype:number;
       EFlags:number; groundentity:number; flags:number;
       [..lots more]: any }` (or use a class)
     - `interface Vector { x:number; y:number; z:number }`
     - `interface TraceResult { /* … */ }`
     - `declare function STRING(p:any):string;` (rough)
     - `declare function ApplyMultiDamage(pevInflictor:entvars_t,
         pevVictim:entvars_t):void;`
     - `declare function ClearMultiDamage():void;`
     - `declare function UTIL_GetGlobalTrace():TraceResult;`
     - `declare function UTIL_SetOrigin(pev:entvars_t, v:Vector):void;`
     - `declare function UTIL_VecToAngles(v:Vector):Vector;`
     - `declare function EMIT_SOUND_DYN(edict:Edict, channel:number,
         sample:string, vol:number, attn:number, flags:number,
         pitch:number, pitchOffset:number):void;`
     - `declare const globals:{ time:number }`
     - `declare const g_engfuncs:{ vfunc_0x168?:number;
       vfunc_0x54?:number; … }`
   Decide whether `pev` is `[k:number]:any` (numeric-offset access)
   or a class with named fields, and stick to it. Mixing
   `pev.classname` with `pev[0x118]` is the worst of both worlds.

Other observations (not blocking, just notes for D.4 / D.5):

- 0x108 (movetype) = 5 is `MOVETYPE_FLY_BOUNCE` in HLSDK;
  0x10c = `EFL_*` and being cleared to 0 likely drops
  `EFL_IS_BEING_LIFTED_BY_BARNACLE` or similar — the TS comments
  "clear a flag, and set a counter" are vague.
- The vector copy at 6c54c–6c57a writes both `velocity` (offset
  0x20) and `avelocity` (offset 0x5c) of pOther from the same
  global at `[ebx+0x1888]`. That's a fixed-vector replay common
  in TS terrain shrapnel; flag the global name and don't leave
  it as `PLACEHOLDER_FIXED_VEC`.
- 0x208 (used as the pitch index) is `pev->modelindex`
  adjacent in HLSDK entvars_t, but it's actually being read as an
  integer here for the `GetSoundPitch` helper. Wire it through
  the helper, don't introduce a stub `engineGetSoundPitch` that
  silently re-interprets the byte.
- `[esp+0x4c]` and `[esp+0x40]` (6c317 / 6c31c) are the trace
  and direction buffers; the TS hardcodes "0" in the damage arg
  and a name for `0x1004` bitsDamageType (which the TS names
  "DMG_BLAST | DMG_SLASH?"). That TODO is reasonable to keep,
  but it should be one TODO per magic number, not pooled.

Suggested rewrite (decompile-faithful, addressing §1–§7; field
names with `// TODO` where asm-ambiguous):

```typescript
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
```

Key deltas from the original decompile:

- The fcomp branch is fixed (§1). `isBrushSurface = pev[0x16c] === SURFACE_FLAG` (was `!== 0`).
- The damage-path velocity reversal writes to `pOther.pev.velocity` (§2).
- The TraceAttack damage arg is now `DAMAGE_INFO` (the global from `[ebx-0x6e7f4]`) instead of `0` (§3).
- The ownership gate is preserved as an explicit TODO with both possible reads noted (§4).
- The two brush fall-throughs are merged into a 3-way branch (embed / generic / damage) reflecting the asm's OR semantics (§5).
- The bounce/embed/think globals are named once and reused instead of `// TODO = 1.0` repeated (§6).
- All the dependent types are declared locally so the file compiles in isolation (§7).

What's still asm-ambiguous and intentionally left TODO:

- `pev[0x16c]` and the four float constants at `[ebx-(0x6f408|0x6df74|0x6df78|0x6ecd0)]` (verify against the .rodata of `ts_i386.so`).
- `BRUSH_A` / `BRUSH_B` strings — `worldspawn` / `func_wall` are the strongest TS candidates; confirm via `strings-n5.txt`.
- `EMBED_VEL` (gravity-ish vector at `[ebx+0x1888]`).
- The exact field names `m_pFunction`, `m_iMode`, `m_flNextThink` for offsets 0xc/0x10/0x88 on `CTSShrapnel`.
- Which object (`pOther` vs `this`) carries `m_pOwner` at offset 0x8c; see §4.
- The behavior of both velocity AND avelocity being assigned the same vector in the brush-embed path — the asm literally writes both, but the original C probably doesn't. Capture in §6 of the rewrite.

If §1, §2, and §3 are addressed and the type declarations in §7 are kept, this crosses from FAIL to PASS-WITH-NOTES; resolving §4–§6 would take it to PASS. The original body has good structure but at least three runtime-affecting errors and several placeholder-name smells.
```
