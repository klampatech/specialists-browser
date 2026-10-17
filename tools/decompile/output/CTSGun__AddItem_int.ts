/**
 * CTSGun::AddItem — register a weapon item into the player's inventory
 * and trigger a weapon reselection. Returns 1 on success, 0 on rejection
 * (no weapon list, filter failed, or already owned).
 *
 * Original: `AddItem__6CTSGuni`  (CTSGun::AddItem(int))
 *
 * @param this  The CTSGun player entity
 * @param item  Weapon item bitmask (slot + id encoded together)
 * @returns     1 on success, 0 on rejection
 */
export function AddItem(this: CTSGun, item: number): number {
  // Guard: must have a weapon list to add into
  if (this.weaponList === 0) return 0;

  const active = this.activeItem;

  // Filter checks against the active weapon and the list itself:
  //   1) item must include the "required" bits from active
  //   2) item must NOT include the "forbidden" bits from active
  //   3) item must not already be marked owned in the list
  if ((item & active.requiredBits) === 0) return 0;
  if ((item & active.forbiddenBits) !== 0) return 0;
  if ((item & this.weaponList.ownedFlags) !== 0) return 0;

  // Mark the item as owned in the list
  this.weaponList.ownedFlags |= item;

  const previousWeaponId = this.selectedWeapon;

  // Akimbo bookkeeping: also tag the item into the matching weapon slot
  // so the akimbo partner weapon picks it up on next deploy.
  if (IsWeaponAkimbo(previousWeaponId)) {
    // TODO(asm-ambiguous): no -1 guard on active.akimboIndex here; element stride is 56 bytes
    this.weaponSlots[active.akimboIndex].itemFlags |= item;
  } else if (active.weaponIndex !== -1) {
    const slot = this.weaponSlots[active.weaponIndex];
    if (slot.akimboFlag !== 0) {
      slot.itemFlags |= item;
    }
  }

  // Force a weapon reselection: stash old id, clear current, SelectWeapon
  this.selectedWeapon = 0;
  if (SelectWeapon(this, previousWeaponId, false) !== 0) {
    // Virtual call at vtable+0x128 — likely the player's deploy handler
    // TODO(asm-ambiguous): method identity not resolved from chunk
    this.vtable[0x128](this);
  }

  return 1;
}

// Minimal stubs so this file compiles in isolation — replace with the
// real declarations / imports when wiring into the rest of the project.
declare type CTSGun = any;
declare function IsWeaponAkimbo(weaponId: number): boolean;
declare function SelectWeapon(
  self: CTSGun,
  weaponId: number,
  force: boolean,
): number;