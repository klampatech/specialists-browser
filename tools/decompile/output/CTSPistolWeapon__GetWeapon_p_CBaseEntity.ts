// Minimal placeholder types so this snippet compiles in isolation.
// In the real build these come from the project's class model.
type CBaseEntity = any;
interface CTSPistolWeapon {
  pev: any;
  m_pOwner: any;
  m_iWeapon: number;
}
declare const CTSGroundWeapon_GetWeapon: (a: any, b: any) => void;
declare const get_weapon_info: (id: number) => any;
declare const engineDispatch: { vtable: ((...args: any[]) => any)[] };

/**
 * CTSPistolWeapon::GetWeapon — pistol pickup for `pEntity`.
 * Demangled: `CTSPistolWeapon::GetWeapon(p CBaseEntity)`
 * Raw symbol: `GetWeapon__15CTSPistolWeaponP11CBaseEntity`
 * Address:    0x000b9b18  (size: 138 B)
 * Convention: cdecl; `this` is the first stack arg at [esp+0x20].
 */
export function GetWeapon(
  this: CTSPistolWeapon,
  pEntity: CBaseEntity,
): void {
  // (1) Early-exit if this weapon is already marked for removal.
  //     [ebp+0] = this; [this+0] = this->pev; [pev+0x118] is the byte
  //     that maps to entvars_t.deadflag. The asm is a byte compare
  //     (`cmp BYTE PTR [eax+0x118], 0; js 0xb9b9a`); TS compares the
  //     full int — equivalent in practice.
  if (this.pev.deadflag < 0) {
    return;
  }

  // (2) Delegate the actual pickup to the parent ground-weapon handler.
  CTSGroundWeapon_GetWeapon(this, pEntity);

  // (3) If deadflag became negative during the parent call, ask the owner
  //     to refresh its cached weapon id and store it on this weapon.
  //     [this+0x60] = m_pOwner; [m_pOwner+0x11c] = vtable[0x47] (TODO).
  //     The owner's return value lands at [this+0xa4] = m_iWeapon.
  if (this.pev.deadflag < 0) {
    const newWeaponId = this.m_pOwner.vtable[0x47](this);
    this.m_iWeapon = newWeaponId;
  }

  // (4) Update the engine's per-player HUD with the new weapon's display
  //     name. [pev+0x208] is a TS-specific per-pev field used as the
  //     player handle (TODO: name it). get_weapon_info's display-name
  //     string sits at byte-offset 0x1f2. [data+0x1aa8] is a global
  //     dispatch table; vtable[2] (`[esi+0x8]`) is the engine entry
  //     we want (TODO: name it).
  const playerHandle: any = this.pev.field_0x208;
  const weaponName: any = get_weapon_info(this.m_iWeapon) + 0x1f2;
  engineDispatch.vtable[2](playerHandle, weaponName);
}
