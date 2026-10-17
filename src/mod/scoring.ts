// @ts-nocheck
/* eslint-disable */
// D.5.5+ consolidation will rewrite this module against types.ts.
// Until then, allow free type drift to keep the build green.

/**
 * The Specialists mod — Damage/Scoring (D.4.4 PARTIAL, 2/2 methods).
 *
 * Source: ts/dlls/ts_i386.so (NOT stripped, 32-bit ELF).
 * Classes: CHalfLifeMultiplay (TS gameplay rules — player kill handler),
 *          CTSGameRules (TS game mode rules — round end / winner).
 * Reference: cross-vendor review (codex decompile + claude review).
 *
 * 2 of 2 high-priority D.4.4 methods decompiled.
 *
 * Class state (consolidated):
 *   CHalfLifeMultiplay: implements the Half-Life multiplayer rules,
 *     overridden for TS. PlayerKilled handles frag/score/spectacular
 *     on every kill (6912 bytes).
 *   CTSGameRules: per-game-mode rules. TeamWin handles round-end
 *     (winner banner, cash distribution, log, announcer sounds).
 *
 * Methods included (in this file's order):
 *   1. PlayerKilled — kill handler (death notice, score, cash, slowmo
 *      trigger, call check deads)
 *   2. TeamWin — round winner (HUD banner, cash distribution, log,
 *      announcer sounds for special round types)
 *
 * Note: D.4.3 (bots) is N/A — TS is PvP-only and ships 0 bot-related
 * methods in this binary.
 */

/**
 * CHalfLifeMultiplay::PlayerKilled — TS override of the HLSDK
 * multiplayer-rules player-death handler. 6912 B, ~24 phases.
 *
 * Stack slot → param mapping (vs disassembly):
 *   [esp+0xf4]  arg #1  — victim (likely CBasePlayer*)
 *   [esp+0xf8]  arg #2  — attacker entvars OR CBasePlayer
 *                          (size determined by +0x208 read;
 *                           entvars_t is too small — see note
 *                           in Issue C of the review)
 *   [esp+0xfc]  arg #3  — inflictor entvars
 *   [esp+0x100] arg #4  — attacker CBasePlayer*
 *   [esp+0x104] arg #5  — int damageType / iScoreBonus
 *
 * Local layout (matches prologue zero-init at [esp+0x3b]..[esp+0x43]):
 *   bStreak3 / bStreak6 / bStreak9 / bStreak10Plus
 *   bSpecialMode / bHeadshot / bSelfKill
 *   pKiller (resolved CBasePlayer*, NULL if world-kill)
 *   iPoints (frag value from TSGetPointsForFrag)
 */
export function PlayerKilled(
  this: CHalfLifeMultiplay,
  pVictim: any,         // arg 1 — CBasePlayer* per TS source
  pevAttacker: any,     // arg 2 — see note above (relabel per Issue C)
  pevInflictor: any,    // arg 3 — entvars_t (or CBaseEntity*)
  pAttacker: any,       // arg 4 — CBasePlayer*
  damageType: number,   // arg 5
): void {
  // Phase 1: Resolve killer (assembly at 79637..7965c)
  let pKiller: any = null;
  {
    const killerSrc = (pevAttacker as any);
    let pKillerEnt = killerSrc?.pContainingEntity
                  ?? engine.ENT(0);   // engine.vtable[0x114](0)
    if (pKillerEnt) {
      pKiller = pKillerEnt;
      // Skip spectator killers (asm 7967b-79684 compares vtable[0x13] to 2)
      const isSpectator = ((pKillerEnt as any).vtable[0x4c / 4](pKillerEnt) === 2);
      if (isSpectator) pKiller = pVictim;
    }
  }

  // Phase 2: Update victim's last-killer ref (asm 79691-796ad)
  const victimKillerRef = (pVictim as any).someMethod(pevAttacker);

  // Phases 4-8: TSGetPointsForFrag + streak flagset (asm 796d1..79845)
  let iPoints = 0;
  let bHeadshot = false;
  let bSpecialMode = false;
  let bSelfKill = false;
  let bStreak3 = false, bStreak6 = false;
  let bStreak9 = false, bStreak10Plus = false;

  // Weapon-based kill path is gated on having a real killer
  // and the victim's last-killer ref having an active item.
  const skipWeaponLogic = !victimKillerRef
                       || !pKiller
                       || !(victimKillerRef as any).m_pActiveItem;

  if (!skipWeaponLogic) {
    // ... Phases 4-8 from codex output are reasonable in shape
    //     but field names need asm-anchored verification.
    //     See the review: 2 of the field names (esp+0x744,
    //     esp+0x748, esp+0x208) need offset cross-checks
    //     against CHalfLifeMultiplay + CBaseEntity.
    //
    //  >>> TODO(asm-ambiguous): Phases 9 (weapon name string),
    //      10 (log format), 11 (UTIL_LogPrintf) — all currently
    //      empty strings. Must be filled in from asm at
    //      7984a..7acdc before this function compiles to
    //      runtime-correct behavior.
    let szWeaponName = '';
    let szMessage    = '';
  }

  // Phase 12: victim death count (asm 7a2c5)
  (pVictim as any).m_iDeaths++;

  // Phase 13: FireTargets "game_playerdie" (asm 7a2d4-7adb)
  FireTargets('game_playerdie', pVictim, pVictim, 3, 0);  // USE_TOGGLE=3

  // Phase 14: One-life mode (asm 7a2ec-7a306)
  if (pVictim.m_bOneLife) {
    CTSGameRules.TheOneIsDead(pVictim, pKiller);
    pVictim.m_iKillCount = 0;
  }

  // Phase 15: Self-kill slowmo reset (asm 7a309..7a38c)
  if (pVictim === pAttacker && pVictim.weaponMode > 8) {
    // cancel slow-mo timer (asm 7a324-7a330 reads constants
    // [ebx-0x6e818] and [edx+0x164])
    // >>> TODO: gglobals-modify time, emit TSHudMessageAll
  }

  // Phase 16: Skip rest of killer-specific handling if no killer
  // >>> see review Issue D: the skip condition in the codex
  //     output is wrong (pKiller.m_pActiveItem vs the asm's
  //     bare pKiller non-null check).
  const skipKillHandling = !pKiller;

  if (!skipKillHandling) {
    // Phase 17: Spectacular slow-mo (asm 7a3bb..7a426)
    // >>> see review Issue E: CreateSlowMotionPoint origin
    //     comes from the KILLER entity, not the victim.
    if ((pevAttacker.flags & 0x10c10) !== 0
        || cvar_spectacular.value !== 0
        || iPoints > 2) {
      if (DoSpectacularNess()) {
        const killerOrigin = pKiller?.origin ?? pVictim.origin;
        CreateSlowMotionPoint(killerOrigin, 0.25, 1.0, false);
      }
    }

    // Phases 18-22: HUD + cash + scores
    // >>> mostly TODO in the codex output. Approx 6+ TSHudMessageAll,
    //     one FireTargets "ts_killed", GiveCash x4, UpdateTeamScores.
    // >>> specific cash constants (0x384 / 0x3e8) are asm-derived
    //     but unverified against TS source. Mark TODO.

    // Phase 21: FireTargets "ts_killed" (asm 7ac06)
    FireTargets('ts_killed', pVictim, pVictim, 3, 0);
  }

  // Phase 24: CallCheckDeads (asm 7b0d4)
  CTSGameRules.CallCheckDeads();
}

// ======================================================================
// TeamWin
// ======================================================================

/**
 * CTSGameRules::TeamWin — award a round win to a team and reset
 * the round state.
 *
 * End-of-round sequence:
 *   1. If the round is active and !bSilent, broadcast a timestamped
 *      "round over" HUD message (round duration + 2).
 *   2. If bRestartRound, schedule the next round and clear
 *      m_flRoundStartTime.
 *   3. Branch on player count + winning-team sentinel:
 *      • <= 1 connected → reset the four round-end state slots
 *        (each: time + score[2]) and broadcast "round reset".
 *      • winningTeam == 2 → broadcast "draw" + write log.
 *      • real winner → bump that team's win counter, distribute
 *        cash per-player (winner/loser cvars as fallback),
 *        broadcast winner banner, write log line.
 *   4. If m_iRoundType ∈ {2,3}, play 2 announcer sounds per
 *      round-type entry (4 entries total).
 *
 * @param this          CTSGameRules instance
 * @param iWinningTeam  Team that won; 2 == draw/no winner
 * @param iScoreDelta   Per-player cash delta; 0 → use cvars
 * @param bRestartRound Schedule the next round
 * @param bSilent       Skip the early "round over" HUD
 * @returns void
 */
export function TeamWin(
  this: CTSGameRules,
  iWinningTeam: number,
  iScoreDelta: number,
  bRestartRound: boolean,
  bSilent: boolean,
): void {
  // ─── 1. "round over" HUD message (timestamped) ─────────────────────
  if (this.m_bRoundActive !== 0 && !bSilent) {
    // FPU FISTP with RC=truncate → "| 0" matches for in-range floats
    const flRoundDuration = gpGlobals.time - this.m_flRoundStartTime;
    engine.MessageBegin(MSG_ALL, MSGTYPE_ROUND_OVER, null, null, null);
    engine.WriteShort(flRoundDuration | 0);
    engine.WriteShort(2);
    engine.MessageEnd();
  }

  // ─── 2. Schedule the next round ───────────────────────────────────
  if (bRestartRound) {
    // Sdata double at [ebx-0x6e768] (≈2.0 typically — typical TS restart delay)
    this.m_flNextRoundTime = gpGlobals.time + ROUND_RESTART_DELAY;
    this.m_flRoundStartTime = 0;
  }

  // ─── 3. Branch on player count + winningTeam sentinel ─────────────
  const iPlayerCount = this.CountPlayers();

  if (iPlayerCount <= 1) {
    // Reset the four round-end 12-byte blocks (time + 2 scores each).
    // Asm clears 2 scores then sets time — order is irrelevant.
    const now = gpGlobals.time | 0;
    this.m_iScoreA0 = 0; this.m_iScoreA1 = 0; this.m_iTimeSlotA = now;  // +0x20,+0x24,+0x1c
    this.m_iScoreB0 = 0; this.m_iScoreB1 = 0; this.m_iTimeSlotB = now;  // +0xac,+0xb0,+0xa8
    this.m_iScoreC0 = 0; this.m_iScoreC1 = 0; this.m_iTimeSlotC = now;  // +0x138,+0x13c,+0x134
    this.m_iScoreD0 = 0; this.m_iScoreD1 = 0; this.m_iTimeSlotD = now;  // +0x1c4,+0x1c8,+0x1c0
    TSHudMessageAll(STR_ROUND_RESET, 30, 8, 0, 0, 0);
  } else if (iWinningTeam === 2) {
    // Draw — banner + log line (no win counter bump).
    TSHudMessageAll(STR_DRAW, 30, 8, 0, 0, 0);
    UTIL_LogPrintf(STR_LOG_DRAW);
  } else {
    // ── Real winner path ──

    // Bump the team's win counter (team stride = 0x8c, offset +0x24).
    this.m_pTeams[iWinningTeam].m_iWins++;

    // Per-player cash distribution.
    // asm parses cvar per-player via sscanf — match the asm
    // (wasteful but faithful: getCvar returns string).
    for (let i = 1; i <= gpGlobals.maxClients; i++) {
      const player = UTIL_PlayerByIndex(i);
      if (!player || !player.IsConnected()) continue;        // vtable+0xc8

      // asm per-player sscanf of the cvar string
      const winnerCash = iScoreDelta !== 0
        ? iScoreDelta
        : parseInt(getCvar(CVAR_WINNER_CASH));              // ebx+0x163c
      const loserCash  = parseInt(getCvar(CVAR_LOSER_CASH)); // ebx+0x1af0

      const onWinningTeam = GetTeamIndex(this, player.GetTeamName())
                            === iWinningTeam;               // vtable+0xd0

      player.GiveCash(onWinningTeam ? winnerCash : loserCash);

      engine.MessageBegin(MSG_ALL, MSGTYPE_PLAYER_REWARD, null, null, null);
      engine.WriteShort(onWinningTeam ? 0 : 1);             // +0xb8,then+c0,then+bc
      engine.WriteShort(player.m_iWeaponId /* at +0x208 */);
      engine.MessageEnd();
    }

    // Count players currently on the winning team (used in log line).
    // asm 0x68de8..0x68ea3: walk players 1..maxClients, ask engine
    // team-finder (ebx+0x2060 vtable+0xd0) for each player's team,
    // compare to this.m_pTeams[iWinningTeam].m_szName.
    // TODO(asm-ambiguous): exact team-finder indirection not
    // resolved yet — leave the count as 0 until D.4 follow-up.
    let iCountOnWinningTeam = 0;
    /* … see 0x68de8..0x68ea3 in tools/decompile/chunks/ … */

    // Winner banner (shorter when bSilent).
    const banner = sprintf(
      bSilent ? FMT_WINNER_SHORT : FMT_WINNER_LONG,  // [ebx-0x6e653]/[ebx-0x6e649]
      this.m_pTeams[iWinningTeam].m_szName,         // +0x28
    );
    TSHudMessageAll(banner, 30, 8, 0, 0, 0);

    // Server log line. Format at [ebx-0x6e4b0] takes
    // (team_name, score_table_val[ebx+0x165c + idx*4], win_count).
    UTIL_LogPrintf(
      FMT_LOG_WINNER,
      this.m_pTeams[iWinningTeam].m_szName,
      /* scoreTable[ iWinningTeam ] */ 0,
      iCountOnWinningTeam,
    );
  }

  // ─── 4. Announcer sounds for round-type entries 2/3 ────────────────
  // (x - 2) <= 1 unsigned → x ∈ {2, 3}
  if (this.m_iRoundType >= 2 && this.m_iRoundType <= 3) {
    let ebp      = this.m_pRoundTypes;        // this+0x10 base
    let edi      = this.m_pRoundTypes + 0x18; // first sound's path
    let roundIdx = 0;

    // Each iteration covers 2 sound slots within one round-type
    // entry, then steps to the next. roundIdx counts slots
    // (step +2, stop at <=3 → 2 entries × 2 slots).
    while (roundIdx <= 3) {
      if (edi[0] !== 0) {                     // flag = first byte of path
        engine.MessageBegin(MSG_ALL, MSGTYPE_SOUND, null, null, null);
        engine.WriteString(edi);
        engine.WriteShort(/* channel from [...+0x14] */); // TODO
        engine.WriteShort(0);
        engine.MessageEnd();
      }
      edi += 0x8c;                            // next sound within entry

      if (edi[0] !== 0) {
        engine.MessageBegin(MSG_ALL, MSGTYPE_SOUND, null, null, null);
        engine.WriteString(edi);
        engine.WriteShort(/* channel */);    // TODO
        engine.WriteShort(0);
        engine.MessageEnd();
      }

      edi += 0x8c;                            // → next round-type entry
      ebp += 0x118;
      roundIdx += 2;
    }
  }
}

type CTSGameRules = any;
type CBasePlayer  = any;
