// Stub — D.4 will pin this to gpGlobals->maxClients (or maxEntities).
declare const engineMaxClients: any;

/**
 * CTSGameRules::TogglePlayerFromSlow — removes a player from the
 * slow-motion slot array by nulling the first matching entry.
 *
 * Walks the per-entity slot array (1..maxClients, GoldSrc's 1-based
 * entity indexing) and clears the first slot that points at `p`. No
 * other side effects; if `p` is not currently flagged as slowed, the
 * function is a no-op.
 *
 * @param this  The CTSGameRules instance (this in the original C++)
 * @param p     The CBasePlayer to take out of slow motion
 * @returns     void
 */
export function TogglePlayerFromSlow(this: any, p: any): void {
  // TODO(asm-ambiguous): [ebx+0x1600] -> [edx] -> [eax+0x90] walks a
  // PIC pointer chain to an engine global. In canonical HLSDK,
  // globalvars_t field at offset 0x90 is maxEntities; maxClients is
  // at 0x8c. Confirm against the TS-specific HLSDK build which one
  // this is. Either way, the semantic bound is "largest entity index
  // used in the slot array", so the loop body is unaffected.
  const maxClients: number = engineMaxClients;

  // Slot layout (per asm): edx starts at 0x574, the addressing mode
  // is [esi+edx*1+0xc], and edx is incremented by 4 each iteration.
  // That gives the first accessed slot at this+0x580 (slot index 1),
  // stride 4 bytes (pointer-sized). HLSDK convention reserves
  // slot[0] at this+0x57c (entity index 0 = worldspawn, never stored).
  // D.4 will replace the inline offset math with a typed field access
  // (e.g. `this.m_pSlowPlayers[i]`).
  for (let i = 1; i <= maxClients; i++) {
    if ((this as any).m_pSlowPlayers[i] === p) {
      (this as any).m_pSlowPlayers[i] = null;
      return;
    }
  }
}
