```typescript
/**
 * CTSSMGAmmo::Spawn — initialise the SMG ammo pickup entity.
 *
 * Calls up to the parent CTSGroundAmmo::Spawn for base setup, then writes
 * the per-ammo "give amount" fields for the four ammo types this pickup
 * grants. Each give amount is the engine ammo registry's `max_carry` value
 * for that ammo id (read from the ammo-info struct at offset +0xc), divided
 * by 2 with truncation toward zero — the compiler's signed-div-by-2 bit
 * trick (`((x + (x >> 31)) >> 1)`), which for our positive ammo counts is
 * equivalent to a logical shift right by one.
 *
 * @param this  The CTSSMGAmmo entity (`this` in the original C++)
 * @returns     void
 */
export function Spawn(this: CTSSMGAmmo): void {
  // The asm prologue (PIC-base computation via `call $+5; pop ebx;
  // add ebx, 0xac5be;` plus `push esi; push ebx; sub esp, 0x4`) is
  // boilerplate; the first semantic action is the parent class spawn:

  // CTSGroundAmmo::Spawn(this) — pushed `this` and tail-called.
  CTSGroundAmmo.Spawn(this);

  // The repeating sequence
  //   mov eax, [eax+0xc]
  //   mov edx, eax
  //   shr edx, 0x1f
  //   add eax, edx
  //   sar eax, 1
  //   mov [esi+offset], eax
  // is `info[id].max_carry / 2` (signed, truncated toward zero),
  // whose target is one of four ammo-amount fields on `this`.
  // Order in asm: ids 2, 1, 7, 12 → offsets 0x70, 0x6c, 0x84, 0x98.

  // [esi+0x70] ← max_carry(id=2) / 2  — SMG primary
  this.field_0x70 = getAmmoInfo(2).maxCarry >> 1;
  // [esi+0x6c] ← max_carry(id=1) / 2
  this.field_0x6c = getAmmoInfo(1).maxCarry >> 1;
  // [esi+0x84] ← max_carry(id=7) / 2
  this.field_0x84 = getAmmoInfo(7).maxCarry >> 1;
  // [esi+0x98] ← max_carry(id=12) / 2
  this.field_0x98 = getAmmoInfo(12).maxCarry >> 1;

  // TODO(asm-ambiguous): the four destination-field offsets are raw
  //   writes — their semantic names (likely `m_iGiveAmountN` /
  //   `m_iSecondaryGive` family) depend on the CTSAmmo / CTSGroundAmmo
  //   class layout, which is a D.4 task. Replace with named fields once
  //   that layout is documented.
  // TODO: `CTSGroundAmmo` and `getAmmoInfo` are unresolved references
  //   here; both will be defined (or imported) by the class-stub pass.
}
```
