```typescript
// ─────────────────────────────────────────────────────────────────────
// Ambient types + engine helpers.
// TODO(real-types): the proper declarations belong in the engine
// bridge (`src/engine/bridge/`) once it lands. Declared here as
// ambient declarations only so this decompiled unit compiles in
// isolation when dropped into `tools/decompile/output/`.
// ─────────────────────────────────────────────────────────────────────

/**
 * TODO(real-types): full interface lives in
 * `src/game/entities/CTSObjectiveManager.ts` once the class is
 * rebuilt. In the original asm the relevant fields are four ISZ
 * HUD-message handles (this+0x64..+0x70, stride 4) and eight ISZ
 * target handles (this+0x74..+0x90, stride 4).
 */
declare interface CTSObjectiveManager {
  /** On-reset HUD message #1 (engine-string offset; this+0x64). */
  m_iszResetMessage1: number;
  /** On-reset HUD message #2 (this+0x68). */
  m_iszResetMessage2: number;
  /** On-reset HUD message #3 (this+0x6c). */
  m_iszResetMessage3: number;
  /** On-reset HUD message #4 (this+0x70). */
  m_iszResetMessage4: number;
  /** On-reset target entities (8 string_t handles at this+0x74..0x90, stride 4). */
  m_iszResetTargets: number[];
}

/** Half-Life `USE_TYPE` enum. */
declare enum USE_TYPE {
  OFF   = 0,
  ON    = 1,
  SET   = 2,
  TOGGLE = 3,
}

/** TODO(real-types): engine bridge — broadcast a HUD message to every player. */
declare function TSHudMessageAll(
  channel:  number,
  colour:   number,
  x:        number,
  y:        number,
  holdTime: number,
  msg:      string,
): void;

/** TODO(real-types): engine bridge — fire every entity matching the named target. */
declare function FireTargets(
  targetName: string,
  activator:  any, // CBaseEntity
  caller:     any, // CBaseEntity
  useType:    USE_TYPE,
  value:      number,
): void;

/**
 * TODO(real-types): resolve an ISZ (engine-string offset, `string_t`)
 * into a `const char *` pointing into the engine string table.
 */
declare function engineString(isz: number): string;

// ─────────────────────────────────────────────────────────────────────
// Decompiled function.
// ─────────────────────────────────────────────────────────────────────

/**
 * CTSObjectiveManager::Reset
 *
 * Broadcast the on-reset HUD messages configured on this objective
 * manager, then fire each of the on-reset target entities. Reset is
 * a no-op when none of the twelve string handles are configured.
 *
 * Original asm (address 0x0007b850, 422 bytes, `ts/dlls/ts_i386.so`):
 *   Phase 1: walk four ISZ fields at this+0x64, +0x68, +0x6c, +0x70;
 *            call `TSHudMessageAll` for each non-null entry.
 *   Phase 2: walk eight ISZ fields at this+0x74, +0x78, +0x7c,
 *            +0x80, +0x84, +0x88, +0x8c, +0x90; call `FireTargets`
 *            for each non-null entry, with `this` as activator and
 *            caller, USE_TYPE=3 (USE_TOGGLE), value=0.
 *
 * @param this  The CTSObjectiveManager entity instance
 * @returns     void
 */
export function Reset(this: CTSObjectiveManager): void {
  // ── Phase 1: broadcast HUD reset messages ──────────────────────
  for (const isz of [
    this.m_iszResetMessage1,
    this.m_iszResetMessage2,
    this.m_iszResetMessage3,
    this.m_iszResetMessage4,
  ]) {
    if (isz !== 0) {
      // Signature: TSHudMessageAll(channel, colour, x, y, holdTime, msg).
      // The literal bytes (0xff colour, y=0x08, holdTime=0x1e) match
      // the asm exactly. 0xff is HL's "default colour" sentinel,
      // y=0x08 is the HUD second text row, holdTime=0x1e = 30 ticks.
      // TODO(asm-ambiguous): `channel` semantics depend on
      // TS's TSHudMessageAll — for global HUD messages it is 0.
      TSHudMessageAll(0x00, 0xff, 0x00, 0x08, 0x1e, engineString(isz));
    }
  }

  // ── Phase 2: fire on-reset target entities ─────────────────────
  // The asm unrolls the loop as a 2-iteration outer with four inner
  // checks per iteration (counter: 0 → 4 → 8; exit at 8 > 7);
  // semantically a flat iteration over eight contiguous targets.
  for (let i = 0; i < 8; i++) {
    const isz = this.m_iszResetTargets[i];
    if (isz !== 0) {
      // FireTargets(targetName, activator, caller, useType, value).
      // useType=3 → USE_TOGGLE. Both activator and caller are the
      // objective manager itself; `value` is unused by TS targets.
      FireTargets(
        engineString(isz),
        this,             // activator
        this,             // caller
        USE_TYPE.TOGGLE,  // 3
        0,                // value
      );
    }
  }
}
```
