/**
 * CTSHack::Use — handles +USE on a hackable terminal.
 *
 * Three early guards: m_bActive, an IsPlayer-style check on the
 * activator (returns NULL if activator is not a player-typed entity),
 * and CanInteract(pActivator). On each tick, the progress counter is
 * decremented by elapsed time (or seeded on the first tick from
 * m_nHackDuration, with a >29 fallback). When the progress falls below
 * the -1.0 sentinel, the hack completes: targets fire, a HUD message
 * broadcasts, the in-progress counter resets, a state-update vtable
 * method runs, and the completion sound plays.
 *
 * The activator's vtable at slot 0x32 (offset 0xc8) is the dispatch —
 * its return value is checked against NULL. The function also writes
 * to this->vtable[0x45] (offset 0x114) at completion.
 */
export function Use(
  this: any,
  pActivator: any,
  useType: any,
  value: number
): void {
  // -- Guard 1: terminal must be active --
  if (this.m_bActive === 0) return;

  // -- Guard 2: activator must resolve to a player (NULL ⇒ skip) --
  // Disassembly loads the vtable ptr from pActivator->field_0x60
  // (NOT from this), then calls vtable[0x32]. Returns NULL if the
  // activator is not a player-typed entity.
  if (pActivator.vtable[0x32](pActivator) == null) return;

  // -- Guard 3: CanInteract gate (inherited from CTSObjective) --
  if (!this.CanInteract(pActivator)) return;

  // -- Constants read from the data section (TBD: real values) --
  const HACK_UNINIT          = -1.0;  // GOT-0x6f408
  const HACK_DURATION        = 0.0;   // GOT-0x6f010 (QWORD) — TODO: fill in
  const HACK_END_BUFFER      = 0.0;   // GOT-0x6f018 (QWORD) — TODO: fill in
  const HACK_PROGRESS_DEFAULT = 0.0;  // GOT-0x6e810      — TODO: fill in

  // -- Lazy-init the hack start time --
  if (this.m_flHackStartTime === HACK_UNINIT) {
    this.m_flHackStartTime = gpGlobals.time;
  }
  const elapsed = gpGlobals.time - this.m_flHackStartTime;

  // -- Tick the count-down --
  if (elapsed < HACK_DURATION) {
    if (this.m_flHackProgress === HACK_UNINIT) {
      // First tick: seed
      if (this.m_nHackDuration > 29) {
        this.m_flHackProgress = HACK_PROGRESS_DEFAULT;
      } else {
        this.m_flHackProgress = Math.max(1, this.m_nHackDuration);
      }
    } else {
      this.m_flHackProgress -= elapsed;
    }
  }

  // -- Once-only end-time cross + randomized in-progress sound --
  if (this.m_flHackEndTime < gpGlobals.time) {
    this.m_flHackEndTime = gpGlobals.time + HACK_END_BUFFER;
    EMIT_SOUND_DYN(
      this.pev.pContainingEntity,
      6,
      /* GOT-0x6cdc1 — TODO: real string */ "ts/hacking.wav",
      RANDOM_FLOAT(0.92, 1.0),
      1.25,
      0,
      98 + (RANDOM_LONG(0, 3) | 0),
      0.5
    );
  }

  // -- Display the progress counter to the activator --
  const displayProgress = Math.max(this.m_flHackProgress, HACK_UNINIT);
  const truncated       = Math.trunc(displayProgress);
  const message         = UTIL_VarArgs("%d", truncated);
  ClientPrint(this.pev, 4, message, "", "", "", "");

  // -- Reset the start time for the next tick --
  this.m_flHackStartTime = gpGlobals.time;

  // -- Quick exit if progress hasn't dropped below sentinel --
  if (this.m_flHackProgress >= HACK_UNINIT) return;

  // -- Completion path --
  if (this.pev.target) {
    FireTargets(this.pev.target, this, this, USE_TOGGLE, 0);
  }
  if (this.pev.noise) {
    TSHudMessageAll(0, 0xff, 0, 8, 30, this.pev.noise);
  }
  this.m_nHackCount = 0;
  this.vtable[0x45](this, 1);
  EMIT_SOUND_DYN(
    this.pev.pContainingEntity,
    6,
    /* GOT-0x6cdb0 — TODO: real string */ "ts/hack_complete.wav",
    RANDOM_FLOAT(0.92, 1.0),
    1.25,
    0,
    98 + (RANDOM_LONG(0, 3) | 0),
    0.5
  );
}
