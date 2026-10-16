/**
 * CTSGun::Reset — wipe transient runtime state on the CTSGun entity.
 *
 * Selectively zeroes several member-field ranges plus a handful of
 * standalone dword / byte fields, leaving other regions of the object
 * intact.  Called when the weapon's bookkeeping should be discarded
 * without destroying the entity (e.g. on deploy, mode switch, or
 * idle re-entry).
 *
 * Generated from asm at 0x000705e0 (128 B).
 */
export function Reset(this: { [key: string]: any }): void {
  // Three dword fields at offsets 0xc8 / 0xcc / 0xd0.
  // TODO(asm-ambiguous): likely a cluster of timers / counters sitting just
  //   before the next zeroed region; semantic name comes from class
  //   reconstruction in D.4.
  this["0xc8"] = 0;
  this["0xcc"] = 0;
  this["0xd0"] = 0;

  // 64-byte sub-struct at 0xd4..0x113.
  // TODO(asm-ambiguous): what sub-struct lives here?
  this["0xd4"] = this.zeroMemory?.(0xd4, 0x40) ?? null;

  // 2128-byte sub-struct at 0x114..0x963 — the largest block in this
  // function. Size is consistent with bulk combat / sequence state of the
  // weapon (CCombatAttack, AkimboFire, KatanaFire, KnifeFire, etc.).
  // TODO(asm-ambiguous): what sub-struct lives at 0x114?
  this["0x114"] = this.zeroMemory?.(0x114, 0x850) ?? null;

  // Single-byte flag at 0x97a. The 22-byte gap 0x964..0x979 between the
  // previous block and this byte is preserved.
  // TODO(asm-ambiguous): flag name.
  this["0x97a"] = 0;

  // 56-byte sub-struct at 0x97c..0x9b3.
  // TODO(asm-ambiguous): what sub-struct lives here?
  this["0x97c"] = this.zeroMemory?.(0x97c, 0x38) ?? null;

  // Dword at 0x9b4 (immediately after the previous block).
  // TODO(asm-ambiguous): field name.
  this["0x9b4"] = 0;

  // 38-byte region at 0x9b8..0x9dd. The assembly emits this as two
  // distinct `rep stos` ops (9 dwords + a trailing word); we collapse
  // to a single contiguous zeroing.
  // TODO(asm-ambiguous): the trailing 2-byte field is likely a word
  //   (uint16 / int16 / enum) — confirm when class is reconstructed.
  this["0x9b8"] = this.zeroMemory?.(0x9b8, 0x26) ?? null;

  // Final dword at 0xa08. The 42-byte gap 0x9de..0xa07 is preserved.
  // TODO(asm-ambiguous): field name.
  this["0xa08"] = 0;
}
