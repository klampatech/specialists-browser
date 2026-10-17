/**
 * CTSStunt::CanDiveMedium — TS gameplay helper.
 *
 * Allows a medium-height dive at this moment when either:
 *   (a) the player has a specific single-byte flag set
 *       (unconditional fast path — likely "already in dive" or
 *       "slow-motion active"), or
 *   (b) the player + current slot bonus meet a numeric
 *       threshold derived from player field 0x548.
 *
 * Disassembly arithmetic (verified):
 *   -player.field_0x548 - this.SlotBonus() + 0x51 <= 0x33
 *   ⇔ player.field_0x548 + this.SlotBonus() >= 0x1e   (i.e. >= 30)
 *
 * @returns true iff a medium dive is permitted right now.
 */
export function CanDiveMedium(this: any): boolean {
  // TODO(any): replace `any` with the real CTSStunt type once defined.
  const player = this.m_pPlayer; // [esi+0x40] in the asm = this->m_pPlayer

  // (a) fast path — [player+0x7b9] is a single byte.
  // TODO(asm-ambiguous): confirm field name (likely an in-dive /
  // no-dive / slowmotion flag on CBasePlayer).
  if (player.field_0x7b9 !== 0) return true;

  // (b) threshold path. SlotBonus is called via `push esi; call plt`
  // in the asm; `this.SlotBonus()` is the correct TS surface.
  // TODO(asm-ambiguous): player field 0x548 is a DWORD with no
  // float ops — likely a "time since last dive" counter in a fixed
  // unit (tenths/hundredths); exact name TBD in D.4.
  const bonus = this.SlotBonus();
  const value = player.field_0x548;
  return value + bonus >= 0x1e;
}
