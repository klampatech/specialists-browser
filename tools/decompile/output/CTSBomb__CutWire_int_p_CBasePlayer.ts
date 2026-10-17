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
  // ── Bail-out guards (in disassembly order) ──────────────────────
  if (this.m_bActive === 0) return; // [esi+0x64] byte
  if (this.m_iszTarget === 0) return;         // [esi+0x84] dword

  // Disassembly at 0x7c73e–0x7c74a:
  //   fld [ebx-0x6f408]; fcomp [esi+0x6c]; fnstsw ax; sahf; jae (bail)
  // jae after fcomp jumps iff st(0) >= op, i.e., iff
  // [ebx-0x6f408] >= this.m_flDetonateTime. The TS originally had
  // the comparison inverted (it would have allowed cutting only
  // AFTER the bomb detonated).
  // TODO(asm-ambiguous): confirm the name of [ebx-0x6f408] (likely
  // gpGlobals->time, but possibly a cvar).
  if (g_currentTime >= this.m_flDetonateTime) return;

  // Wire index out of range (only 3 wires exist).
  if (wireIndex > 2) return;

  // ── Wire state lookup ──────────────────────────────────────────
  // State byte at [esi + ecx + 0x7c] (the compiler splits the
  // address calc as [esi+0xc] + [ecx+0x70]). Possible values:
  // 0 (idle, bail), 1 (detonate), 2 (defuse), 3 (cancel).
  const wireState = this.m_rgWireStates[wireIndex];
  if (wireState === 0) return;
  if (pPlayer === null) return;

  switch (wireState) {
    case 3: {
      // Wire cut was cancelled mid-progress. Just reset the wire
      // state and detonation timer.
      this.m_rgWireStates[wireIndex] = 0;
      this.m_flDetonateTime = 0;
      break;
    }

    case 2: {
      // Correct wire — defuse the bomb.
      this.m_bDefused = 1; // [esi+0x7f]
      this.m_rgWireStates[wireIndex] = 0;
      // Copy the 3 wire-state bytes to the player. Note: the
      // current wire's state byte is now 0 (we just cleared it),
      // so the player sees a snapshot with the cut wire marked 0.
      pPlayer.m_iUserByte0 = this.m_rgWireStates[0];        // [edi+0x78c] ← [esi+0x7c]
      pPlayer.m_iUserByte1 = this.m_rgWireStates[1];        // [edi+0x78d] ← [esi+0x7d]
      pPlayer.m_iUserByte2 = this.m_rgWireStates[2];        // [edi+0x78e] ← [esi+0x7e]
      break;
    }

    case 1: {
      // Wrong wire — detonate.
      this.m_rgWireStates[wireIndex] = 0;

      // pev->noise is the detonate target string.
      // Disassembly: mov eax, [esi]; cmp [eax+0x1c8], 0
      // (the TS originally dropped the pev-> indirection here).
      if (this.pev.noise !== 0) {
        FireTargets(
          STRING(this.pev.noise),
          this,
          this,
          USE_TOGGLE,
          0,
        );
      }

      // pev->noise3 is the detonate HUD message.
      if (this.pev.noise3 !== 0) {
        TSHudMessageAll(
          0,
          0xff,
          0,
          8,
          0x1e,
          STRING(this.pev.noise3),
        );
      }

      // Reset both timers.
      this.m_flDetonateTime = 0;                            // [esi+0x6c]
      this.m_flOtherTimer = 0;                              // [esi+0x70]

      // Virtual call through the secondary vtable at [esi+0x60].
      // Disassembly: mov eax, [esi+0x60]; call [eax+0x114]
      // (vtable index 0x45, called with (this, 1)).
      // TODO(asm-ambiguous): which MI base class owns this vtable,
      // and what does vtable[0x45] do? The TS originally misnamed
      // this as m_pOwnerEntity; it's actually a vtable pointer.
      this.m_pVtable2[0x45](this, 1);
      break;
    }
  }
}
