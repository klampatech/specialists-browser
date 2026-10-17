// `this: any` and the stubs below keep this file compilable in
// isolation. Replace `any` with the real types once CTSPistolAmmo /
// ammo_info_t are defined (D.4).
declare class CTSGroundAmmo {
  static Spawn: (this: CTSPistolAmmo) => void;
}
declare type CTSPistolAmmo = any;
declare function getAmmoInfo(index: number): any;

/**
 * CTSPistolAmmo::Spawn — initializes a pistol ammo pickup. Calls
 * the base class CTSGroundAmmo::Spawn, then fills five ammo-count
 * fields with half the default amount of five ammo types the TS
 * pistol can use.
 *
 * Asm note: each ammo amount is halved via the C-style "add sign
 * bit, then arithmetic-shift-right-by-1" idiom. For the
 * always-non-negative ammo domain this equals x/2, so `>> 1` is
 * the faithful TS equivalent.
 */
export function Spawn(this: CTSPistolAmmo): void {
  // Base class init first.
  CTSGroundAmmo.Spawn.call(this as any);

  // TODO(asm-ambiguous): ammo index → ammo-type name mapping
  //   (1=9mm, 2=.357, 7/9/0xa = TS pistol alt-mode ammo types).
  // TODO(asm-ambiguous): the ammo_info_t field at +0xc is the
  //   default/cap amount — actual name (m_iDefaultAmount vs
  //   m_iMaxCarry etc.) needs the ammo_info_t layout (D.4).
  // TODO(asm-ambiguous): +0x6c/+0x70/+0x84/+0x8c/+0x90 are five
  //   distinct ammo-count fields on `this`; which maps to which
  //   ammo type depends on the CTSPistolAmmo class layout (D.4).
  const t = this as any;
  t.m_iAmmoCount_1  = getAmmoInfo(0x1).ammoAmount >> 1;  // +0x6c
  t.m_iAmmoCount_2  = getAmmoInfo(0x2).ammoAmount >> 1;  // +0x70
  t.m_iAmmoCount_7  = getAmmoInfo(0x7).ammoAmount >> 1;  // +0x84
  t.m_iAmmoCount_9  = getAmmoInfo(0x9).ammoAmount >> 1;  // +0x8c
  t.m_iAmmoCount_10 = getAmmoInfo(0xa).ammoAmount >> 1;  // +0x90
}
