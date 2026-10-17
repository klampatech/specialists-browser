```typescript
/**
 * CTSBomb::CutWire — handle a player cutting a wire on a planted bomb.
 *
 * @param this       The CTSBomb entity instance (this in the original C++)
 * @param wireIndex  Which wire to cut (0, 1, or 2)
 * @param pPlayer    The player performing the cut
 * @returns          void
 */
export function CutWire(
  this: CTSBomb,
  wireIndex: number,
  pPlayer: CBasePlayer,
): void {
  // ── Bail-out guards ─────────────────────────────────────────────
  // [esi+0x64] byte — bomb must be planted/active.
  if (this.m_bActive === 0) return;
  // [esi+0x84] dword — bomb must have a target string/entity.
  if (this.m_iszTarget === 0) return;
  // [esi+0x6c] float compared to [ebx-0x6f408] — detonation timer
  // must not yet have expired. [ebx-0x6f408] is a global cvar/time;
  // TODO(asm-ambiguous): confirm cvar name in tools/decompile/strings-n5.txt
  // (likely ts_bomb_timeout or gpGlobals->time).
  if (this.m_flDetonateTime >= g_bombTimeoutCvar) return;
  // Wire index out of range (only3 wires exist).
  if (wireIndex > 2) return;

  // ── Wire state lookup ───────────────────────────────────────────
  // State byte at this + 0x7c + wireIndex (compiler splits the
  // address calc as [esi+0xc] + [ecx+0x70], which simplifies to
  // [esi + ecx + 0x7c]). Possible values: 0 (idle, skip),
  // 1 (detonate), 2 (defuse), 3 (cancel).
  const wireState = this.m_rgWireStates[wireIndex];
  if (wireState === 0) return;
  if (pPlayer === null) return;

  switch (wireState) {
    case 3: {
      // Player aborted the cut mid-progress. Just reset the wire
      // state and detonation timer.
      this.m_rgWireStates[wireIndex] = 0;
      this.m_flDetonateTime = 0;
      break;
    }

    case 2: {
      // Correct wire — defuse the bomb. Mark defused, clear this
      // wire's state, and copy the 3 wire color bytes to the
      // player who cut it (used by TS scoring/inventory later).
      this.m_bDefused = 1;                               // [esi+0x7f]
      this.m_rgWireStates[wireIndex] = 0;
      pPlayer.m_iUserByte0 = this.m_rgWireStates[0];     // [edi+0x78c] ← [esi+0x7c]
      pPlayer.m_iUserByte1 = this.m_rgWireStates[1];     // [edi+0x78d] ← [esi+0x7d]
      pPlayer.m_iUserByte2 = this.m_rgWireStates[2];     // [edi+0x78e] ← [esi+0x7e]
      break;
    }

    case 1: {
      // Wrong wire — detonate. Clear this wire's state, fire the
      // detonation target/messages if configured, reset both
      // timers, then dispatch a virtual on the owner-related entity.
      this.m_rgWireStates[wireIndex] = 0;

      // FireTargets(STRING(m_iszDetonateTarget), this, this, USE_TOGGLE, 0)
      // m_iszDetonateTarget is a string_t at [esi]+0x1c8 (likely a
      // repurposed entvars string field such as pev->noise).
      if (this.m_iszDetonateTarget !== 0) {
        FireTargets(
          STRING(this.m_iszDetonateTarget),
          this,
          this,
          USE_TOGGLE,
          0,
        );
      }

      // TSHudMessageAll(channel=0, color1=0xff, color2=0, x=8, y=0x1e, msg)
      // m_iszDetonateMessage is a string_t at [esi]+0x1d4.
      if (this.m_iszDetonateMessage !== 0) {
        TSHudMessageAll(
          0,
          0xff,
          0,
          8,
          0x1e,
          STRING(this.m_iszDetonateMessage),
        );
      }

      // Reset both detonation timers.
      this.m_flDetonateTime = 0;                          // [esi+0x6c]
      this.m_flOtherTimer = 0;                            // [esi+0x70]

      // Virtual call on entity pointed to by [esi+0x60]. The vtable
      // entry at offset 0x114 (index 0x45) is invoked with
      // (this, 0x0001 as a 16-bit flag, padded via pushw).
      // TODO(asm-ambiguous): vtable[0x45] semantics — likely a // Detonate / Kill / SubThink on the bomb's owner entity.
      this.m_pOwnerEntity.vtable[0x45](this, 1);
      break;
    }
  }
}
```
