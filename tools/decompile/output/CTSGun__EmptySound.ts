/**
 * CTSGun::EmptySound — decompiled from ts/dlls/ts_i386.so @ 0x00071be4
 * (147 bytes).
 *
 * Plays the weapon's empty-magazine click and pushes the next primary
 * attack / weapon-idle / reload timers out. Early-outs when the
 * weapon-type field (offset +0xc8) equals 0x24 (likely a melee /
 * no-ammo tsweapon_t — TODO: cross-reference the TS source).
 *
 * NOTE — every field/global name below is a best-guess. None are
 * verified against TS source. Verify with tools/decompile/strings-n5.txt
 * + CTSGun struct dump before relying on them.
 */

// Stubs so this snippet compiles in isolation. Replace with the real
// declarations in the consuming module.
declare const SAMPLE_DRYFIRE: string;          // GOT+0x1888  — "weapons/dryfire.wav"?
declare const DRYFIRE_IDLE_DELAY: number;      // GOT-0x6ecd8 — double constant
declare const DRYFIRE_RELOAD_DELAY: number;    // GOT-0x6f010 — double constant
declare function UTIL_WeaponTimeBase(): number;
declare function emitSound12(
  entRef: number,   // edict ref from the player
  channel: number,  // WORD sound channel / event index
  sample: string,   // sample path (pushed twice in the disasm)
  entClass: number, // 1
): void;
declare function readField(obj: any, byteOffset: number): any;

export function EmptySound(this: any): void {
  // ---- Field offsets on `this` (CTSGun via CBasePlayerWeapon) ----
  //   +0x80  m_pPlayer            (pointer) — TODO name
  //   +0x9c  m_flNextPrimaryAttack (float) — HLSDK-standard
  //   +0xa0  m_flTimeWeaponIdle    (float)  — HLSDK-standard
  //   +0xa8  m_flReloadTime        (float)  — HLSDK-standard
  //   +0xc8  m_iWeaponType (?)     (int)    — TODO name
  //   +0x968 m_usSoundEvent (?)    (WORD)   — TODO name

  // ---- Early-out: no-op for weapon-type 0x24 ----
  // disasm: cmp [esi+0xc8], 0x24 / je +0x8d
  if (this.m_iWeaponType === 0x24) {
    return;
  }

  // ---- Emit the dry-fire sound ----
  // disasm pushes 12 args (right-to-left) and calls [GOT+0x1aa8]+0x1ec.
  // +0x1ec (index 123) is past standard HLSDK enginefuncs_t, so this is
  // likely a TS-side wrapper — NOT pfnEmitSound directly. TODO: confirm.
  const player: any = this.m_pPlayer;
  emitSound12(
    /* entRef   */ readField(player, 0x208), // disasm: [edx+0x208] — TODO meaning
    /* channel  */ this.m_usSoundEvent,       // disasm: WORD [esi+0x968] — TODO name
    /* sample   */ SAMPLE_DRYFIRE,            // disasm: [GOT+0x1888], pushed TWICE
    /* entClass */ 1,                         // disasm: leading 0x1
  );

  // ---- Schedule primary attack + weapon idle ----
  // disasm calls UTIL_WeaponTimeBase() HERE, then adds DRYFIRE_IDLE_DELAY,
  // then stores to [+0xa0] (fst — without pop) and [+0x9c] (fstp — with pop,
  // reusing the FPU value). Two stores, one fadd, one timebase call.
  const t1 = UTIL_WeaponTimeBase();
  this.m_flTimeWeaponIdle    = t1 + DRYFIRE_IDLE_DELAY; // [esi+0xa0] (fst first)
  this.m_flNextPrimaryAttack = t1 + DRYFIRE_IDLE_DELAY; // [esi+0x9c] (fstp)

  // ---- Schedule reload ----
  // disasm calls UTIL_WeaponTimeBase() AGAIN (separate call — NOT the
  // cached value from above), adds DRYFIRE_RELOAD_DELAY, stores to [+0xa8].
  const t2 = UTIL_WeaponTimeBase();
  this.m_flReloadTime = t2 + DRYFIRE_RELOAD_DELAY; // [esi+0xa8]
}
