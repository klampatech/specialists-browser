/**
 * CTSGun::GetBetterWeapon — auto-switches to the next-best weapon the
 * player owns, skipping the weapon they currently hold. Walks a global
 * priority-ordered list of 38 weapon IDs (indices 0..0x25 inclusive);
 * if no better weapon is found, falls back to the last entry in the
 * list. On a successful SelectWeapon, fires a post-select indirect call
 * on a related object.
 *
 * @param this          The CTSGun entity (player) instance — typed as
 *                      `any` until the class is reconstructed (D.4).
 * @param currentWeapon The weapon id currently equipped (to skip).
 * @returns             void
 */
// TODO: replace `any` with `CTSGun` once the class is reconstructed (D.4).
export function GetBetterWeapon(
  this:          any,
  currentWeapon: number,
): void {
  // Global pointer at GOT+0x1cf0 → int[38] of weapon IDs in auto-switch
  // priority order.
  // TODO: declare g_weaponOrder properly (it's a global int[38]).
  const weaponOrder: readonly number[] = (globalThis as any).g_weaponOrder;

  // Walk the priority list. The first weapon that is both owned by the
  // player and not equal to currentWeapon is selected. If no match is
  // found, weaponId ends up as weaponOrder[0x25] (last entry, used as
  // fallback).
  //
  // Layout: this->weapons[] starts at this+0x114; each entry is 56 bytes
  // (edx*7*8 == edx*56 indexes by weapon id). The first byte of each
  // entry is the "owned" flag — nonzero means the player has it.
  // TODO: declare CTSGun.weapons with proper layout (offset 0x114,
  // 56-byte entries; first byte = owned flag).
  let weaponId = 0;
  for (let i = 0; i <= 0x25; i++) {
    weaponId = weaponOrder[i];
    const owned = this.weapons[weaponId].owned;
    if (owned !== 0 && weaponId !== currentWeapon) {
      break;
    }
  }

  // SelectWeapon(this, weaponId, /*force=*/false).
  // TODO: declare SelectWeapon properly
  //   (signature: CTSGun::SelectWeapon(tsweapon_t, bool) → bool).
  const SelectWeapon = (globalThis as any).SelectWeapon as (
    this: any,
    weaponId: number,
    force: boolean,
  ) => boolean;
  if (SelectWeapon.call(this, weaponId, false)) {
    // Post-select: read pointer at this+0x60, then call the function
    // pointer stored at offset 0x128 of that object. `this` is pushed
    // as the explicit first argument.
    //
    // TODO(asm-ambiguous): the semantics of this hook are not visible
    // from the disassembly alone. Could be a vtable call on the active
    // weapon (Deploy?), a stored member-function pointer, or an engine
    // notification. Cross-reference with sibling methods (AddItem,
    // DropWeapon, etc.) to identify the target.
    const obj: any = this[0x60];
    const func: (self: any) => void = obj[0x128];
    func(this);
  }
}