```typescript
/**
 * CTSStunt::Init — initializes the per-player stunt state by zeroing
 * scalar fields, marking the entity handle as invalid (-1), clearing
 * the status flag byte, and storing the owning player pointer.
 *
 * @param this    The CTSStunt instance being initialized
 * @param pPlayer The owning CBasePlayer
 * @returns       void
 */
export function Init(this: any, pPlayer: any): void {
  // TODO: replace `any` with the real CTSStunt / CBasePlayer types once
  // the class is reconstructed (D.4).

  // Zero out the block of scalar fields at 0x00..0x18 (7 dwords).
  // TODO: semantics unclear — likely time deltas / state ints / velocity
  // components related to flips, rolls, jumps.
  this.field_0x00 = 0;
  this.field_0x04 = 0;
  this.field_0x08 = 0;
  this.field_0x0c = 0;
  this.field_0x10 = 0;
  this.field_0x14 = 0;
  this.field_0x18 = 0;

  // Entity-handle / type sentinel — -1 means "none" / "no entity".
  // TODO(asm-ambiguous): could be an edict handle or a stunt-type enum;
  // without more class context the meaning is unclear.
  this.field_0x1c = -1;

  // Status / mode flag byte — defaults to off (0).
  // TODO: semantics unclear — likely an "in progress" / "active" flag.
  this.field_0x2c = 0;

  // Two more zero-initialized scalar fields at 0x30, 0x38.
  // TODO: semantics unclear.
  this.field_0x30 = 0;
  this.field_0x38 = 0;

  // Back-pointer to the owning player — the only non-zero init value.
  this.m_pPlayer = pPlayer;
}
```
