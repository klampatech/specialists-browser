/**
 * CTSBomb::Use — handles a player interacting with (defusing) the bomb.
 *
 * Decompiled from ts/dlls/ts_i386.so @ 0x0007c9a4 (451 B).
 *
 * Verifies the bomb is armed, the activator is a live player who
 * passes CanInteract(), then ticks down the defuse timer; when the
 * timer crosses the sentinel, fires pev->target, broadcasts a HUD
 * message, clears two state fields, and schedules the entity for
 * cleanup.
 */
export function Use(
  this: CTSBomb,
  pActivator: CBaseEntity,
  useType: USE_TYPE,
  value: number,
): void {
  // ── early-outs ───────────────────────────────────────────────────────────

  // Bomb must be armed. [esi+0x64] is a byte flag (0 = disarmed).
  if (!this.m_bArmed) return;

  // Virtual call through pActivator's vtable: load *(edi+0x60) (a vtable
  // pointer), then call vtable[0xc8]. The TS comment "vtable offset 0xc8"
  // is plausible for IsPlayer() but unusually far into the vtable.
  // TODO(asm-ambiguous): confirm vtable slot 0xc8 against the actual
  // CTSObjective/CBasePlayer class layout.
  if (!pActivator.IsPlayer()) return;

  // CTSObjective::CanInteract(pActivator) — gameplay-layer permission check.
  if (!this.CanInteract(pActivator)) return;

  // ── tick-cache (lazy init + elapsed-time clamp) ─────────────────────────

  // gpGlobals->curtime, via the GOT entry [ebx+0x1600] (a pointer to
  // gpGlobals) and two more derefs. This is the ONLY time field loaded
  // in this function — gpGlobals->time is never read.
  const curtime = gpGlobals.curtime;

  // The float at [ebx-0x6f408] is a STATIC .rodata constant, accessed
  // with no indirection. It is NOT gpGlobals.time (which would be loaded
  // via GOT). Treat it as a lazy-init sentinel; the most likely value is
  // 0.0f (zero-initialised member).
  // TODO(asm-ambiguous): confirm sentinel value against the binary's
  // symbol table. Until then, assume 0.0.
  const SENTINEL = 0.0;

  // Disassembly: fld SENTINEL; fcomp [esi+0x78]; test ah,0x40; je …
  //   → "if SENTINEL == m_flLastTick, update to curtime" (lazy init).
  if (this.m_flLastTick === SENTINEL) {
    this.m_flLastTick = curtime;
  }

  // Elapsed since the last defuse tick.
  const elapsed = curtime - this.m_flLastTick;

  // Sanity cap: if elapsed has blown past the QWORD double at
  // [ebx-0x6f010] (plausibly 0.1 s), skip the decrement — curtime has
  // probably wrapped, or the entity has been frozen, and the timer
  // shouldn't be touched.
  // TODO(asm-ambiguous): confirm the constant at [ebx-0x6f010] is 0.1.
  const ELAPSED_LIMIT = 0.1;
  if (elapsed < ELAPSED_LIMIT) {
    // Disassembly: fld SENTINEL; fcomp [esi+0x74]; test ah,0x40; je …
    //   → "if SENTINEL == m_flDefuseProgress, seed from m_iMaxDefuseTime".
    if (this.m_flDefuseProgress === SENTINEL) {
      // fild DWORD PTR [esi+0x80] → fldcw … fistp … fstp … to [esi+0x74].
      // The int at +0x80 is loaded via `fild` (so it's stored as float).
      this.m_flDefuseProgress = this.m_iMaxDefuseTime;
    } else {
      // Decrement: defuseProgress - (curtime - m_flLastTick).
      // The disassembly uses `fsubr [esi+0x74]` to compute
      //   defuseProgress - elapsed = defuseProgress - (curtime - m_flLastTick).
      this.m_flDefuseProgress -= elapsed;
    }
  }

  // ── per-tick status message to the activator ────────────────────────────

  // Disassembly: fld m_flDefuseProgress; fld SENTINEL;
  //              fcom st(1); jbe → fstp st(0); else fstp st(1).
  //   → max(SENTINEL, m_flDefuseProgress), then truncate to int via the
  //     x87 round-to-zero control-word dance (fnstcw / mov BYTE …,0xc /
  //     fldcw / fistp / fldcw).
  // TODO(asm-ambiguous): the format string at [ebx-0x6cdf5] is unknown;
  // "%d" is a placeholder guess.
  const remaining = Math.max(SENTINEL, this.m_flDefuseProgress);
  const message = UTIL_VarArgs("%d", Math.trunc(remaining));

  // HUD_PRINTCENTER (4) on the activator's pev. *(edi) is pActivator->pev
  // (pev sits at offset 0 of CBaseEntity in HLSDK).
  ClientPrint(pActivator.pev, 4, message);

  // Refresh the tick cache so the next Use() call sees fresh data.
  this.m_flLastTick = curtime;

  // ── defuse complete: fire targets, broadcast HUD, reset state, cleanup ──

  // Disassembly: fld SENTINEL; fcomp [esi+0x74]; test ah,0x41; jne 7cb60.
  //   test ah,0x41 checks ZF (0x40) OR CF (0x01), so jne is taken when
  //   SENTINEL ≤ m_flDefuseProgress (equal OR below). I.e., skip the
  //   completion block when the timer is still at or above SENTINEL;
  //   reach it only when the timer has dropped BELOW SENTINEL.
  if (this.m_flDefuseProgress >= SENTINEL) return;

  // pev->target is at offset 0x1c8 in this build's entvars_t (TS layout).
  // STRING() resolves a string_t offset via gpGlobals->pStringBase
  // (loaded as **[ebx+0x1600]+0x98).
  // The useType arg is pushed as 0x3 (USE_TOGGLE), NOT the parameter.
  // TODO(asm-ambiguous): both FireTargets args are esi (=this) in the
  // disassembly; confirm this isn't a typo for (this, pActivator).
  if (this.pev.target) {
    FireTargets(STRING(this.pev.target), this, this, USE_TYPE.USE_TOGGLE, 0);
  }

  // pev->message at offset 0x1d4. TSHudMessageAll(channel, r, g, b, x, y, msg).
  if (this.pev.message) {
    TSHudMessageAll(0, 0xff, 0, 8, 30, STRING(this.pev.message));
  }

  // Clear the two state fields that tracked defuse progress.
  this.m_iStateField1 = 0; // [esi+0x6c]
  this.m_iStateField2 = 0; // [esi+0x70]

  // Virtual call through this's vtable: load *(esi+0x60), then call
  // vtable[0x114] with arg 1. The 16-bit `pushw 0x1` is unusual for cdecl;
  // it pushes 0x0001 with garbage in the upper 16 bits.
  // TODO(asm-ambiguous): vtable slot 0x114 — likely Remove() or a TS
  // OnDefused(int) cleanup. Confirm `pushw` vs `pushl` against disasm.
  this.removeOrCleanup(1);
}
