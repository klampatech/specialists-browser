/**
 * CTSStunt::CanDiveHigh — returns whether the player may perform a "high"
 * dive stunt.
 *
 * Short-circuits to `true` when a player-level byte flag is non-zero;
 * otherwise checks a player-extension int field against a threshold derived
 * from `this.SlotBonus()`.
 *
 * Disassembly refs: ts_i386.so @ 0x0008a494 (size 85 B).
 *
 * @returns `true` if the high dive is permitted, `false` otherwise.
 */

// --- D.3 isolation stubs ----------------------------------------------------
// CTSStunt is wired up properly in D.4. For now, type it as `any` so this
// chunk compiles standalone.
type CTSStunt = any;

// Player-extension fields read by this function. Offsets come straight from
// the disassembly; semantic names are deferred to D.4.
interface CTSStuntPlayer {
  // [player + 0x7b9] — TODO(asm-ambiguous): a single-byte flag on the
  // player. Semantics ("in air" / "currently diving" / "freefall") not
  // recoverable from this chunk alone; name it in D.4 once we map the
  // player extension fields.
  readonly field_0x7b9: number;

  // [player + 0x548] — TODO(asm-ambiguous): a signed integer counter on
  // the player (likely a stunt score / slot balance / accumulated bonus).
  // Name it in D.4 once we map the player extension fields.
  readonly field_0x548: number;
}

// --- Function ---------------------------------------------------------------

export function CanDiveHigh(this: CTSStunt): boolean {
  // [esi + 0x40] — this->m_pPlayer. (0x40 is the standard "player pointer"
  // slot in GoldSrc CBaseEntity-derived classes; confident guess.)
  const player = this.m_pPlayer as CTSStuntPlayer;

  // Fast path: any non-zero value in the player-level flag short-circuits
  // straight to `true`.
  if (player.field_0x7b9 !== 0) {
    return true;
  }

  // Slow path: gate the dive on a bonus-balance threshold.
  //   asm:   edx = -[player+0x548] - SlotBonus() + 0x51
  //          al = (edx <= 0x29) ? 1 : 0
  //   which is algebraically equivalent to
  //          player.field_0x548 + SlotBonus() >=  0x28  (== 0x51 - 0x29)
  const slotBonus = this.SlotBonus() as number;
  const balance   = player.field_0x548   as number;
  return -balance - slotBonus + 0x51 <= 0x29;
}
