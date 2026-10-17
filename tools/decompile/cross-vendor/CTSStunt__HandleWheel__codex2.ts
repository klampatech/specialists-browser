// Engine-callback placeholders. TODO(engine-callback): wire to real engine.
declare const WHEEL_SRC_VEC: any;       // global vec3 at [GOT+0x1888]
declare const GLOBAL_GRAVITY: number;   // global float at [GOT-0x6deb0]
declare const WHEEL_SOUND: any;         // global string at [GOT-0x6c364]
declare function GetDirection(a: any, b: any, c: number, d: number): number;
// vtableCall(obj, slot, ...args): cdecl. arg3 of the call is an
// uninitialized alignment slot from `sub esp, 0x4`.
declare function vtableCall(obj: any, slot: number, ...args: any[]): number;
// EMIT_SOUND_DYN: 8 args per the demangled signature.
// arg8 (origin_z_or_extra) is read from a stack leftover, NOT
// explicitly pushed.
declare function EMIT_SOUND_DYN(
  entity: any, channel: number, sample: any,
  volume: number, attenuation: number, flags: number,
  pitch: number, origin_z_or_extra: number,
): void;

/**
 * CTSStunt::HandleWheel — Apply the wheel-stunt state transition.
 *
 * Gate: bail if `pev+0x1a5` bit 0x2 is unset. Then two branches on
 * `pev+0x250` bit 0x400:
 *   - Set: clear that bit, OR in bit 0x1, write 0.25 to `pev+0x120`,
 *     copy a global source vec3 into `pev+0x174`, write 0.375 to
 *     `this+0x4`.
 *   - Unset: clear bit 0x800, OR in bit 0x20, copy the same source vec,
 *     scale `this+0x20` by a global gravity float, then call
 *     `GetDirection(&temp, &temp2, 0.6, 0.3)` where `&temp2` is read from
 *     `pev+0x74..0x80`. The result is stored as `(result !== 2)` at
 *     `this+0x2c` (byte) and the raw int at `m_pPlayer+0x2a0`.
 *
 * Both paths converge: set `pev+0x11c` to 1.0, invoke a vtable callback
 * at `[GOT+0x1aa8]+0x168` with cdecl args `(0, 0x1f, alignment-slot,
 * 0.5)` to derive a weapon-id-like int, then play a sound via
 * `EMIT_SOUND_DYN` with 8 args; arg8 = 0.5 is a stack leftover from the
 * vtable sub-prologue's first push, not an explicit push.
 *
 * Calling-convention note: this binary passes `this` on the stack at
 * [esp+0x70] (not in ECX).
 */
export function HandleWheel(this: CTSStunt): void {
  const m_pPlayer: any = (this as any).m_pPlayer;
  const pev: any = m_pPlayer.pev;

  // Gate: pev+0x1a5 bit 0x2.
  // TODO(asm-ambiguous): exact meaning of this byte flag.
  if ((pev.byte_0x1a5 & 0x2) === 0) return;

  if ((pev.dword_0x250 & 0x400) !== 0) {
    // --- Branch A: pev+0x250 bit 0x400 was set ---
    pev.dword_0x250 = (pev.dword_0x250 & ~0x400) | 0x1;
    pev.float_0x120 = 0.25;                  // 0x3e800000
    pev.vec3_0x174 = WHEEL_SRC_VEC;          // [GOT+0x1888]
    // TODO(field-name): "wheel timer" is a guess for [ebp+0x4].
    (this as any).float_0x4 = 0.375;         // [ebp+0x4] = 0x3ec00000
  } else {
    // --- Branch B: pev+0x250 bit 0x400 was unset ---
    pev.dword_0x250 = (pev.dword_0x250 & ~0x800) | 0x20;
    pev.vec3_0x174 = WHEEL_SRC_VEC;

    // temp = GLOBAL_GRAVITY * this->vec3_0x20
    const v: any = (this as any).vec3_0x20;
    (this as any).vec3_0x20 = {
      x: v.x * GLOBAL_GRAVITY,
      y: v.y * GLOBAL_GRAVITY,
      z: v.z * GLOBAL_GRAVITY,
    };
    // Read back into temp from this->vec3_0_20 (no-op semantically).
    const temp: any = { ...(this as any).vec3_0_20 };

    // TODO(asm-ambiguous): pev+0x74..0x80 doesn't map to a standard
    // entvars_t vec3 grouping (likely idealpitch/pitch_speed/ideal_yaw).
    const outVec: any = {
      x: pev.float_0x74,
      y: pev.float_0x78,
      z: pev.float_0x7c,
    };

    const result: number = GetDirection(temp, outVec, 0.6, 0.3);
    // TODO(field-name): "wheel flip" is a guess for [ebp+0x2c].
    (this as any).byte_0x2c = (result !== 2) ? 1 : 0;
    m_pPlayer.dword_0x2a0 = result;
  }

  // --- Common epilogue ---
  pev.float_0x11c = 1.0;                                  // 0x3f800000
  const edict: any = pev.dword_0x208;                     // [pev+0x208]

  // Vtable call: [GOT+0x1aa8]+0x168
  // cdecl args (low to high): 0, 0x1f, alignment_slot, 0.5.
  // The alignment slot is from `sub esp, 0x4` and is uninitialized.
  // TODO(asm-ambiguous): which vtable? which method?
  const weaponBase: number = vtableCall(
    /* obj */        undefined as any,
    /* slot */       0x168,
    0,                  // arg1
    0x1f,               // arg2
    undefined as any,   // arg3 — alignment slot (uninitialized)
    0.5,                // arg4
  );
  const weaponId: number = weaponBase + 0x5f;

  // EMIT_SOUND_DYN: 8 args per demangled signature.
  // arg8 (0.5) is the stack leftover from the vtable sub-prologue's
  // first push at [LOCAL_ESP − 4]; it is NOT explicitly pushed here.
  EMIT_SOUND_DYN(
    /* edict */       edict,
    /* channel */     4,
    /* sample */      WHEEL_SOUND,
    /* volume */      1.0,
    /* attenuation */ 0.8,
    /* flags */       0,
    /* pitch */       weaponId,
    /* extra */       0.5,                              // from vtable leftover
  );
}
