```typescript
/**
 * CHalfLifeMultiplay::PlayerKilled — handles a player death in The Specialists.
 *
 * Resolves the killer's player from the attacker entvars, computes kill-type
 * flags (self-kill, headshot, multi-kill tier, knife/special kill), awards
 * cash and frag points, updates team scores and best-streak counters, formats
 * and broadcasts the kill log message, fires game_playerdie targets, and
 * finally triggers CTSGameRules::CallCheckDeads.
 *
 * The TS source signature is most likely:
 *   void CHalfLifeMultiplay::PlayerKilled(
 *     CBasePlayer* pVictim, entvars_t* pevAttacker,
 *     entvars_t* pevInflictor, CBasePlayer* pAttacker, ...);
 * The mangled name only shows 2 explicit args, but the disassembly reads
 * up to [esp+0x104] = 5 stack slots past `this`, so TS almost certainly has
 * more parameters.  Names below are best-effort guesses.
 *
 * @param this  The CHalfLifeMultiplay rules instance (this in the original C++)
 * @returns     void
 */
export function PlayerKilled(this: CHalfLifeMultiplay): void {
  // ============================================================
  // Local state (booleans/dwords zeroed at the top of the function).
  // ============================================================

  // Kill-streak tier flags — set when the killer's consecutive-kill
  // counter crosses one of these thresholds.
  let bStreak3      = false; // [esp+0x3e]  counter == 3
  let bStreak6      = false; // [esp+0x3d]  counter == 6
  let bStreak9      = false; // [esp+0x3b]  counter == 9
  let bStreak10Plus = false; // [esp+0x3c]  counter > 9

  // Weapon / kill-mode flags
  let bSpecialMode  = false; // [esp+0x3f]  weaponMode > 8 (slowmo-mode kill)
  let bHeadshot     = false; // [esp+0x40]  headshot detected by timing
  let bSelfKill     = false; // [esp+0x41]  inflictor == victim (no real killer)

  // Reserved / unused locals (still allocated and zeroed at prologue)
  let bReserved42   = false; // [esp+0x42]
  let bReserved43   = false; // [esp+0x43]

  // Resolved killer CBasePlayer* (NULL if world-kill)
  let pKiller: any = null; // [esp+0x30]

  // Frag points awarded for this kill
  let iPoints = 0;           // [esp+0x34]

  // ============================================================
  // Parameters — read off the caller's stack frame.
  // ============================================================
  const pVictim: any       = null as any;  // arg [esp+0xf4]
  const pevAttacker: any   = null as any;  // arg [esp+0xf8]
  const pevInflictor: any  = null as any;  // arg [esp+0xfc]
  const pAttacker: any     = null as any;  // arg [esp+0x100]
  const damageType: number = 0;            // arg [esp+0x104]

  // ============================================================
  // Phase 1 — Resolve killer entity from attacker entvars.
  // ============================================================
  // Walk pevAttacker -> "pContainingEntity" (TS extension at +0x208).
  // Standard HL entvars_t doesn't have a direct pContainingEntity
  // field; this is a TS-specific offset (probably a union or a
  // per-engine extension the decompiler treats as opaque).
  let pKillerEnt = (pevAttacker as any).pContainingEntity;  // [edx+0x208]
  if (!pKillerEnt) {
    // Fallback: engine.ENT(NULL) returns worldspawn
    pKillerEnt = engine.ENT(0);  // engine.vtable[0x114](0)
  }
  if (pKillerEnt) {
    // TS-specific: the player ptr is at +0x7c from the entity
    pKiller = pKillerEnt;  // [eax+0x7c]
  }

  // Spectator killer (team == 2)? -> Treat as self-kill.
  if (pKiller && pKiller.team === 2) {
    pKiller = pVictim;
  }

  // ============================================================
  // Phase 2 — Process victim (call vtable method).
  // ============================================================
  // pVictim->vtable[0x6c/4] — probably updates m_pLastKiller and
  // returns the CBaseEntity* of the killer.  Stored in [esp+0x38].
  const victimKillerRef = (pVictim as any).someMethod(pevAttacker);
  // NOTE: local `victimKillerRef` is the CBaseEntity* the victim
  // thinks killed them — distinct from pKiller above.

  // ============================================================
  // Phase 3 — Skip weapon-based logic if no real killer.
  // ============================================================
  const skipWeaponLogic = !victimKillerRef
                        || !pKiller
                        || !(victimKillerRef as any).m_pActiveItem;

  if (!skipWeaponLogic) {
    // ========================================================
    // Phase 4 — Compute frag points via TSGetPointsForFrag.
    // ========================================================
    // Signature: int TSGetPointsForFrag(
    //   CBasePlayer* p1, entvars_t* p2, CBasePlayer* p3,
    //   int i4, bool* b5, bool* b6);
    // Returns the frag-point value; may also set headshot / special
    // out-bools.
    iPoints = TSGetPointsForFrag(
      pVictim, pevAttacker, victimKillerRef,
      damageType,
      bHeadshot ? 1 : 0,     // out: headshot flag
      bSpecialMode ? 1 : 0,  // out: special-mode flag
    );

    // ========================================================
    // Phase 5 — Determine weapon-category flags.
    // ========================================================
    const weaponId = (victimKillerRef as any).m_pActiveItem.weaponId;
    const wType    = GetWeaponType(weaponId);  // [esi+0xc8]

    // Melee / special weapons: type 2,3 (knife etc.) and type 0xb
    const isMeleeOrSpecial = (wType - 2 <= 1) || (wType === 0xb);

    if (!isMeleeOrSpecial
        && !cvar_sv_slowmotion.value
        && !cvar_slowmotion.value) {
      // pevInflictor == pAttacker: same entity (no real weapon owner)
      if (pevInflictor === pAttacker) {
        bSelfKill = true;
      }
    }

    // ========================================================
    // Phase 6 — Headshot detection (timing).
    // ========================================================
    // If time-since-last-hit < threshold, it's a headshot.
    const dtSinceHit = gpGlobals.time - pKiller.m_flLastHit;  // [edi+0x748]
    if (dtSinceHit < HEADSHOT_TIME_THRESHOLD) {  // cvar [ebx-0x6de50]
      bHeadshot = true;
    }

    // ========================================================
    // Phase 7 — Special weapon-mode bonus.
    // ========================================================
    if (pKiller.weaponMode > 2) {        // [edx+0x744]
      if (pKiller.weaponMode > 8) {
        bSpecialMode = true;
      }
    }

    // ========================================================
    // Phase 8 — Increment killer's consecutive-kill counter
    //          and set matching streak-tier flag.
    // ========================================================
    if (pKiller.m_iKillCount <= 0xfe) {  // byte, wraps at 0xff
      pKiller.m_iKillCount++;            // [edi+0x744]
    }
    if      (pKiller.m_iKillCount > 9)  bStreak10Plus = true;
    else if (pKiller.m_iKillCount === 9) bStreak9     = true;
    else if (pKiller.m_iKillCount === 6) bStreak6     = true;
    else if (pKiller.m_iKillCount === 3) bStreak3     = true;

    // ========================================================
    // Phase 9 — Build weapon-name string for the log message.
    // ========================================================
    // Many branches; the result identifies the kill's weapon/cause.
    // Shape (simplified):
    //   - If self-kill / world: "world" or pevInflictor.classname
    //   - Else if knife / knife-disguised-as-attacker: "knife"
    //   - Else: pAttacker.classname or pevInflictor.classname
    // Then normalize the resulting string:
    //   - ASCII uppercase letters (0x41..0x5A) → add -0xe0 → lowercase
    //   - spaces (' ') → underscores ('_')
    // TODO(asm-ambiguous): the many branches are hard to express
    // cleanly in TS; this is a heavily-simplified summary.
    let szWeaponName = '';

    // ========================================================
    // Phase 10 — Format log message.
    // ========================================================
    // Multiple variants based on cvar_mlmp.value (mod-log mode):
    //   7 = format A ; 8 = format B ; 5 = format C ; default = format D
    // Plus world-kill and mod-bonus variants.
    // Standard format:
    //   "\"%s<%i><%s><%s>\" killed \"%s<%i><%s><%s>\" with \"%s\"\n"
    //   where the %s fields are attacker/victim name|index|classname|team
    //   and the final %s is szWeaponName.
    let szMessage = '';

    // ========================================================
    // Phase 11 — Print log.
    // ========================================================
    UTIL_LogPrintf(szMessage);
  }

  // ============================================================
  // Phase 12 — Update victim's death count.
  // ============================================================
  pVictim.m_iDeaths++;  // [edi+0xb30]

  // ============================================================
  // Phase 13 — Fire "game_playerdie" target.
  // ============================================================
  FireTargets("game_playerdie", pVictim, pVictim, USE_TOGGLE, 0);

  // ============================================================
  // Phase 14 — One-life mode handling.
  // ============================================================
  if (pVictim.m_bOneLife) {  // [edi+0x7b9]
    CTSGameRules.TheOneIsDead(pVictim, pKiller);
    pVictim.m_iKillCount = 0;
  }

  // ============================================================
  // Phase 15 — Reset slowmo timer if victim killed in own slowmo.
  // ============================================================
  if (pVictim === pAttacker) {                       // self-kill
    if (pVictim.weaponMode > 8) {
      gpGlobals.time -= SLOWMO_DURATION;
      TSHudMessageAll(/* "Slow motion cancelled" */);
    }
  }
  // Always decrement slowmo by some fixed amount at end of kill
  gpGlobals.time -= SLOWMO_POST_SLOT;  // TODO: actual value

  // ============================================================
  // Phase 16 — Skip kill-specific handling if no real killer.
  // ============================================================
  const skipKillHandling = !pKiller || !pKiller.m_pActiveItem;

  if (!skipKillHandling) {
    // ========================================================
    // Phase 17 — Spectacular kill check (slow-motion replay).
    // ========================================================
    // Triggers if (any of):
    //   - pevAttacker->flags & 0x10c10
    //   - some cvar is non-zero
    //   - [esp+0x28] (iPoints / frag bonus) > 2
    if ((pevAttacker.flags & 0x10c10) !== 0
        || cvar_spectacular.value !== 0
        || iPoints > 2) {
      if (DoSpectacularNess()) {
        // Create slow-mo replay camera at victim's origin
        CreateSlowMotionPoint(pVictim.origin, 0.25, 1.0, false);
      }
    }

    // ========================================================
    // Phase 18 — HUD messages for special kill types.
    // ========================================================
    // Many TSHudMessageAll calls based on the flags above:
    //   - streak > 2: "First Blood!", "Headshot!", etc.
    //   - knife kill: "Knife master"
    //   - slowmo-mode kill: "Slowmotion kill"
    //   - special-mode kill: "Critical kill"
    //   - multi-kill tiers (bStreak3/6/9/10Plus):
    //     "Double!", "Mega!", "Ultra!", "Monster!", etc.
    //   - self-kill: suicide messages
    //   - cash bonus awards, first-kill-of-round, etc.
    // ... about a dozen TSHudMessageAll calls.

    // ========================================================
    // Phase 19 — Award cash.
    // ========================================================
    // cvar_cashmode controls which cash-tier scheme is used.
    if (cvar_cashmode.value > 1) {
      pAttacker.GiveCash(CashTier_A_for(/*killerIndex*/ 0));
      pVictim.GiveCash(0x384);
    } else {
      pAttacker.GiveCash(CashTier_B_for(/*killerIndex*/ 0));
      pVictim.GiveCash(0x3e8);
    }

    // ========================================================
    // Phase 20 — Update team scores.
    // ========================================================
    const teamId = CTSGameRules.GetTeamId(pVictim.GetTeamName());
    CTSGameRules.UpdateTeamScores(teamId, iPoints);

    // ============================================================
    // Phase 21 — Fire "ts_killed" target.
    // ============================================================
    FireTargets("ts_killed", pVictim, pVictim, USE_TOGGLE, 0);

    // ========================================================
    // Phase 22 — Best kill streak tracking.
    // ========================================================
    if (pVictim.m_flBestKillStreak < cvar_bestStreak.value) {
      pVictim.m_flBestKillStreak = gpGlobals.time;
      pVictim.m_bBestStreak = true;
    } else if (pVictim.m_flBestKillStreak < gpGlobals.time) {
      pVictim.m_flBestKillStreak = gpGlobals.time;
      pVictim.m_bBestStreak++;
    }
    if (pVictim.m_bBestStreak > 2) {
      // Announce "best streak" achievement (multi-line
      // ClientPrint / UTIL_ClientPrintAll messages).
      // TODO: build the actual formatted strings.
    }
  }

  // ============================================================
  // Phase 23 — HUD updates.
  // ============================================================
  // Big block of HUD calls updating:
  //   - victim info (timestamp, weapon, frag count)
  //   - killer info (weapon, frag count)
  //   - kill counter
  //   - best-weapon streak
  //   - double-kill detection (pevAttacker->somefield + bonus)

  // ============================================================
  // Phase 24 — Final cleanup.
  // ============================================================
  CTSGameRules.CallCheckDeads();
}
```
