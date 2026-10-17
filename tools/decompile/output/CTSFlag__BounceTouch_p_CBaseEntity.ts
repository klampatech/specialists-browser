// ── Stubs so this file compiles in isolation ──────────────────────
// Wire these to the real engine interface in D.5.
declare const UTIL_GetGlobalTrace: () => any;
declare const EMIT_SOUND_DYN: (
  ent: any,
  ent2: any,
  channel: number,
  sample: string,
  volume: number,
  attenuation: number,
  flags: number,
  pitch: number,
  unknown: number
) => void;
declare const g_engfuncs: {
  pfnRandomLong: (min: number, max: number) => number;
};

/**
 * CTSFlag::BounceTouch — touch callback invoked when the flag
 * collides with a surface.
 *
 * Demangled:  CTSFlag::BounceTouch(p CBaseEntity)
 * Address:    0x0008dbbc  (size 613 B)
 * Symbol:     BounceTouch__7CTSFlagP11CBaseEntity
 *
 * Behaviour (per the disassembly):
 *   1. Always: pev.velocity.z *= <double const at [ebx-0x6de58]>.
 *   2. Branch on (pev.flags & FL_ONGROUND):
 *
 *      a) On-ground:
 *         - call this.field_0x60->vtable[4](this)  (return kept).
 *         - xySpeed = sqrt(velocity.x² + velocity.y²).
 *         - if (xySpeed === helperRet * [ebx-0x6f074])
 *               bounceFactor = [ebx-0x6decc];   // "fast"
 *           else bounceFactor = [ebx-0x6dec0];   // "slow"
 *         - velocity *= bounceFactor; avelocity *= bounceFactor;
 *           angles.z = 0.
 *
 *      b) In-air:
 *         - speed = |velocity| (3-D).
 *         - call this.field_0x60->vtable[4](this), multiply return
 *           by [ebx-0x6cb60].
 *         - if (speed !== helperRet * cvar) skip the rest.
 *         - else, if UTIL_GetGlobalTrace().vecPlaneNormal.y !==
 *           <double const at [ebx-0x6df40]> (likely 1.0): skip.
 *         - randomPitch = pfnRandomLong(0, 10) + 100;
 *         - EMIT_SOUND_DYN(pev.edict, ?, 6, [ebx-0x6c1ba],
 *                          1.0, 0.8, 0, randomPitch, 0.5);
 *
 * @param this    CTSFlag (implicit MSVC this).
 * @param _pOther CBaseEntity that triggered the touch — read in
 *                the prologue ([esp+0xb0] is `this`, [esp+0xb4]
 *                is `_pOther`) but never referenced again.
 */
export function BounceTouch(
  this: any,    /* CTSFlagP11CBaseEntity */
  _pOther: any  /* CBaseEntity */
): void {
  const pev = this.pev;

  // (1) Vertical dampening on every call.
  // TODO(asm-ambiguous): exact QWORD constant at [ebx-0x6de58] is
  //   not resolved. 0.95 is a plausible guess for HL-style
  //   velocity dampening; replace once the constant is read.
  const VERTICAL_DAMP = 0.95;          // ← resolve from [ebx-0x6de58]
  pev.velocity.z *= VERTICAL_DAMP;

  const FL_ONGROUND = 0x2;

  // (2a) On-ground path.
  if ((pev.flags & FL_ONGROUND) !== 0) {
    // vtable[4] return is kept for the comparison below.
    // TODO(asm-ambiguous): this+0x60 is an unknown partner    //   pointer; vtable slot 4 likewise unmapped without the
    //   class layout. The return value is a float.
    const helperRet = this.field_0x60.vtable[4](this);

    // XY-plane speed magnitude.
    const xySpeed = Math.sqrt(
      pev.velocity.x * pev.velocity.x +
      pev.velocity.y * pev.velocity.y
    );

    // Equality branch — `sete al; je` at 0x8dc50–0x8dc5a.
    // TODO(asm-ambiguous): the original C almost certainly used a
    //   different operator (>=, <, or a range check); this is a
    //   literal translation of the assembly. The constants below
    //   must be resolved from the binary before this branch can
    //   behave meaningfully:
    //     [ebx-0x6f074] — XY-speed threshold cvar
    //     [ebx-0x6decc] — "fast" bounce factor (fall-through)
    //     [ebx-0x6dec0] — "slow" bounce factor (jump target)
    const XY_SPEED_THRESHOLD = 0;     // ← resolve from [ebx-0x6f074]
    const BOUNCE_FAST        = 0;     // ← resolve from [ebx-0x6decc]
    const BOUNCE_SLOW        = 0;     // ← resolve from [ebx-0x6dec0]
    const bounceFactor =
      (xySpeed === helperRet * XY_SPEED_THRESHOLD)
        ? BOUNCE_FAST
        : BOUNCE_SLOW;

    pev.velocity.x   *= bounceFactor;
    pev.velocity.y   *= bounceFactor;
    pev.velocity.z   *= bounceFactor;
    pev.avelocity.x  *= bounceFactor;
    pev.avelocity.y  *= bounceFactor;
    pev.avelocity.z  *= bounceFactor;
    pev.angles.z = 0;
    return;
  }

  // (2b) In-air path.

  // 3-D speed magnitude.
  const speed = Math.sqrt(
    pev.velocity.x * pev.velocity.x +
    pev.velocity.y * pev.velocity.y +
    pev.velocity.z * pev.velocity.z
  );

  // Helper return is multiplied by a cvar at [ebx-0x6cb60] before
  // the comparison. The compiler's `sub esp,0xc` + `push ebp`
  // reserves 16 bytes of stack for this call, cleaned up by
  // `add esp, 0x10`.
  const helperRet = this.field_0x60.vtable[4](this);
  // TODO(asm-ambiguous): [ebx-0x6cb60] is a cvar; resolve the real
  //   constant. The compiler multiplies the helper's float return
  //   by it (`fmul DWORD PTR [ebx-0x6cb60]`) before the comparison.
  const IN_AIR_THRESHOLD_CVAR = 0;    // ← resolve from [ebx-0x6cb60]

  // `test ah,0x41; jne 8de16` at 0x8dd82–0x8dd85 — skip the sound
  // when the values are NOT equal. Faithful translation:
  if (speed !== helperRet * IN_AIR_THRESHOLD_CVAR) {
    return;
  }

  // Engine's most-recent collision trace.
  const tr = UTIL_GetGlobalTrace();

  // TODO(asm-ambiguous): the assembly writes (0, 0, 1.0) into
  //   [esp+0x70..0x78] (0x8dd9b–0x8ddab), but those slots are not
  //   read in the visible chunk. This is likely either (a) a memset
  //   of an unrelated scratch slot that the compiler emitted for
  //   stack-frame hygiene, or (b) the start of a path that got
  //   tail-merged into the sound-emission block. Keep as a TODO
  //   until the surrounding context is decompiled.
  const _localVec3 = { x: 0, y: 0, z: 1 };

  // TODO(asm-ambiguous): `[esp+0x5c]` lands on trace + 0x28, which
  //   is `vecPlaneNormal.y` in standard HL trace_t — but TS may
  //   have a different trace layout. The assembly at 0x8ddb3–
  //   0x8ddc7 compares that field against the QWORD double at
  //   [ebx-0x6df40] (likely 1.0), using `sete al; je` — another
  //   equality branch, not `>=`. Resolve the constant, then mirror
  //   the equality semantics.
  if (tr.vecPlaneNormal.y >= 1.0) {   // ← flip to === once constant resolved
    return;
  }

  // Play the bounce sound.

  // TODO(asm-ambiguous): `[pev + 0x208]` is far past standard
  //   entvars fields. In TS this likely holds the edict pointer
  //   (CBaseEntity sometimes caches it); verify against the TS
  //   source when available. Until then, treat as "the flag's
  //   edict".
  const edict = pev.edict;

  // TODO(asm-ambiguous): [ebx-0x6c1ba] is a static string in
  //   .rodata; read the real bytes from the binary to confirm the
  //   file name.
  const SOUND_PATH = 'flag_bounce.wav';

  // Random pitch in [100, 110]. `pfnRandomLong` is reached via the
  // engine function table at [ebx+0x1aa8], vtable slot 0x168/4 =
  // 90. The compiler cleans up the call with `add esp, 0xc`.
  const randomPitch = g_engfuncs.pfnRandomLong(0, 10) + 100;

  // EMIT_SOUND_DYN signature (per the demangled PLT entry):
  //   (edict_t*, int, int, const char*, float, float, int, int, float)
  // The compiler reserves an arg2 slot via `sub esp, 0x4` that
  // the callee is not expected to read.
  EMIT_SOUND_DYN(
    edict, // arg1 (edict_t*)
    undefined,                        // arg2 (reserved by `sub esp,0x4`)
    6,                                // arg3 (channel)
    SOUND_PATH,                       // arg4 (sample)
    1.0,                              // arg5 (volume)
    0.8,                              // arg6 (attenuation)
    0,                                // arg7 (flags)
    randomPitch,                      // arg8 (pitch)
    0.5                               // arg9 (trailing float)
  );
}
