```typescript
/**
 * CTSGameRules::RestartRound — reset gameplay state for a new round.
 *
 * Steps performed (in order):
 *   1. Compute this->m_flRestartRoundTime as
 *      max(baseFloat, max(cvarA, cvarB)) + gpGlobals->time,
 *      and clear this->m_iRestartCount.
 *   2. If a restart is flagged (this->m_bDoingRestart), dispatch engine
 *      notifications about the restart countdown.
 *   3. Refresh objectives via InitObjectives + SetObjective.
 *   4. If this->m_iRoundState == 2, broadcast a HUD message to all clients.
 *   5. For every live player:
 *        - reset buy timer (m_flNextBuyTime) and round timer
 *        - clear per-round HUD/menu + ammo bookkeeping dwords
 *        - refund the cash value of carried weapons + ammo via GiveCash
 *        - move them to observer (so they respawn into the new round)
 *   6. Call CHalfLifeTeamplay::RecountTeams(false) and
 *      this->RespawnEntities(true) to finalize.
 *
 * @param this  The CTSGameRules entity instance (this in the original C++)
 * @returns     void
 */
export function RestartRound(this: CTSGameRules): void {
  const gpGlobals: any = /* TODO: engine gpGlobals (time + maxClients) */;
  const engine: any = /* TODO: HL engine vtable singleton */;
  const teamplay: any = /* TODO: CHalfLifeTeamplay singleton */;

  // ---- 1. Compute and store the next restart time ----
  //   m_flRestartRoundTime = max(baseFloat, max(cvarA, cvarB)) + gpGlobals.time
  //   m_iRestartCount      = 0
  const cvarA = /* TODO: float cvar at [ebx-0x6e810] */;
  const cvarB = /* TODO: float cvar at [ebx-0x6f3ec] */;
  const baseFloat = /* TODO: float at [singleton@0x1770] + 0xc */;
  const restartTime =
    Math.max(baseFloat, Math.max(cvarA, cvarB)) + gpGlobals.time;
  this.m_flRestartRoundTime = restartTime;
  this.m_iRestartCount = 0;

  // ---- 2. Active-restart engine notification ----
  if (this.m_bDoingRestart) {
    const cmdString = /* TODO: cvar string ptr at [ebx+0x12c8] */;
    // TODO(asm-ambiguous): 4-arg engine call at offset 0xb8 — purpose unclear
    engine.call(/* 0xb8 */, /* 2 */, cmdString, 0, 0);

    // Time-until-restart, floored by a cvar (assembly uses max, not min —
    // see the (fcom st(1); jbe; fstp st(1)) pattern at 0x679bc), then
    // truncated to an int via fistp.
    const delayCvar = /* TODO: cvar [ebx-0x6f408] (mp_chattime?) */;
    const rawDelay = restartTime - gpGlobals.time;
    const delaySecs = Math.max(rawDelay, delayCvar);
    const delayInt = delaySecs | 0;
    // TODO(asm-ambiguous): the two 0xc0 calls + the 0xbc call purposes
    engine.call(/* 0xc0 */, delayInt);
    engine.call(/* 0xc0 */, 0);
    engine.call(/* 0xbc */);
  }

  // ---- 3. Refresh objectives / HUD objective ----
  this.InitObjectives();
  this.SetObjective();

  // ---- 4. Optional round-start HUD broadcast (state 2 only) ----
  if (this.m_iRoundState === 2) {
    const msg = /* TODO: string at [ebx-0x6e726] */;
    TSHudMessageAll(0, 0, 0, 8, 30, msg);
  }

  // ---- 5. Per-player reset, refund, and observer ----
  for (let i = 1; i <= gpGlobals.maxClients; i++) {
    const player: any = UTIL_PlayerByIndex(i);
    if (!player) continue;
    if (!player.IsConnected()) continue; // virtual call at [vtable+0xc8]

    // Reset per-player timers.
    // The original assembly has a conditional branch around this assignment
    // (see the (sub eax,2; cmp al,1; ja) pattern at 0x67ac1) that compiles
    // to a no-op: both branches store the same value, so the conditional is
    // effectively dead and the assignment runs unconditionally.
    const buyTimeCvar = /* TODO: cvar [ebx-0x6f06c] (ts_buytime?) */;
    player.m_flNextBuyTime = gpGlobals.time + buyTimeCvar;

    const roundCvar = /* TODO: cvar [ebx-0x6e768] */;
    player.m_flLastDeathTime = gpGlobals.time + roundCvar;

    // Clear per-round HUD/menu + ammo bookkeeping dwords
    player.m_iCurrentMenu = 0xb;
    player.m_iMenuFlag1 = 0;
    player.m_iMenuFlag2 = 0;
    player.m_iAmmoFlags1 = 0;
    player.m_iAmmoFlags2 = 0;
    player.m_iAmmoCount1 = 0;
    player.m_iAmmoCount2 = 0;

    // ---- 5a. Refund the carried weapon loadout ----
    let cash = 0;
    const weaponBox: any = player.m_rgpPlayerItems; // [player+0xa10]
    if (weaponBox && weaponBox.m_iCount === 0x10) {
      for (let w = 0; w <= 0x25; w++) {
        const slot = weaponBox[w];
        if (!slot.m_bActive) continue;
        if (w === 0 || w === 0x1d) continue; // skip weapon 0 and weapon 0x1d

        const info = get_weapon_info(w);
        cash += info.cost;

        const flags = slot.m_iFlags;
        if (flags & 0x1) cash += 0x384;
        if (flags & 0x2) cash += 0x320;
        if (flags & 0x4) cash += 0x1f4;
        if (flags & 0x8) cash += 0x708;
      }

      // ---- 5b. Refund carried ammo over the buy cap ----
      // For each pair of ammo entries (a, a+1), if the player has more
      // than a buy unit's worth, add (cost * amount / buyUnit) to cash.
      // TODO(asm-ambiguous): rgAmmo entry layout — offsets 0x4 and 0x8 within
      // a single entry are both accessed per loop iteration, which could be
      // primary vs secondary amount, or current vs max; struct size unclear.
      // The loop walks 8 entries in 4 iterations of 2 entries each
      // (pointer steps by 8 bytes per iter, ebp increments by 2).
      for (let a = 0; a <= 0xf; a += 2) {
        const ai0 = get_ammo_info(a);
        if (player.rgAmmo[a].amount > ai0.buyUnit) {
          const aInfo = get_ammo_info(a);
          cash += Math.floor(
            (player.rgAmmo[a].amount * aInfo.cost) / aInfo.buyUnit
          );
        }

        const ai1 = get_ammo_info(a + 1);
        if (player.rgAmmo[a + 1].amount > ai1.buyUnit) {
          const aInfo = get_ammo_info(a + 1);
          cash += Math.floor(
            (player.rgAmmo[a + 1].amount * aInfo.cost) / aInfo.buyUnit
          );
        }
      }
    }

    player.GiveCash(cash);

    // ---- 5c. Move live players into observer so they respawn fresh ----
    if (!player.m_bInObserver) {
      // Two vectors read from an engine singleton (pev->origin + pev->v_angle?)
      const vecA = /* TODO: Vector at [singleton] + 0x8 */;
      const vecB = /* TODO: Vector at [singleton] + 0x74 */;
      player.StartObserver(vecA, vecB);
    }
  }

  // ---- 6. Recount teams and respawn all map entities ----
  teamplay.RecountTeams(false);
  this.RespawnEntities(true);
}
```
