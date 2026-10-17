/**
 * CTSRifleAmmo::Spawn — initialize the rifle-ammo pickup entity.
 *
 * 1. Delegate to the parent CTSGroundAmmo::Spawn for shared ground-ammo
 *    setup (model, bbox, sounds, ...).
 * 2. this+0x80 = trunc( get_ammo_info(6).maxCarry / 2 )
 * 3. this+0x78 = trunc( get_ammo_info(4).maxCarry / 2 )
 *
 * Field offsets (0x80, 0x78) come straight from the disassembly
 * (`[esi+0x80]`, `[esi+0x78]`). The named fields are placeholders
 * pending the D.4 CTSRifleAmmo layout dump.
 */
export function Spawn(this: any): void {
  // Parent class does shared ground-ammo setup.
  (CTSGroundAmmo as any).Spawn.call(this);

  // MSVC emits ((x>>31) + x) >> 1 for signed div-by-2 with truncation
  // toward zero. In TS that is Math.trunc(x / 2). Both bucket writes
  // below use this pattern.
  // TODO(asm-ambiguous): confirm which TS ammo-enum values 4 and 6 map
  //   to (likely the rifle and a secondary bucket) once D.4 lands.

  const ammo6 = (getAmmoInfo as any)(6);
  (this as any).m_iGiveAmount_at0x80 = Math.trunc(ammo6.maxCarry / 2);

  const ammo4 = (getAmmoInfo as any)(4);
  (this as any).m_iGiveAmount_at0x78 = Math.trunc(ammo4.maxCarry / 2);
}
