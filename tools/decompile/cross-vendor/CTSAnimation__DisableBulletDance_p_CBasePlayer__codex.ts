```typescript
/**
 * CTSAnimation::DisableBulletDance — clear the three bullet-dance state
 * fields on the given player so the bullet-dance animation stops.
 *
 * @param this     The CTSAnimation instance (unused — this method does
 *                 not touch its own state, only the player's)
 * @param pPlayer  The player whose bullet-dance state should be cleared
 * @returns        void
 */
export function DisableBulletDance(
  this: CTSAnimation,
  pPlayer: CBasePlayer,
): void {
  // The three DWORDs at these offsets live in the player's TS extension
  // and together describe an active bullet-dance: a timer (when it
  // started / when it ends), the weapon being danced, and an ammo or
  // shot counter. All three are zeroed here so the dance stops cleanly.
  // TODO(asm-ambiguous): exact field names and types of 0x1dc, 0x1e0,
  // 0x1e4 are not visible from this chunk alone — EnableBulletDance and
  // BulletDance (sibling methods in this class) almost certainly reveal
  // them; until those are decompiled we treat them as opaque DWORDs.
  (pPlayer as unknown as Record<number, number>)[0x1dc] = 0;
  (pPlayer as unknown as Record<number, number>)[0x1e0] = 0;
  (pPlayer as unknown as Record<number, number>)[0x1e4] = 0;
}
```
