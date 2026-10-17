declare const WHEEL_SRC_VEC: any;       // global vec3 at [GOT+0x1888]
declare const GLOBAL_GRAVITY: number;   // global float at [GOT-0x6deb0]
declare const WHEEL_SOUND: any;         // global string at [GOT-0x6c364]
declare function GetDirection(a: any, b: any, c: number, d: number): number;
declare function vtableCall(...args: any[]): number;
declare function EMIT_SOUND_DYN(...args: any[]): void;

/**
 * CTSStunt::HandleWheel — Apply wheel-stunt state transition.
 *
 * Gate: bail if `[obj+0x1a5]` bit 0x2 is unset. Then branches on
 * `[obj+0x250]` bit 0x400. Both branches end in a common epilogue
 * that sets `[obj+0x11c] = 1.0`, fetches `edict` from
 * `[obj+0x208]`, invokes a vtable call at `[GOT+0x1aa8]+0x168`,
 * then plays a sound via EMIT_SOUND_DYN.
 *
 * Note on object naming: the asm does `[m_pPlayer][0]+offset`
 * for every field access. HLSDK puts `pev` as the first member of
 * CBaseEntity, so the conventional reading is `pev`. However,
 * offsets 0x1a5, 0x250, 0x208 exceed the standard entvars_t
 * (~0x140 bytes). Treat these as `dword_<offset>` style unknowns
 * until D.4 (TS-specific gameplay) cross-references them with the
 * TS mod's own struct layout.
 */
export function HandleWheel(this: CTSStunt): void {
  const m_pPlayer: any = (this as any).m_pPlayer;
  const pev: any = m_pPlayer.pev;

  // Gate: pev+0x1a5 bit 0x2.
  // TODO(asm-ambiguous): exact meaning of this byte flag.
  if ((pev.byte_0x1a5 & 0x2) === 0) return;

  if ((pev.dword_0x250 & 0x400) !== 0) {
    // --- Branch A: bit 0x400 was set ---
    pev.dword_0x250 = (pev.dword_0x250 & ~0x400) | 0x1;
    pev.float_0x120 = 0.25;                  // 0x3e800000
    pev.vec3_0x174 = WHEEL_SRC_VEC;          // [GOT+0x1888], 3 dwords
    (this as any).m_flWheelTimer = 0.375;    // [this]+0x4 = 0x3ec00000
  } else {
    // --- Branch B: bit 0x400 was unset ---
    pev.dword_0x250 = (pev.dword_0x250 & ~0x800) | 0x20;
    pev.vec3_0x174 = WHEEL_SRC_VEC;

    // FPU: this->vec3_0x20 = GLOBAL_GRAVITY * this->vec3_0x20
    // (in 32-bit FP register order: x, y, z).
    const v: any = (this as any).vec3_0x20;
    const scaled: any = {
      x: v.x * GLOBAL_GRAVITY,
      y: v.y * GLOBAL_GRAVITY,
      z: v.z * GLOBAL_GRAVITY,
    };
    (this as any).vec3_0x20 = scaled;

    // GetDirection(scaledVec, idealVec, 0.6, 0.3) → int (compared to 2).
    // The asm passes pointers-to-stack-slot; TS passes by-value vec3.
    // Equivalent for a Vector-typed callee.
    const idealVec: any = {
      x: pev.float_0x74,
      y: pev.float_0x78,
      z: pev.float_0x7c,
    };
    // TODO(asm-ambiguous): pev+0x74..0x80 doesn't map cleanly to a
    // standard entvars_t vec3 grouping (likely idealpitch /
    // pitch_speed / ideal_yaw but verify).
    const result: number = GetDirection(scaled, idealVec, 0.6, 0.3);

    (this as any).m_bWheelFlip = (result !== 2) ? 1 : 0; // [this]+0x2c byte
    m_pPlayer.dword_0x2a0 = result;                     // [m_pPlayer]+0x2a0
  }

  // --- Common epilogue ---
  pev.float_0x11c = 1.0;                               // 0x3f800000
  const edict: number = pev.dword_0x208;               // [obj]+0x208

  // Vtable call at [GOT+0x1aa8]+0x168.
  // ASM stack at call time:
  //   [esp+0x00] = 0            (push)
  //   [esp+0x04] = 0x1f         (push)
  //   [esp+0x08] = ???          (sub esp,4 slot, uninitialized)
  //   [esp+0x0c] = 0.5          (push 0x3f000000, before the sub)
  //   edict is saved at [obj]+0xc and read back later for
  //   EMIT_SOUND_DYN — it is NOT passed to this vtable call.
  // TODO(asm-ambiguous): exact vtable function signature unknown.
  // Using the 3 explicit pushes; edict removed from this call.
  const weaponBase: number = vtableCall(0, 0x1f, 0.5);
  const weaponId: number = weaponBase + 0x5f;

  // EMIT_SOUND_DYN: 7 args in HLSDK, 7 pushes in the asm. The TS
  // previously added an 8th `0` and a 9th `0.5` not present in
  // the disassembly — dropped here.
  EMIT_SOUND_DYN(
    edict,         // 1: entity
    4,             // 2: channel
    WHEEL_SOUND,   // 3: sample path [GOT-0x6c364]
    1.0,           // 4: volume
    0.8,           // 5: attenuation
    0,             // 6: fFlags
    weaponId,      // 7: pitch (weapon-id-derived)
  );
}
