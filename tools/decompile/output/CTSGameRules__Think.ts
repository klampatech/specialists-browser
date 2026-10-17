/**
 * CTSGameRules::Think — per-tick update for the game-rules singleton.
 *
 * Decompiled from `Think__12CTSGameRules` at `ts/dlls/ts_i386.so` offset
 * `0x00067204` (size 1375 bytes / `0x55f`). The original doc-comment
 * description of the function's responsibilities is preserved; only the
 * body has been corrected against the disassembly.
 *
 * @param this  The CTSGameRules entity instance (`this` in C++).
 * @returns     void
 */
export function Think(this: CTSGameRules): void {
  // Cached `gpGlobals->time` — the assembly reloads the same value
  // through `[ebx+0x1600][eax]` at multiple sites. Both reads refer
  // to the same global timestamp.
  const time: number = currentTime;

  // The disassembly references a global at GOT-0x6f408 in8 sites as
  // either a NaN guard or as a discriminator between paired branches.
  // Its exact identity (a cvar, a sentinel, or a runtime constant) is
  // D.4 work; for now we alias all reads to `sentinel_6f408`.
  const sentinel_6f408: number = gateCvar_6f408;

  // ═══════════════════════════════════════════════════════════════════
  // 1. Slow-motion decay
  // ═══════════════════════════════════════════════════════════════════

  // (1a) If the sentinel is a real (non-NaN) value AND the
  //      slow-motion start is in the past, zero the end-timer so
  //      the next block transitions cleanly.
  if (isOrderedFloatCompare(sentinel_6f408, this.m_flSlowMotionStart) &&
      this.m_flSlowMotionStart < time) {
    this.m_flSlowMotionEnd = 0;
  }

  // (1b) If the sentinel is ordered vs m_flSlowMotionEnd, re-issue
  //      the effect and skip teardown.
  if (isOrderedFloatCompare(sentinel_6f408, this.m_flSlowMotionEnd)) {
    this.GlobalSlowMotion2(this.m_flSlowMotionFactor, /* restart */ false);
  } else if (isOrderedFloatCompare(sentinel_6f408, this.m_flSlowMotionFactor)) {
    // (1c) Else, if the sentinel is ordered vs m_flSlowMotionFactor,
    //      tear down the effect and clear the factor AND end
    //      timestamps. (NOT m_flSlowMotionStart — offset 0x568 is
    //      unrelated to this clear.)
    this.GlobalSlowMotion2(0.0, false);
    this.m_flSlowMotionFactor = 0;
    this.m_flSlowMotionEnd = 0;
  }
  // Else: both checks are unordered → skip everything.

  // ═══════════════════════════════════════════════════════════════════
  // 2. Periodic dead-player sweep
  // ═══════════════════════════════════════════════════════════════════
  if (isOrderedFloatCompare(sentinel_6f408, this.m_flNextDeadCheckTime) &&
      this.m_flNextDeadCheckTime < time) {
    this.CheckDeads();
  }

  // ═══════════════════════════════════════════════════════════════════
  // 3. State-machine dispatch on m_iGameState
  // ═══════════════════════════════════════════════════════════════════
  if (this.m_iGameState <= 1) {
    // ─── 3a. Pre-game / in-game path ───────────────────────────────

    // First-run sentinel: 0xff means "never initialized" — flip it to
    // 1 so the rest of the gate (`== 1`) succeeds going forward.
    if (this.m_bPowerupArmed === 0xff) this.m_bPowerupArmed = 1;

    // Powerup scheduler — gated by armed flag AND a "mode cvar" that
    // is ordered against 1.0 (assembly: `fld1; fcomp cvar; jne skip`).
    if (this.m_bPowerupArmed === 1 &&
        isOrderedFloatCompare(1.0, powerupModeCvar)) {
      if (this.m_flNextPowerupTime < time) {
        // Time for a fresh powerup — pick which id to use.
        const roll = randomFloat(0.0, 1.0);
        let powerupId: number;
        if (roll < powerupRollChanceCvar) {
          // Roll under the chance threshold: start with the default id 1.
          // If the override-mode cvar is NaN, fall back to a random pick.
          powerupId = 1;
          if (!isOrderedFloatCompare(1.0, powerupOverrideCvar)) {
            powerupId = this.GetRandomPowerup(/* range */ 0x1ff, /* cvar */ 0);
          }
        } else {
          powerupId = this.GetRandomPowerup(/* range */ 0x1ff, /* cvar */ 0);
        }
        // Schedule the next powerup time. On success use the
        // post-success delta; on PutPowerUp failure use the default.
        if (this.PutPowerUp(powerupId) !== 0) {
          this.m_flNextPowerupTime = time + powerupSuccessIntervalCvar;
        } else {
          this.m_flNextPowerupTime = time + powerupDefaultIntervalCvar;
        }
      } else {
        // m_flNextPowerupTime is still in the future. If the offset
        // from now strictly exceeds the reschedule threshold, zero
        // the timestamp so the next elapsed check can fire.
        // (`offset > threshold` is false on NaN, so the "ordered"
        // half of the assembly's check is implicit.)
        const offset = this.m_flNextPowerupTime - time;
        if (offset > powerupRescheduleThresholdCvar) {
          this.m_flNextPowerupTime = 0;
        }
      }
    }

    // ─── 3b. "The One" CTB-game-mode selection ─────────────────────
    if (this.m_bCTBEnabled /* cvar @ GOT+0x12cc */) {
      // Assembly: `fld time; fcomp NextTheOneTime; test ah,0x41; jne skip`
      // → skip if time <= NextTheOne OR time is NaN. Proceed when
      // time > NextTheOne AND not NaN.
      if (isOrderedFloatCompare(time, this.m_flNextTheOneTime) &&
          time > this.m_flNextTheOneTime) {
        let hasExistingTheOne = false;
        this.m_iTheOneCount = 0;
        const maxPlayers = maxClients();
        for (let i = 0; i < maxPlayers; i++) {
          const player = UTIL_PlayerByIndex(i);
          if (!player || !player.IsAlive() || player.IsDormant()) continue;
          if (player.m_bIsTheOne /* CBasePlayer+0x7b9 */) {
            hasExistingTheOne = true;
          } else {
            this.m_iTheOneCount++;
          }
        }
        if (!hasExistingTheOne) {
          this.SelectRandomTheOne();
        }
        this.m_flNextTheOneTime = time + theOneReselectIntervalCvar;
      }
    }

    // ─── 3c. Round start/end transitions (state must be 0) ─────────
    if (this.m_iGameState === 0 && this.m_bRoundsEnabled /* cvar @ GOT+0x152c */) {
      // RestartRound: trigger when m_flRoundStartTime is in the past
      // AND the sentinel is strictly different from m_flRoundStartTime
      // (and not NaN).
      if (this.m_flRoundStartTime < time &&
          isOrderedFloatCompare(sentinel_6f408, this.m_flRoundStartTime) &&
          sentinel_6f408 !== this.m_flRoundStartTime) {
        this.RestartRound();
      }
      // CheckDeads: trigger when m_flRoundEndTime is in the past AND
      // the sentinel equals m_flRoundStartTime OR is NaN.
      if (this.m_flRoundEndTime < time &&
          !isOrderedFloatCompare(sentinel_6f408, this.m_flRoundStartTime)) {
        this.CheckDeads();
      }
    }
  } else {
    // ─── 3d. Post-game path (m_iGameState >= 2) ────────────────────
    // TeamWin / RTL: trigger when m_flRoundEndTime is in the past AND
    // the sentinel equals m_flRoundStartTime OR is NaN.
    if (this.m_flRoundEndTime < time &&
        !isOrderedFloatCompare(sentinel_6f408, this.m_flRoundStartTime)) {
      if (this.m_bRoundHasWinner /* +0x10 */) {
        if (this.m_iGameState === 2) {
          // CTB / similar: award win to team 2. The 4th arg's type
          // is `T3` in the demangled sig (unknown); the assembly
          // pushes 0 (pushw 0x0), so pass 0 rather than null.
          this.TeamWin(/* team */ 2, /* score */ 0, /* bool */ true, /* ? */ 0);
        } else {
          this.RoundTimeLeft();
        }
      }
    }
    // RestartRound: trigger when m_flRoundStartTime is in the past AND
    // the sentinel is strictly different from m_flRoundStartTime.
    if (this.m_flRoundStartTime < time &&
        isOrderedFloatCompare(sentinel_6f408, this.m_flRoundStartTime) &&
        sentinel_6f408 !== this.m_flRoundStartTime) {
      this.RestartRound();
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 4. Vote processing (always)
  // ═══════════════════════════════════════════════════════════════════
  this.CheckVotes();

  // ═══════════════════════════════════════════════════════════════════
  // 5. Round-timelimit HUD broadcast
  // ═══════════════════════════════════════════════════════════════════
  // Assembly uses `fild` to load m_iDisplayedTimelimit as an int,
  // then `fcomp` against the cvar. Update the cached int only when
  // the cvar's truncated value differs.
  if (isOrderedFloatCompare(this.m_iDisplayedTimelimit, timelimitCvar)) {
    const newTimelimit = Math.trunc(timelimitCvar);
    if (newTimelimit !== this.m_iDisplayedTimelimit /* +0x578 */) {
      this.m_iDisplayedTimelimit = newTimelimit;
      hudBegin(/* channel */ 2);
      hudWrite(/* msgIdx */ 0);
      hudWrite(newTimelimit);
      hudEnd();
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 6. Embedded bullet manager tick
  // ═══════════════════════════════════════════════════════════════════
  if (this.m_bulletManagerFlag /* +0x5864 */ !== 0) {
    (this as any).m_BulletManager /* embedded @ +0x1864 */.Think();
  }

  // ═══════════════════════════════════════════════════════════════════
  // 7. HUD flag broadcast (round-has-winner / has-time-left boolean)
  // ═══════════════════════════════════════════════════════════════════
  if (isOrderedFloatCompare(this.m_iDisplayedHudFlag, hasWinnerOrTimeLeftCvar)) {
    const value = Math.trunc(hasWinnerOrTimeLeftCvar);
    this.m_iDisplayedHudFlag /* +0x558 */ = value;
    const flag = value !== 0 ? 1 : 0;
    hudBegin(/* channel */ 2);
    hudWrite(/* msgIdx */ 1);                 // message id = 1
    hudWrite(flag);                            // boolean value
    hudEnd();
  }

  // ═══════════════════════════════════════════════════════════════════
  // 8. Ammo count cache + HUD broadcast + Set_ammo_count side-effect
  // ═══════════════════════════════════════════════════════════════════
  const ammo = Math.trunc(ammoCvar);
  if (ammo !== this.m_iDisplayedAmmoCount /* +0x55c */) {
    this.m_iDisplayedAmmoCount = ammo;
    Set_ammo_count(ammo);
    hudBegin(/* channel */ 2);
    hudWrite(/* msgIdx */ 2);                  // message id = 2
    hudWrite(ammo);                            // value
    hudEnd();
  }
}

// ───────────────────────────────────────────────────────────────────────
// Engine / TS-isolation notes
// ───────────────────────────────────────────────────────────────────────

declare class CTSGameRules {
  // ── State / timers ──
  m_iGameState: number;             // +0x00  byte  (0, 1, 2, ...)
  m_bPowerupArmed: number;          // +0x01  byte  (0xff → 1 on first run)
  m_flNextPowerupTime: number;      // +0x04  float
  m_flRoundEndTime: number;         // +0x08  float
  m_flRoundStartTime: number;       // +0x0c  float
  m_bRoundHasWinner: number;        // +0x10  byte

  // ── HUD-cached displayed values ──
  m_iDisplayedHudFlag: number;      // +0x558  int
  m_iDisplayedAmmoCount: number;    // +0x55c  int
  m_iDisplayedTimelimit: number;    // +0x578  int

  // ── Slow motion ──
  m_flSlowMotionEnd: number;        // +0x560  float
  m_flSlowMotionFactor: number;     // +0x564  float  (passed to GSM2)
  m_flSlowMotionStart: number;      // +0x568  float

  // ── CTB / "The One" ──
  m_iTheOneCount: number;           // +0x5876  byte
  m_flNextTheOneTime: number;       // +0x587c  float

  // ── Bullet manager ──
  m_bulletManagerFlag: number;      // +0x5864  dword  (null = absent)
                                    // +0x1864  embedded CBulletManager

  // ── Dead-player sweep schedule ──
  m_flNextDeadCheckTime: number;    // +0x5880  float

  // ── CVAR mirrors ──
  m_bCTBEnabled: boolean;           // mirrors cvar @ GOT+0x12cc
  m_bRoundsEnabled: boolean;        // mirrors cvar @ GOT+0x152c

  // ── Methods ──
  GlobalSlowMotion2(factor: number, restart: boolean): void;
  CheckDeads(): void;
  GetRandomPowerup(range: number, cvar: number): number;  // 2-arg per disassembly
  PutPowerUp(id: number): number;
  SelectRandomTheOne(): void;
  RestartRound(): void;
  TeamWin(team: number, score: number, flag: boolean, extra: number): void;
  RoundTimeLeft(): void;
  CheckVotes(): void;
}

declare const currentTime: number;
declare const gateCvar_6f408: number;        // placeholder for GOT-0x6f408 sentinel
declare const powerupModeCvar: number;
declare const powerupOverrideCvar: number;
declare const powerupRollChanceCvar: number;
declare const powerupSuccessIntervalCvar: number;
declare const powerupDefaultIntervalCvar: number;
declare const powerupRescheduleThresholdCvar: number;  // GOT-0x6e770
declare const theOneReselectIntervalCvar: number;      // GOT-0x6f06c
declare const timelimitCvar: number;                   // GOT+0x1734+0xc
declare const hasWinnerOrTimeLeftCvar: number;         // GOT+0x1480+0xc
declare const ammoCvar: number;                        // GOT+0x18bc+0xc
function isOrderedFloatCompare(a: number, b: number): boolean;
function randomFloat(min: number, max: number): number;
function maxClients(): number;
function UTIL_PlayerByIndex(i: number): CBasePlayer | null;
function hudBegin(channel: number): void;
function hudWrite(value: number): void;
function hudEnd(): void;
function Set_ammo_count(n: number): void;

declare class CBasePlayer {
  m_bIsTheOne: boolean;             // +0x7b9
  IsAlive(): boolean;
  IsDormant(): boolean;
}
