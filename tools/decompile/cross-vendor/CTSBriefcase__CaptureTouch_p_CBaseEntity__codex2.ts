// ── Log the capture event (6 stack args, asm-precise) ────────────
UTIL_LogPrintf(
  kCaptureLogFormat,                          // GOT-0x6cc90
  STRING(pOther.pev.netname),                 // pev+0x1d0
  STRING(readStringT(pOther, 0x7d4)),         // team-or-role string_t
  STRING(pOther.pev.model),                   // pev+0x208 (engfuncs+0x1c4)
  stringifyAlt(pOther.pev.model),             // pev+0x208 (engfuncs+0x23c — different entry)
  STRING(pOther.pev.model),                   // pev+0x208 (engfuncs+0x1c4)
);

// ── Bump previous carrier's stats ────────────────────────────────
const carrier = readEHANDLE(pOther, 0x7e4)?.toEntity(); // explicit offset + operator
if (carrier != null) {
  writeU32(carrier, 0xc, 0xffff0000);                  // status dword
  writeU32(carrier, 0x10, readU32AtGOT(0x1ccc));      // some global
  const pev = readPtr(carrier, 0x0);                   // carrier->pev
  const sum  = cvar_capturePoints.value + gpGlobals.flTime;
  writeFloat(pev, 0x104, readFloat(pev, 0x104) + sum);
}

// ── Capturer's team-name comes from a vtable dispatch, not pev ──
const capturerTeam = GetTeamIndex(g_pGameRules, pOther.GetTeamName());
if (capturerTeam >= 0) {
  // g_pGameRules + 0x24, stride = 35*4 = 140 bytes per team-stat block
  const scoreAddr =
    (g_pGameRules as unknown as number) + 0x24 + capturerTeam * 140;
  writeU32(scoreAddr, readU32(scoreAddr) + 1);
}

// ── Per-team stat re-broadcast (explicit pointer math) ──────────
let teamData = (g_pGameRules as unknown as number) + 0x10;
for (let slot = 0; slot <= 3; slot += 2) {
  const block = teamData + (slot / 2) * 0x118;
  if (readU8(block + 0x18) !== 0) {  // send team-name update
    msgBegin(g_engfuncs, 2, readU32AtGOT(0x1be8), 0, 0);
    writeShort(g_engfuncs, readStringT(block, 0x14));
    writeString(g_engfuncs, "");
    msgEnd(g_engfuncs);
  }
  if (readU8(block + 0xa4) !== 0) {  // send team-color update
    msgBegin(g_engfuncs, 2, readU32AtGOT(0x1be8), 0, 0);
    writeShort(g_engfuncs, readStringT(block, 0xa0));
    writeString(g_engfuncs, "");
    msgEnd(g_engfuncs);
  }
}

// ── ScoreInfo broadcasts (i, ii) and per-player notice (iii) ────
// Don't hide these behind `sendXxx()`; keep the asm shape visible.
msgBegin(g_engfuncs, 2, readU32AtGOT(0x12f8), 0, 0);
writeByte(g_engfuncs, cvar_capturePoints.intValue);
writeShort(g_engfuncs, pOther.pev.model);
writeShort(g_engfuncs, pOther.pev.netname);
writeString(g_engfuncs, "");
msgEnd(g_engfuncs);

msgBegin(g_engfuncs, 2, readU32AtGOT(0x1b34), 0, 0);
writeByte(g_engfuncs, captureTeamFlag);
writeShort(g_engfuncs, readStringT(pOther, 0xb30));
msgEnd(g_engfuncs);

// per-player notice loop — keep inline
const maxClients = gpGlobals.maxClients;
for (let idx = 1; idx <= maxClients; idx++) {
  const plr = UTIL_PlayerByIndex(idx);
  if (plr == null || !plr.IsPlayer()) continue;
  const isEnemy = capturerTeam === GetTeamIndex(g_pGameRules, plr.GetTeamName()) ? 0 : 1;
  msgBegin(g_engfuncs, 1, readU32AtGOT(0x1b34), 0, 0);
  writeShort(g_engfuncs, idx);
  writeString(g_engfuncs, STRING(pOther.pev.model));
  writeByte(g_engfuncs, isEnemy);
  msgEnd(g_engfuncs);
}
