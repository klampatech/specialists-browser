```typescript
/**
 * CTSBriefcase::CaptureTouch — fires when something touches the briefcase entity.
 *
 * Guards that the toucher is an alive, flag-carrying player who passes
 * CanInteract. Then: logs the capture, bumps the previous carrier's stats,
 * drops the flag, fires any "on capture" target on the toucher, broadcasts a
 * HUD message, and either resets per-team stats (single-player) or extends
 * the briefcase respawn timer, increments the capturer's team score, and
 * re-broadcasts ScoreInfo notices to every player + per-team updates to
 * all clients (multiplayer).
 *
 * @param this    The CTSBriefcase instance (C++ this pointer)
 * @param pOther  The entity that touched the briefcase (expected: CBasePlayer)
 * @returns void
 */
export function CaptureTouch(this: CTSBriefcase, pOther: CBaseEntity): void {
  // ── Preconditions (any failure aborts the capture) ──────────────
  if (this.m_fActive === 0) return;          // +0x64 — briefcase "armed" flag
  if (!pOther.IsPlayer()) return;             // vtable +0xc8
  if (!pOther.IsAlive()) return;              // vtable +0xb4
  if (!HaveFlag(pOther as any)) return;
  if (!CanInteract(this, pOther)) return;

  // ── Log the capture event ───────────────────────────────────────
  // The asm invokes STRING() three times on pev->model (one via a different
  // engine helper at engfuncs+0x23c), mixes in the player's netname and a
  // team/role string_t at pOther+0x7d4, and formats via UTIL_LogPrintf at
  // GOT-0x6cc90. Argument order matches the asm push order (LIFO → C order).
  // TODO(asm-ambiguous): the precise mapping of pev fields to log args isn't
  // fully resolved — pev+0x1d0 (netname), pev+0x208 (model, called twice),
  // pOther+0x7d4 (team/role string_t), and a second engine stringify call
  // (engfuncs+0x23c) all feed the same format string.
  UTIL_LogPrintf(
    kCaptureLogFormat,                       // GOT-0x6cc90
    STRING(pOther.pev.netname),              // pev+0x1d0
    STRING((pOther as any).teamId),          // +0x7d4 string_t
    STRING(pOther.pev.model),                // pev+0x208 (first call)
    /* + second stringify via engfuncs+0x23c */
    STRING(pOther.pev.model),                // pev+0x208 (third call)
  );

  // ── Bump the previous carrier's stats via EHANDLE at pOther+0x7e4 ─
  // The asm dereferences the EHANDLE then writes (offsets relative to it):
  //   +0xc    ← 0xffff0000     (status / flag dword)
  //   +0x10   ← *(GOT+0x1ccc)  (some global int)
  //   pev+0x104 += cvar value at GOT-0x6df78 (capture-points cvar)
  //                + a value read from a doubly-dereferenced engine global
  const prevCarrier = (pOther as any).m_hCarrier?.Entity?.();
  if (prevCarrier != null) {
    prevCarrier.statusDword = 0xffff0000;
    prevCarrier.someField = (g as any).capturePointsDword;       // GOT+0x1ccc
    prevCarrier.pev.fuser4 +=      cvar_capturePoints.value +                                // GOT-0x6df78
      ((engineGlobals.pevCapturePoint as number) ?? 0);
  }

  // ── Capturer drops the flag ─────────────────────────────────────
  DropFlag(pOther as any, true);

  // ── Fire the toucher's "on capture" target (if any) ─────────────
  if (pOther.pev.target !== 0) {             // pev+0x1c8
    FireTargets(STRING(pOther.pev.target), pOther, pOther, USE_TYPE_3, 0.0);
  }

  // ── HUD capture announcement ────────────────────────────────────
  if (this.pev.message !== 0) {              // pev+0x1d4
    TSHudMessageAll(0, 0xff, 0, /* holdtime */ 0x1e, /* channel */ 0x08,
                    STRING(this.pev.message));
  }

  // ── Fork: single-player vs. multiplayer ─────────────────────────
  if (CountPlayers(g_pGameRules) <= 1) {
    // Single-player: wipe all per-team stat blocks and announce.
    // TODO(asm-ambiguous): the asm writes 0 to GameRules offsets
    // 0x1c/0x20/0x24, 0xa8/0xac/0xb0, 0x134/0x138/0x13c, 0x1c0/0x1c4/0x1c8 —
    // these correspond to per-team score / round-state fields whose
    // exact names are not documented in this chunk.
    g_pGameRules.team0_a = 0; g_pGameRules.team0_b = 0; g_pGameRules.team0_c = 0;
    g_pGameRules.team1_a = 0; g_pGameRules.team1_b = 0; g_pGameRules.team1_c = 0;
    g_pGameRules.team2_a = 0; g_pGameRules.team2_b = 0; g_pGameRules.team2_c = 0;
    g_pGameRules.capture_a = 0; g_pGameRules.capture_b = 0; g_pGameRules.capture_c = 0;
    TSHudMessageAll(0, 0, 0, 0x1e, 0x08, kSinglePlayerMessage);  // GOT-0x6e66e
    return;
  }

  // ── Multiplayer: extend briefcase respawn by 10 s ───────────────
  this.pev.nextthink += 10.0;                // pev+0x164

  // ── Per-team HUD capture message ────────────────────────────────
  const teamMsg = UTIL_VarArgs(
    kCaptureMsgFormat,                       // GOT-0x6cc30
    STRING(this.pev.netname),                // pev+0x1d0
  );
  TSHudMessageAll(0, 0xff, 0, 0x1e, 0x04, teamMsg);

  // ── Engine "ScoreInfo" broadcast for the capturer ────────────────
  // The asm chains g_engfuncs calls in the pattern
  //   msg_begin(type, dest, …) → write_byte → write_short → write_string
  //   → write_string("") → msg_end
  // with payload drawn from globals at GOT+0x12f8 / 0x1b34 / 0x2060 and
  // fields at pOther+0xb30 / 0xb48 / pev+0x1d0 / pev+0x208.
  // TODO(asm-ambiguous): exact field-to-argument mapping isn't resolved here.
  sendScoreInfoBroadcast(pOther);

  // ── Capture-points award (writes capture-points to a score board) ─
  // TODO(asm-ambiguous): the asm reads pOther+0xb30 (a string_t) and
  // pOther+0xb48 (a small struct) and writes another ScoreInfo-style
  // packet; the exact field semantics aren't documented here.

  // ── Bump the capturer's team score ──────────────────────────────
  const capturerTeam = GetTeamIndex(g_pGameRules, STRING(pOther.pev.team));
  if (capturerTeam >= 0) {
    // TODO(asm-ambiguous): the asm computes a 35*4 = 140-byte stride via
    // lea + shl + sub — implies a packed per-team struct starting at
    // GameRules+0x24. Represented as an index here; the literal C++ would
    // index by 35-word stride and may not be a plain score array.
    g_pGameRules.m_TeamScores[capturerTeam]++;
  }

  // ── Per-player "captured" notice (1..max_clients) ───────────────
  const maxClients = gpGlobals.maxClients;            // gpGlobals+0x90
  for (let idx = 1; idx <= maxClients; idx++) {
    const plr = UTIL_PlayerByIndex(idx);
    if (plr == null || !plr.IsPlayer()) continue;

    // vtable+0xd0 → team-name accessor on the player
    const playerTeam = GetTeamIndex(g_pGameRules, (plr as any).GetTeamName?.());

    // 0 if the captured-flag team matches this player's team, 1 otherwise.
    const isEnemy = capturerTeam === playerTeam ? 0 : 1;

    // msg_begin(type=1, dest) → write_short(slot) → write_string(model)
    //   → write_byte(isEnemy) → msg_end.
    // Payload draws on GOT+0x1be8 / 0x1b34 / pev+0x208 etc.
    sendCaptureNoticeToPlayer(plr, isEnemy);
  }

  // ── Per-team stat re-broadcast (loop over team-stat blocks) ─────
  // TODO(asm-ambiguous): the loop counter steps by 2 with bound 3, while
  // the per-team data pointers advance by 0x118 (280 bytes). The gate
  // bytes at +0x18 and +0xa4 control whether each update is sent.
  let teamData: any = g_pGameRules.m_TeamStats;       // base = GameRules + 0x10
  for (let slot = 0; slot <= 3; slot += 2) {
    if (teamData[0x18] !== 0) {                       // send team-name update
      sendTeamNameUpdate(slot, teamData[0x14]);       // +0x14 = team name
    }
    if (teamData[0xa4] !== 0) {                       // send team-color update
      sendTeamColorUpdate(slot, teamData[0xa0]);      // +0xa0 = color / extra
    }
    teamData = teamData.__next;                       // +0x118 stride
  }
}
```
