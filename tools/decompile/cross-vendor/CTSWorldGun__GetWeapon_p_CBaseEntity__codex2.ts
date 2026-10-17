/**
 * CTSWorldGun::GetWeapon — pickup handler for a world-spawned weapon.
 *
 * Demangled: CTSWorldGunP11CBaseEntity::GetWeapon(p CBaseEntity)
 * Address:   0x00091198 (183 bytes)
 *
 * Disassembly faithful: sticky-claim flag at offset 0xd4; two vtable
 * predicates on pOther through its vtable at offset 0x60 (offsets
 * 0xc8 and 0xb4, semantics unknown); vtable-relative "relationship"
 * byte at vtable+0x118 must be non-negative for both toucher and
 * self; on success the gun is marked claimed, removed from the
 * slow-mo array, and deleted.
 */
export function GetWeapon(this: any, pOther: any): void {
  // ── already claimed? bail to the epilogue
  if ((this[0xd4] as number) !== 0) return;

  // ── two vtable calls through pOther's vtable at offset 0x60
  // TODO(asm-ambiguous): semantics of vtable[0xc8] / vtable[0xb4] unknown  const v1 = (pOther[0x60] as any)[0xc8](pOther);
  if (v1 === 0) return;
  const v2 = (pOther[0x60] as any)[0xb4](pOther);
  if (v2 === 0) return;

  // ── relationship byte at vtable+0x118 on both entities (sign bit)
  const pOtherRel = (pOther[0] as any)[0x118];
  if (pOtherRel < 0) return;
  const selfRel = (this[0] as any)[0x118];
  if (selfRel < 0) return;

  // ── PickUpWeapon(this, weaponId, &ammoBuf, 0, setne(weaponId!=0x1d), T4=0)
  // arg order from the asm (push order): this, weaponId, &ammoBuf, 0, ax, T4=0
  const weaponId = this[0x88] as number;
  const ammoBuf  = this[0x8c];                  // passed by reference (lea)
  const flagA    = weaponId !== 0x1d ? 1 : 0;   // setne semantics
  const flagB    = 0;                           // T4 word = 0

  const pickedUp = pOther.PickUpWeapon(
    weaponId, ammoBuf, 0, flagA, flagB,
  );
  if (pickedUp === 0) return;

  // ── success path: claim, drop from slow-mo array, then UTIL_Remove
  this[0xd4] = 1;
  RemoveEntityFromSlowedArray(this);
  UTIL_Remove(this);
}

// external symbols (defined elsewhere in the project)
declare function RemoveEntityFromSlowedArray(pEnt: any): void;
declare function UTIL_Remove(pEnt: any): void;
