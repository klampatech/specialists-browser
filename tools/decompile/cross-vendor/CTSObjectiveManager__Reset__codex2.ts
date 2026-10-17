// ─────────────────────────────────────────────────────────────────────
// Ambient types + engine helpers. Compiles in isolation; full// declarations move into the engine bridge in D.5.
// ─────────────────────────────────────────────────────────────────────

declare interface CTSObjectiveManager {
  /** On-reset HUD messages (this+0x64..0x70, stride 4). */
  m_iszResetMessage1: number;
  m_iszResetMessage2: number;
  m_iszResetMessage3: number;
  m_iszResetMessage4: number;
  /**
   * On-reset target entities — 8 string_t handles at this+0x74..0x90,
   * stride 4. Modeled as 8 separate fields to match the asm's
   * hard-coded offsets; D.4 should fold these into a typed array on
   * the rebuilt class.
   */
  m_iszResetTarget1: number;
  m_iszResetTarget2: number;
  m_iszResetTarget3: number;
  m_iszResetTarget4: number;
  m_iszResetTarget5: number;
  m_iszResetTarget6: number;
  m_iszResetTarget7: number;
  m_iszResetTarget8: number;
}

/** Half-Life `USE_TYPE` enum. */
declare enum USE_TYPE {
  OFF    = 0,
  ON     = 1,
  SET    = 2,
  TOGGLE = 3,
}

/** Broadcast a HUD message to every player. */
declare function TSHudMessageAll(
  channel:  number,
  colour:   number,
  x:        number,
  y:        number,
  holdTime: number,
  msg:      string,
): void;

/** Fire every entity matching the named target. */
declare function FireTargets(
  targetName: string,
  activator:  any, // CBaseEntity*
  caller:     any, // CBaseEntity*
  useType:    USE_TYPE,
  value:      number,
): void;

/** Resolve a string_t offset to a `const char*` from the engine string table. */
declare function engineString(isz: number): string;

// ─────────────────────────────────────────────────────────────────────
// Decompiled function.
// ─────────────────────────────────────────────────────────────────────

/**
 * CTSObjectiveManager::Reset
 *
 * Broadcast the on-reset HUD messages configured on this objective
 * manager, then fire each of the on-reset target entities. Reset is
 * a no-op when none of the 12 string handles are configured.
 *
 * Original asm (address 0x0007b850, 422 bytes, `ts/dlls/ts_i386.so`).
 *
 * @param this  The CTSObjectiveManager entity instance
 * @returns     void
 */
export function Reset(this: CTSObjectiveManager): void {
  // ── Phase 1: broadcast the four on-reset HUD messages ────────────
  // The asm emits 4 separate cmp/jcc guards at offsets +0x64, +0x68,
  // +0x6c, +0x70; semantically a filter over 4 ISZ fields. Each
  // resolved via STRING(isz) + TSHudMessageAll(channel=0, color=0xff,
  // x=0, y=8, holdTime=30, msg).
  const hudMessages = [
    this.m_iszResetMessage1,
    this.m_iszResetMessage2,
    this.m_iszResetMessage3,
    this.m_iszResetMessage4,
  ];
  for (const isz of hudMessages) {
    if (isz !== 0) {
      TSHudMessageAll(0x00, 0xff, 0x00, 0x08, 0x1e, engineString(isz));
    }
  }

  // ── Phase 2: fire the eight on-reset target entities ─────────────
  // The asm unrolls as a 2-iteration outer loop with four inner
  // checks per iteration (counter 0 → 4 → 8; exit at >7), starting  // from `esi = this+0x70` and stepping by 0x10. Semantically: a
  // flat iteration over 8 contiguous targets at offsets +0x74..+0x90.
  // Each FireTargets call passes (msg, this, this, USE_TOGGLE, 0).
  const targets = [
    this.m_iszResetTarget1, this.m_iszResetTarget2,
    this.m_iszResetTarget3, this.m_iszResetTarget4,
    this.m_iszResetTarget5, this.m_iszResetTarget6,
    this.m_iszResetTarget7, this.m_iszResetTarget8,
  ];
  for (const isz of targets) {
    if (isz !== 0) {
      FireTargets(
        engineString(isz),
        this,             // activator
        this,             // caller
        USE_TYPE.TOGGLE,  // 3
        0,                // value (unused by TS targets)
      );
    }
  }
}
