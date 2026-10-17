```typescript
/**
 * CTSBigPistolWeapon::RandomBigPistol — picks a random big pistol weapon variant.
 *
 * Rolls an integer in [1, 3] via the engine API and maps the result to one
 * of three weapon identifiers using a switch:
 *   roll == 2 → 0x1f
 *   roll == 3 → 0x24
 *   otherwise → 0xc  (covers rolls of 0, 1, and any value > 3)
 *
 * @returns A small integer identifying the chosen weapon variant.
 */
export function RandomBigPistol(this: CTSBigPistolWeapon): number {
  // RandomLong(1, 3) via the engine functions table.
  // The PIC load [ebx + 0x1aa8] fetches the engine globals pointer, and
  // [eax + 0x168] is the pfnRandomLong slot in its vtable.
  const roll: number = engineApi.RandomLong(1, 3);

  switch (roll) {
    case 2:
      return 0x1f;
    case 3:
      return 0x24;
    default:
      return 0xc;
  }
}
```
