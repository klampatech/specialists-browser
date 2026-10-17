// --- minimal isolation stubs (move to tools/decompile/stubs/ later) ---
declare const gpGlobals: any;
declare const engine: any;
declare const teamplay: any;
declare function UTIL_PlayerByIndex(i: number): any;
declare function get_weapon_info(w: number): any;
declare function get_ammo_info(a: number): any;
declare function TSHudMessageAll(
  a: number, b: number, c: number, d: number, e: number, msg: string
): void;
declare function GiveCash(this: any, amount: number): void;

export interface CTSGameRules {
  m_iRoundState: number;
  m_bDoingRestart: number;          // byte; offset 0x10
  m_flRestartRoundTime: number;     // float; offset 0x8
  m_iRestartCount: number;          // int;   offset 0xc
  field_0x5874: number;             // byte; offset 0x5874 — gate flag
  InitObjectives(this: this): void;
  SetObjective(this: this): void;
  RespawnEntities(this: this, b: boolean): void;
}

/**
 * CTSGameRules::RestartRound — reset gameplay state for a new round.
 */
export function RestartRound(this: CTSGameRules): void {
  // ---- 1. Compute and store the next restart time ----
  const cvarA      = /* TODO: cvar [ebx-0x6e810] */;
  const cvarB      = /* TODO: cvar [ebx-0x6f3ec] */;
  const baseFloat  = /* TODO: float at [singleton@0x1770] + 0xc */;
  const restartTime =
    Math.max(baseFloat, Math.max(cvarA, cvarB)) + gpGlobals.time;
  this.m_flRestartRoundTime = restartTime;
  this.m_iRestartCount = 0;

  // ---- 2. Active-restart engine notification ----
  if (this.m_bDoingRestart) {
    const cmdString = /* TODO: cvar string at [ebx+0x12c8] */;
    engine.call(/* 0xb8 */, 2, cmdString, 0, 0);

    const delayCvar = /* TODO: cvar [ebx-0x6f408] (mp_chattime?) */;
    const delaySecs = Math.max(restartTime - gpGlobals.time, delayCvar);
    const delayInt  = delaySecs | 0;
    engine.call(/* 0xc0 */, delayInt);
    engine.call(/* 0xc0 */, 0);
    engine.call(/* 0xbc */);
  }

  // ---- 3. Refresh objectives ----
  this.InitObjectives();
  this.SetObjective();

  // ---- 4. Optional round-start HUD broadcast (state == 2 only) ----
  if (this.m_iRoundState === 2) {
    const msg = /* TODO: string at [ebx-0x6e726] */;
    TSHudMessageAll(0, 0, 0, 8, 30, msg);
  }

  // ---- 5. Per-player reset, refund, observer ----
  for (let i = 1; i <= gpGlobals.maxClients; i++) {
    const player: any = UTIL_PlayerByIndex(i);
    if (!player) continue;
    if (!player.IsConnected()) continue; // [vtable+0xc8]

    // Buy-timer reset is GATED by the inner conditional at 0x67acf/0x67ad4.
    // Skip when m_iRoundState ∈ {0, 1, 3} AND field_0x5874 == 0.
    const buyTimeCvar = /* TODO: cvar [ebx-0x6f06c] (ts_buytime?) */;
    const resetBuyTimer =
      this.m_iRoundState > 3 ||
      this.field_0x5874 !== 0 ||
      this.m_iRoundState === 2;
    if (resetBuyTimer) {
      player.m_flNextBuyTime = gpGlobals.time + buyTimeCvar;
    }

    // Round timer is unconditional (runs at 0x67b08 in both paths).
    const roundCvar = /* TODO: cvar [ebx-0x6e768] */;
    player.m_flLastDeathTime = gpGlobals.time + roundCvar;

    // Clear per-round HUD/menu + ammo bookkeeping dwords.
    player.m_iCurrentMenu = 0xb;
    player.m_iMenuFlag1   = 0;
    player.m_iMenuFlag2   = 0;
    player.m_iAmmoFlags1  = 0;
    player.m_iAmmoFlags2  = 0;
    player.m_iAmmoCount1  = 0;
    player.m_iAmmoCount2  = 0;

    //5a. Refund carried weapon loadout.
    let cash = 0;
    const weaponBox: any = player.m_rgpPlayerItems; // [player+0xa10]
    if (weaponBox && weaponBox.m_iCount === 0x10) {
      for (let w = 0; w <= 0x25; w++) {
        const slot = weaponBox[w];
        if (!slot.m_bActive) continue;
        if (w === 0 || w === 0x1d) continue;

        const info = get_weapon_info(w);
        cash += info.cost;

        const flags = slot.m_iFlags;
        if (flags & 0x1) cash += 0x384;
        if (flags & 0x2) cash += 0x320;
        if (flags & 0x4) cash += 0x1f4;
        if (flags & 0x8) cash += 0x708;
      }

      // 5b. Refund carried ammo over the buy cap.
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

    // 5c. Move live (non-observer) players into observer for respawn.
    if (!player.m_bInObserver) {
      const vecA = /* TODO: Vector at [singleton] + 0x8 */;
      const vecB = /* TODO: Vector at [singleton] + 0x74 */;
      player.StartObserver(vecA, vecB);
    }
  }

  // ---- 6. Recount teams and respawn all map entities ----
  teamplay.RecountTeams(false);
  this.RespawnEntities(true);
}
