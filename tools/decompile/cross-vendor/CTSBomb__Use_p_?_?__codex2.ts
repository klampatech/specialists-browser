/**
 * CTSBomb::Use — invoked when a player interacts with the bomb.
 *
 * Faithful to the i386 disassembly at 0x0007c9a4. Field offsets are
 * preserved as comments so the next pass (D.4 — CTSBomb class
 * discovery) can re-anchor them.
 *
 * @param this        CTSBomb entity instance (`this` in C++)
 * @param pActivator  CBaseEntity that triggered the use (the player)
 * @param useType     USE_TYPE — not consulted in this implementation
 * @param value       float   — not consulted in this implementation
 *                              (HLSDK-conformance inference; the asm
 *                              never reads the [esp+0x28] slot)
 */
export function Use(
  this: CTSBomb,
  pActivator: CBaseEntity,
  useType: USE_TYPE,
  value: number,
): void {
  // ── early-outs ────────────────────────────────────────────────────────

  // [esi+0x64] — armed flag (byte). 0 == disarmed.
  if (!this.m_bArmed) return;

  // [edi+0x60] is the vtable-bearing pointer in pActivator's layout;
  // call through vtable slot 0xc8 (TS-custom IsAlive / IsValidActivator).
  // TODO(asm-ambiguous): 0xc8 is past standard HL1 IsPlayer() slot —
  // verify against the CTS objective hierarchy in D.4.
  if (!pActivator.IsPlayer()) return;

  // CTSObjective::CanInteract(pActivator) — gameplay-layer permission.
  if (!this.CanInteract(pActivator)) return;

  // ── per-tick cache + time arithmetic ────────────────────────────────

  // [ebx-0x6f408] — float slot (gpGlobals.time, or possibly a cvar).
  // The asm reads the same slot three times (7c9f5 / 7ca2a / 7cac6).
  const now = gpGlobals.time;

  // Cache-write guard. Asm at 7c9f5-7ca03 tests C3 (equal flag) of
  // the FPU status word: `test ah,0x40; je 7ca12`. The fall-through
  // path writes curtime to m_flLastTick ONLY when now == m_flLastTick.
  // (Unconditional refresh happens later at 7cac0.)
  //
  // Triple-deref `[ebx+0x1600] → *ptr → **ptr` reads offset 0 of the
  // globalvars_t-shaped struct — `time` in stock HLSDK, possibly
  // renamed to `curtime` in TS's custom engine header; if you keep
  // `curtime` here, treat it as TS-header-specific.
  if (now === this.m_flLastTick) {
    this.m_flLastTick = gpGlobals.curtime;
  }

  // Elapsed = curtime - m_flLastTick.
  const elapsed = gpGlobals.curtime - this.m_flLastTick;

  // Sanity cap: asm compares elapsed against a QWORD constant at
  // [ebx-0x6f010] (≈0.1 s) and skips the decrement branch when
  // elapsed is large enough that we suspect a wrap/freeze. Do NOT
  // hardcode the literal — keep the symbolic name so D.4 can
  // re-anchor the source.
  const elapsedLimit = TIME_SINCE_TICK_LIMIT; // ~0.1 s
  if (elapsed < elapsedLimit) {
    // Equality branch: same C3 check at 7ca2a-7ca38, fires when
    // `now == m_flDefuseProgress`. Asm loads m_iMaxDefuseTime as int
    // via fild and stores it as float to 0x74. Rare-float-equality
    // guard, semantics are not obvious in isolation — preserve as-is.
    if (now === this.m_flDefuseProgress) {
      this.m_flDefuseProgress = this.m_iMaxDefuseTime;
    } else {
      // Reverse-subtract: progress = progress - (curtime - m_flLastTick).
      this.m_flDefuseProgress -= elapsed;
    }
  }

  // ── status HUD message to the activator ─────────────────────────────

  // x87 fcom selects max(now, m_flDefuseProgress); control-word dance
  // (`fnstcw; mov byte[esp+0x25],0x0c; fldcw`) sets round-to-zero
  // before `fistp` to truncate the float to an int.
  const remaining = Math.max(now, this.m_flDefuseProgress);
  const message = UTIL_VarArgs("%d", Math.trunc(remaining));

  // HUD_PRINTCENTER (4). Asm: `push eax; push 0x4; push [edi]; call ClientPrint`.
  ClientPrint(pActivator.pev, 4, message);

  // Refresh the cache unconditionally (asm at 7cab6-7cac0).
  this.m_flLastTick = gpGlobals.curtime;

  // ── defuse complete: fire targets, HUD broadcast, reset, cleanup ───

  // asm: `test ah,0x41` checks (C3 | C0); jumps to return if either
  // bit is set. Fall-through (continue) only when now > progress.
  if (now <= this.m_flDefuseProgress) return;

  // pev->target (offset 0x1c8) resolves via gpGlobals->pStringBase.
  // Asm pushes USE_TOGGLE literal 0x3, NOT the type.
  if (this.pev.target) {
    FireTargets(STRING(this.pev.target), this, this, USE_TOGGLE, 0);
  }

  // pev->message (offset 0x1d4) — 6 args total: (channel, r=255,
  // g=0, b=8, x=30, msg). No `y` slot in the asm — corrected from the
  // earlier 7-arg comment.
  if (this.pev.message) {
    TSHudMessageAll(0, 0xff, 0, 8, 30, STRING(this.pev.message));
  }

  // Clear the two int state fields ([esi+0x6c] and [esi+0x70]).
  this.m_iStateField1 = 0;
  this.m_iStateField2 = 0;

  // vtable slot 0x114 with arg=1. Unusual for vanilla HL1 — almost
  // certainly a TS-added `Remove(flags)` or `OnDefused(1)`.
  // TODO(asm-ambiguous): confirm slot 0x114 against the CTSBomb
  // hierarchy in D.4.
  this.removeOrCleanup(1);
}
