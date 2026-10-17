export function CaptureTouch(this: CTSBriefcase, pOther: CBaseEntity): void {
  // ── Preconditions (5 early-returns, all map to `je 7e122`) ──
  if ((this as any).m_fActive === 0) return;       // this+0x64
  if (!(pOther as any).IsPlayer?.()) return;       // vtable+0xc8
  if (!(pOther as any).IsAlive?.()) return;        // vtable+0xb4
  if (!HaveFlag(pOther as any)) return;
  if (!CanInteract(this, pOther)) return;

  // ── Log the capture (asm 7dc25..7dca6) ─────────────────────
  // asm pushes: format, then pOther+0x1d0 (pev->netname),
  // then 3× engfuncs(pOther+0x208). The +0x208 field name is
  // TODO(field-name-pending) — in HLSDK entvars_t it's
  // `noise2`, but TS's entvars_t may differ.
  UTIL_LogPrintf(
    kCaptureLogFormat,                            // GOT-0x6cc90
    STRING((pOther as any).pev?.netname),          // pev+0x1d0
    STRING((pOther as any).pev?.field0x208),       // engfuncs+0x1c4
    STRING((pOther as any).pev?.field0x208),       // engfuncs+0x23c
    STRING((pOther as any).pev?.field0x208),       // engfuncs+0x1c4
  );

  // ── Update previous-carrier stats (EHANDLE at pOther+0x7e4) ─
  // asm 7dca9..7dcdc: load EHANDLE, deref, write status dword
  // +0xc = 0xffff0000, +0x10 = g_captureDword, pev+0x104 += cvar.
  const prevCarrier = (pOther as any).m_hCarrier?.Entity?.();
  if (prevCarrier != null) {
    (prevCarrier as any).statusDword     = 0xffff0000;
    (prevCarrier as any).captureDword    = g_captureDword;        // GOT+0x1ccc
    const cvarVal = ((cvar_capturePoints as any)?.value ?? 0);    // GOT-0x6df78
    const gpVal   = ((engineGlobals as any)?.pevCapturePoint ?? 0);
    ((prevCarrier as any).pev as any).fuser4 =
      (((prevCarrier as any).pev as any).fuser4 ?? 0) + cvarVal + gpVal;
  }

  // ── Capturer drops the flag ───────────────────────────────
  DropFlag(pOther as any, true);

  // ── Fire toucher's "on capture" target (if any) ───────────
  if (((pOther as any).pev?.target ?? 0) !== 0) {
    FireTargets(STRING((pOther as any).pev?.target), pOther as any,
                pOther as any, USE_TYPE_3, 0.0);
  }

  // ── HUD capture announcement ──────────────────────────────
  if (((this as any).pev?.message ?? 0) !== 0) {
    TSHudMessageAll(0, 0xff, 0, 0x1e, 0x08, STRING((this as any).pev?.message));
  }

  // ── Fork: single-player vs. multiplayer (asm `jle 7df8c`) ─
  if (CountPlayers(g_pGameRules) <= 1) {
    // Single-player: wipe 12 per-team-stat DWORDs and announce.
    // asm 7df8c..7dff7 writes 0 to g_pGameRules+0x1c/0x20/0x24,
    // 0xa8/0xac/0xb0, 0x134/0x138/0x13c, 0x1c0/0x1c4/0x1c8
    // (4 teams × 3 fields, stride 0x8c = 140 bytes).
    g_pGameRules.team0_a = 0; g_pGameRules.team0_b = 0; g_pGameRules.team0_c = 0;
    g_pGameRules.team1_a = 0; g_pGameRules.team1_b = 0; g_pGameRules.team1_c = 0;
    g_pGameRules.team2_a = 0; g_pGameRules.team2_b = 0; g_pGameRules.team2_c = 0;
    g_pGameRules.team3_a = 0; g_pGameRules.team3_b = 0; g_pGameRules.team3_c = 0;
    TSHudMessageAll(0, 0, 0, 0x1e, 0x08, kSinglePlayerMessage);  // GOT-0x6e66e
    // ⚠️ ASM FALLS THROUGH to the team-stat broadcast loop
    // (sends all-zeroed stats). Original TS returned here;
    // fixed to match the binary. See Issue #1.
  }

  // ── Multiplayer-only: bump some pOther field by 10 ───────
  // asm 7dd88..7dd96: fadd/fstp on pOther[0]+0x164.
  // Was incorrectly written as `this.pev.nextthink` in the
  // original TS. See Issue #2. The field name is also
  // TODO(field-name-pending) — not `nextthink` in HLSDK
  // entvars_t (which is at 0x100). 0x164 in HLSDK entvars_t
  // is `rendermode`, but TS's entvars_t may differ.
  (pOther as any).pev.field0x164 =
    (((pOther as any).pev.field0x164 ?? 0) as number) + 10.0;

  // ── Per-team HUD message (asm 7dd9c..7dddb) ──────────────
  const teamMsg = UTIL_VarArgs(
    kCaptureMsgFormat,                              // GOT-0x6cc30
    STRING((this as any).pev?.netname),             // pev+0x1d0
  );
  TSHudMessageAll(0, 0xff, 0, 0x1e, 0x04, teamMsg);

  // ── Engine ScoreInfo broadcast (asm 7ddde..7deac) ────────
  // TODO(helpers): extract msg_begin/write_byte/write_short/
  // write_string/msg_end sequence. Currently abstracted.
  sendScoreInfoBroadcast(pOther as any);

  // ── Capture-points award (asm 7de63..7debD) ─────────────
  // TODO(helpers): extract the second ScoreInfo packet.
  // Currently abstracted.

  // ── Bump capturer's team score (asm 7deb1..7debD) ──────
  // 35*4 = 140-byte stride into g_pGameRules+0x24. The TS
  // `m_TeamScores[]` is a placeholder; the real structure
  // may be a packed per-team struct of 35 DWORDs.
  const capturerTeam =
    GetTeamIndex(g_pGameRules, STRING((pOther as any).pev?.team));
  if (capturerTeam >= 0) {
    (g_pGameRules as any).m_TeamScores[capturerTeam]++;
  }

  // ── Per-player "captured" notice (1..max_clients) ──────
  // asm 7dec1..7df86: per-player loop with
  //   skip if !UTIL_PlayerByIndex(idx)
  //   skip if !vtable+0xc8 (IsPlayer)
  //   GetTeamIndex(vtable+0xd0) → playerTeam
  //   isEnemy = (capturerTeam === playerTeam) ? 0 : 1
  //   msg_begin/write_short/write_string/write_byte/msg_end
  const maxClients = gpGlobals.maxClients;
  for (let idx = 1; idx <= maxClients; idx++) {
    const plr = UTIL_PlayerByIndex(idx) as any;
    if (plr == null || !plr.IsPlayer?.()) continue;
    const playerTeam =
      GetTeamIndex(g_pGameRules, plr.GetTeamName?.());
    const isEnemy = (capturerTeam === playerTeam) ? 0 : 1;
    sendCaptureNoticeToPlayer(plr, isEnemy);
  }

  // ── Per-team stat re-broadcast (asm 7e01d..7e11c) ───────
  // Counter step 2, bound 3 → slots 0 and 2. Pointer step
  // 0x118 = 2 × 140 (2 team_stats per iteration).
  // Gates at +0x18 and +0xa4; data at +0x14 and +0xa0.
  let teamData: any = (g_pGameRules as any).m_TeamStats;  // base = +0x10
  for (let slot = 0; slot <= 3; slot += 2) {
    if (teamData[0x18] !== 0) sendTeamNameUpdate(slot,   teamData[0x14]);
    if (teamData[0xa4] !== 0) sendTeamColorUpdate(slot,  teamData[0xa0]);
    teamData = teamData.__next;                            // +0x118 stride
  }
}
