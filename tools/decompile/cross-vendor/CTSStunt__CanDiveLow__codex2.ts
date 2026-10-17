/**
 * CTSStunt::CanDiveLow — determines whether the player can perform a low dive
 * stunt. Fast-paths on a player byte flag; otherwise evaluates a numeric check
 * combining SlotBonus() and a player int field.
 *
 * Decompiled from `ts/dlls/ts_i386.so` @ 0x0008a544 (85 bytes).
 * Reconstructed from disassembly; field names are inferred from offsets and
 * are placeholders pending D.4 class reconstruction.
 */

// Stub for compilation in isolation. The real CTSStunt class is defined in D.4.
type CTSStunt = any;

export function CanDiveLow(this: CTSStunt): boolean {
  // [esi+0x40] — pointer to the player entity.
  // TODO(asm-ambiguous): offset 0x40 inferred as m_pPlayer; could be any  //   entity ptr. Init(p CBasePlayer) makes "player" plausible but unverified.
  const player: any = this.m_pPlayer;

  // Fast-path: if the player's byte flag is non-zero, allow low dive.
  // [eax+0x7b9] — byte flag on the player.
  // TODO(asm-ambiguous): offset 0x7b9 meaning unclear (m_bSomeFlag placeholder).
  if (player.m_bSomeFlag !== 0) {
    return true;
  }

  // Slow-path: call this->SlotBonus(), then read player->int_0x548.
  const slotBonus: number = this.SlotBonus();
  // [edx+0x548] — int field on the player.
  // TODO(asm-ambiguous): offset 0x548 meaning unclear (m_iSomeTime placeholder).
  const playerValue: number = player.m_iSomeTime;

  // Disassembly: edx = -playerValue - slotBonus + 0x51; return edx <= 0x3d.
  // Equivalent: playerValue + slotBonus >= 0x14 (20).
  // TODO(asm-100): magic numbers 0x51 (=81) and 0x3d (=61) — likely a tunable
  //   threshold combining slot bonus with player state; not a named constant.
  return -playerValue - slotBonus + 0x51 <= 0x3d;
}
