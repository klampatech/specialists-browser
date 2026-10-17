/**
 * CTSGameRules::SetPlayerTheOne — promote a player to "The One" role.
 *
 * NOTE: `[player+0]` is treated as a sub-object pointer (`someStruct`),
 * NOT a vtable — the assembly writes through it, which would corrupt a
 * vtable. The exact sub-object identity is TODO(D.4) — cross-reference
 * the TS CBasePlayer layout.
 *
 * @param this   The CTSGameRules instance (implicit `this`)
 * @param player The CBasePlayer to promote
 * @returns      void
 */
export function SetPlayerTheOne(this: any, player: any): void {
  // Guard 1: player.networkObject (offset 0x60) must answer vtable[45]
  // (offset 0xb4) — likely an `IsConnected`/`IsReady`-style check.
  if (!player.networkObject?.isReady?.(player)) {
    return;
  }

  // Guard 2: someStruct.field0x244 must be 0 — likely a vtable-presence
  // check on a derived-class virtual.
  if (player.someStruct?.field0x244 !== 0) {
    return;
  }

  // ─── Promote + enable slow-motion ───────────────────────────────────────
  player.isTheOne = 1;                                // 0x7b9 (byte)
  player.someStruct.field0x160 = 150.0;              // 0x43160000 = 150.0f
  player.slowmoEndTime = SLOWMO_DURATION_CONSTANT
 + gpGlobals.time;              // 0x73c (float)
  player.slowmoActive   = 1;                          // 0x74e
  player.slowmoExtended = 1;                          // 0x74f

  // ─── Engine client-message notification ─────────────────────────────────
  // TODO(D.4): identify exact g_engfuncs slot at offset 0x1e0 (slot 120).
  g_engfuncs.notifyClient(                            // was: engineVtable
    player.someStruct.field0x208,
    STR_THE_ONE_CLIENT_MSG,                            // [ebx-0x6e4f3]
    STR_THE_ONE_CLIENT_FMT,                            // [ebx-0x6b2ba]
  );

  // Set the player's movement speed to 250.0 (NOT a bump — unconditional).
  SetPlayerSpeed(player, 250.0);                      // 0x43a50000

  // ─── Network messages (two messageBegin/write*/messageEnd triplets) ────
  const edict = player.someStruct.field0x208;         // 0x208
  const msgType = THE_ONE_MSG_TYPE;                   // [ebx+0x1738] indirect

  // Message A
  g_engfuncs.messageBegin(MSG_ONE, msgType, 0, edict);
  g_engfuncs.writeShort(4);                           // vtable[50] 0x32
  // TODO(D.4): second write hits vtable[48] 0x30 — likely writeLong, not
  //           writeShort. Verify against enginefuncs_t slot map.
  g_engfuncs.writeShort(0);
  g_engfuncs.messageEnd();

  // Message B
  g_engfuncs.messageBegin(MSG_ONE, msgType, 0, edict);
  g_engfuncs.writeShort(0x100);
  g_engfuncs.writeShort(0);
  g_engfuncs.messageEnd();

  // ─── Default customization values (only if both 0x724 and 0x728 are 0) ─
  if (player.customVal0 === 0 && player.customVal1 === 0) {
    player.customVal0 = 0;                            // 0x724 (redundant but
                                                      // matches assembly)
    player.customVal1 = 8;                            // 0x728
    player.customVal2 = 0;                            // 0x72c
    player.customVal3 = 3;                            // 0x730
  }
  player.someByteField = 0xa;                         // 0x74c

  // ─── Update CTSGameRules state ──────────────────────────────────────────
  this.theOneFlag        = 1;                         // 0x5878
  this.previousTheOneSet = 0;                         // 0x5877 — TODO: name

  // ─── HUD announcement to all players ────────────────────────────────────
  // playerName = gpGlobals->pStringBase + player.someStruct[0x1d0]
  const playerName =
    gpGlobals.pStringBase + player.someStruct.field0x1D0;

  const hudMsg = UTIL_VarArgs(STR_HUD_FMT, playerName);  // [ebx-0x6e4f0]
  TSHudMessageAll(
    /*R*/ 0x64, /*G*/ 0x96, /*B*/ 0xff,
    /*effect*/ 0x01,                                   // int, NOT alpha
    /*hold*/ 0x1e,
    hudMsg,
  );

  // ─── Server log ─────────────────────────────────────────────────────────
  UTIL_LogPrintf(STR_LOG_FMT, playerName);             // [ebx-0x6e310]
}
