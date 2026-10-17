```typescript
/**
 * CTSHack::Use — handles +USE on a hackable terminal.
 *
 * Each call decrements an internal "progress" counter and prints it to the
 * player. When the counter drops below the uninit sentinel (-1), the hack
 * is considered complete: targets fire, a HUD message is broadcast, a
 * state-update vtable method is called, and a completion sound plays.
 *
 * The function enters with three early guards — m_bActive, a vtable
 * entity-presence check, and CanInteract(pActivator) — before doing any
 * per-tick work.
 *
 * @param this        The CTSHack entity instance
 * @param pActivator  The entity that initiated the +USE (typically the player)
 * @param useType     How the entity is being used (USE_ON / USE_TOGGLE / ...)
 * @param value       Float value passed by the activator (unused here)
 * @returns           void
 */
export function Use(
  this: CTSHack,
  pActivator: CBaseEntity,
  useType: USE_TYPE,
  value: number
): void {
  // -- Guard: terminal must be active --
  if (this.m_bActive === 0) return;

  // -- Guard: terminal must have a live entity (vtable check) --
  // Dispatches via this->field_0x60 (a vtable pointer) to the entry at
  // byte offset 0xc8 (vtable index 0x32). The method returns NULL if
  // there's no associated entity to interact with.
  // TODO(asm-ambiguous): exact vtable method is unknown — likely
  // something like IsPlayer() or GetOwner() inherited from a base class.
  if (this.vtable[0x32](this) === null) return;

  // -- Guard: activator must be allowed to interact --
  // CTSHack extends CTSObjective, which gates player access via
  // CanInteract.
  if (!this.CanInteract(pActivator as CBasePlayer)) return;

  // -- Constants pulled from the GOT (global floats) --
  // -1.0 sentinel meaning "field not yet initialised". Read from the
  // float at GOT-0x6f408.
  const HACK_UNINIT = -1.0;
  // Total hack duration in seconds. Read as QWORD from GOT-0x6f010.
  // TODO(asm-ambiguous): actual numeric value not in this chunk — see
  // tools/decompile/analysis/strings-n5.txt for cvar mapping.
  const HACK_DURATION: number = 0;
  // Buffer added to gpGlobals->time when the end-time is reached, to
  // prevent the completion path from re-firing. QWORD at GOT-0x6f018;
  // likely ~9999.0.
  const HACK_END_BUFFER: number = 0;
  // Fallback initial progress when m_nHackDuration > 29. Float at
  // GOT-0x6e810.
  const HACK_PROGRESS_DEFAULT: number = 0;

  // -- Lazy-init the hack start time --
  // m_flHackStartTime starts at -1.0 and is stamped with gpGlobals->time
  // on the first tick of a new hack attempt.
  if (this.m_flHackStartTime === HACK_UNINIT) {
    this.m_flHackStartTime = gpGlobals.time;
  }

  // Elapsed seconds since the start of this hack attempt.
  const elapsed = gpGlobals.time - this.m_flHackStartTime;

  // -- Tick the count-down --
  // If the configured hack duration hasn't fully elapsed, decrement
  // progress by the elapsed time. Otherwise leave progress alone — the
  // end-time check below will detect the "done" state.
  if (elapsed < HACK_DURATION) {
    if (this.m_flHackProgress === HACK_UNINIT) {
      // First tick: seed progress. If the entity has a sensible
      // m_nHackDuration in [1, 29], use it directly; otherwise fall back
      // to a global default.
      if (this.m_nHackDuration > 29) {
        this.m_flHackProgress = HACK_PROGRESS_DEFAULT;
      } else {
        this.m_flHackProgress = Math.max(1, this.m_nHackDuration);
      }
    } else {
      // Subsequent ticks: subtract the elapsed time.
      this.m_flHackProgress -= elapsed;
    }
  }

  // -- Detect that the end-time has been crossed --
  // m_flHackEndTime is the gpGlobals->time at which the hack should
  // complete. The first time we see it in the past, push it out to the
  // far future (so the completion path only fires once per hack) and
  // play a randomized in-progress sound.
  if (this.m_flHackEndTime < gpGlobals.time) {
    this.m_flHackEndTime = gpGlobals.time + HACK_END_BUFFER;

    // EMIT_SOUND_DYN(entity, channel, sound, volume, attenuation,
    //                flags, pitch, delay)
    EMIT_SOUND_DYN(
      this.pev.pContainingEntity, // entity (edict at pev+0x208)
      6,                          // channel
      /* sound name at GOT-0x6cdc1 */ "ts/hacking.wav",
      RANDOM_FLOAT(0.92, 1.0),    // volume: jittered 0.92..1.0
      1.25,                       // attenuation
      0,                          // flags
      98 + RANDOM_FLOAT(0, 3),    // pitch: 98..101
      0.5                         // delay
    );
  }

  // -- Display the progress counter to the player --
  // Clamp to >= HACK_UNINIT so we never display a huge negative number,
  // then truncate to int for the printf-style format string.
  const displayProgress = Math.max(this.m_flHackProgress, HACK_UNINIT);
  const truncated = Math.trunc(displayProgress);
  const message = UTIL_VarArgs("%d", truncated);

  // ClientPrint(pev, msg_dest, msg_name, param1..4)
  ClientPrint(this.pev, 4, message, "", "", "", "");

  // -- Reset the start time so the next tick measures a new interval --
  this.m_flHackStartTime = gpGlobals.time;

  // -- Quick exit if progress hasn't fallen below the sentinel --
  // -1 ≤ progress is the "still counting down" range. Below -1 means
  // the count-down has overshot, signalling true completion.
  if (this.m_flHackProgress >= HACK_UNINIT) return;

  // -- Completion path (progress < -1) --

  // Fire entity targets if any are configured (pev+0x1c8).
  if (this.pev.target) {
    FireTargets(this.pev.target, this, this, USE_TOGGLE, 0);
  }

  // Broadcast a HUD message to all clients. The text lives at pev+0x1d4
  // (a string_t in entvars_t).
  if (this.pev.noise) {
    TSHudMessageAll(0, 0xff, 0, 8, 30, this.pev.noise);
  }

  // Clear the "in-progress" counter at offset 0x6c.
  this.m_nHackCount = 0;

  // vtable[0x45] (byte offset 0x114) state-update method, called with
  // a single 1-byte arg of 1.
  // TODO(asm-ambiguous): unknown vtable method; treat as a state
  // callback (e.g., SetThink, ResetSequenceInfo, etc.).
  this.vtable[0x45](this, 1);

  // Play the randomized hack-complete sound (different string from the
  // in-progress one — at GOT-0x6cdb0).
  EMIT_SOUND_DYN(
    this.pev.pContainingEntity,
    6,
    /* sound name at GOT-0x6cdb0 */ "ts/hack_complete.wav",
    RANDOM_FLOAT(0.92, 1.0),
    1.25,
    0,
    98 + RANDOM_FLOAT(0, 3),
    0.5
  );
}
```
