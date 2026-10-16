```typescript
/**
 * CTSGun::Reset — wipe the CTSGun entity's transient runtime state.
 *
 * Selectively zeroes several member-field ranges plus a handful of
 * standalone fields (timers / counters / flags). Called when the
 * weapon's bookkeeping should be discarded without destroying the
 * entity — for example on deploy, on a mode switch, or when re-
 * entering an idle state.
 *
 * @param this  The CTSGun entity instance (this in the original C++)
 * @returns     void
 */
export function Reset(this: CTSGun): void {
  // Three dword fields at offsets 0xc8 / 0xcc / 0xd0 — likely a cluster
  // of timers or counters sitting just before the next zeroed region.
  // TODO: offset meaning unclear
  this.field_0xc8 = 0;
  this.field_0xcc = 0;
  this.field_0xd0 = 0;

  // Clear a 64-byte sub-struct at this+0xd4 (runs through 0x113).
  // TODO: offset meaning unclear — what sub-struct lives at this+0xd4?
  this.zeroMemory(0xd4, 0x40);

  // Clear a 2128-byte sub-struct at this+0x114 — by far the largest
  // block in this function. Given CTSGun's sizable combat methods
  // (CCombatAttack, AkimboFire, KatanaFire, KnifeFire, etc.) the size
  // is consistent with the bulk combat / sequence state of the weapon.
  // TODO: offset meaning unclear — what sub-struct lives at this+0x114?
  this.zeroMemory(0x114, 0x850);

  // A single-byte flag at this+0x97a. Note that a 22-byte gap
  // (0x964..0x979) between the previous block and this byte is left
  // untouched — those bytes are preserved, not zeroed.
  // TODO: offset meaning unclear
  this.flag_0x97a = 0;

  // Clear a 56-byte sub-struct at this+0x97c (runs through 0x9b3).
  // TODO: offset meaning unclear
  this.zeroMemory(0x97c, 0x38);

  // A dword at this+0x9b4, immediately after the previous block.
  // TODO: offset meaning unclear
  this.field_0x9b4 = 0;

  // Clear a 38-byte region at this+0x9b8 — compiled as 9 dwords
  // (rep stosd, 36 bytes) followed by a trailing 2-byte stosw, which
  // suggests the trailing field is a word (uint16 / int16 / enum).
  // TODO: offset meaning unclear
  this.zeroMemory(0x9b8, 0x24);
  this.zeroMemory(0x9dc, 0x2);

  // A final dword at this+0xa08. Note that a 0x28-byte gap
  // (0x9de..0xa07) between the previous block and this dword is
  // left untouched — those bytes are preserved, not zeroed.
  // TODO: offset meaning unclear
  this.field_0xa08 = 0;
}
```
