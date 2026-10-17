/**
 * CTSAnimation::IsInCloseCombat — checks whether a given weapon ID belongs
 * to the close-combat weapon set.
 *
 * The close-combat set is the special-case ID 58 plus the inclusive integer
 * range [10, 39]. The compiler folds the range check into a single unsigned
 * compare of `weaponId - 10 <= 29`, preceded by a fast-path early return
 * for the special ID.
 *
 * @param this       The CTSAnimation entity instance (this in the original C++)
 * @param weaponId   Weapon ID to test
 * @returns          1 if weaponId is a close-combat weapon, 0 otherwise
 */
export function IsInCloseCombat(this: any, weaponId: number): number {
  if (weaponId === 58) {
    return 1;
  }
  // Unsigned range check (asm: lea edx,[eax-0xa]; cmp edx,0x1d; setbe al)
  // i.e. (weaponId - 10) fits in [0, 29] when read as unsigned.
  return weaponId >= 10 && weaponId <= 39 ? 1 : 0;
}
