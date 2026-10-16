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
