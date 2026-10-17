// ---------------------------------------------------------------------------
// CTSGameRules::InitHUD — initialize HUD / networking state for a player
// who has just spawned or reconnected.
//
// 1256 B at 0x00069134 in ts/dlls/ts_i386.so. Demangled:
//   InitHUD__12CTSGameRulesP11CBasePlayer
// Calling convention: Itanium-ABI-style, this is the first stack arg.
//
// External symbols used (declared as `any` for isolation; in the real
// ts-dlls build these come from the engine shim):
//   cvars.*, strings.*, globals.*, engine.*
//   TSHudMessageOne, UTIL_VarArgs, InformClientsOnWeaponsParams,
//   UTIL_PlayerByIndex, engineBeginMessage, engineWriteByte,
//   engineWriteLong, engineEndMessage, engine.entIndex,
//   SetPlayerRespawnTime, memset, ResetArmament, SendObjectiveList,
//   StartObserver
// ---------------------------------------------------------------------------

type Vector = [number, number, number];
interface Entvars { [offset: number]: any; origin: Vector; viewOfs: Vector; }
interface CBasePlayer { entvars: Entvars; [offset: number]: any; }
interface CTSGameRules { [offset: number]: any; }

// Stub the externals so the file compiles in isolation.
declare const cvars: any;
declare const strings: any;
declare const globals: any;
declare const engine: any;
declare function TSHudMessageOne(
  r: number, g: number, b: number, ch: number, hold: number,
  msg: string, pev: Entvars): void;
declare function UTIL_VarArgs(fmt: string, ...args: any[]): string;
declare function InformClientsOnWeaponsParams(this: CTSGameRules): void;
declare function UTIL_PlayerByIndex(i: number): CBasePlayer | null;
declare function engineBeginMessage(
  msgId: number, singleplayer: boolean, dest: CBasePlayer | null): void;
declare function engineWriteByte(b: number): void;
declare function engineWriteLong(l: number): void;
declare function engineEndMessage(): void;
declare function SetPlayerRespawnTime(
  p: CBasePlayer, secs: number): void;
declare function memset(dst: any, val: number, n: number): void;
declare function ResetArmament(p: CBasePlayer): void;
declare function SendObjectiveList(
  this: CTSGameRules, p: CBasePlayer): void;
declare function StartObserver(
  p: CBasePlayer, pos: Vector, view: Vector): void;

export function InitHUD(
  this: CTSGameRules,
  p: CBasePlayer,
): void {
  // -------------------------------------------------------------------
  // Phase 1 — Slow-motion context HUD messages.
  //
  // The two cvars live at the GOT-relative addresses [ebx+0x1dbc]
  // and [ebx+0x1484]; we read the float at offset 0 / +0xc. The two
  // format strings come from [ebx-0x6e470] and [ebx-0x6e450].
  //
  // NOTE: the FPU condition is "value >= 0" (test ah,0x40; sete dl
  // after fldz; fcomp), not "value != 0". For 0/1 boolean cvars the
  // two are observationally identical, so we keep the TS check as
  // `value !== 0` and note the discrepancy with a TODO.
  // -------------------------------------------------------------------
  if (cvars.slowmoActive.value !== 0) {
    TSHudMessageOne(
      /* r    */ 0x2d,
      /* g    */ 0xc3,
      /* b    */ 0x2d,
      /* ch   */ 0x08,
      /* hold */ 0x64,
      strings.slowmoIntro, // [ebx-0x6e470]
      p.entvars,
    );
  }
  if (cvars.slowmoTimer.value !== 0) {
    // TODO(asm-ambiguous): FPU condition is "value >= 0", not "!= 0".
    const msg = UTIL_VarArgs(strings.slowmoTimerFmt, cvars.slowmoTimer.value);
    TSHudMessageOne(
      /* r    */ 0x2d,
      /* g    */ 0xc3,
      /* b    */ 0x2d,
      /* ch   */ 0x08,
      /* hold */ 0x64,
      msg,
      p.entvars,
    );
  }

  // -------------------------------------------------------------------
  // Phase 2 — Optional weapon-params sync.
  //
  // TODO(asm-ambiguous): offset 0x5884 is a byte flag whose name is
  //   not visible in the disassembly.
  // -------------------------------------------------------------------
  if (this[0x5884] !== 0) {
    InformClientsOnWeaponsParams(this);
  }

  // -------------------------------------------------------------------
  // Phase 3 — Sync the slow-motion game state to the new client.
  //
  // Four MessageBegin / WriteByte(X) / WriteLong(...) / MessageEnd
  // blocks. The engine vtable lives at [ebx+0x1aa8]; the msg-id
  // source is at [ebx+0x1f34]. The destination edict is
  // *(p->pev+0x208), which for a live player is p's own edict.
  //
  // NOTE: the disassembly reads [eax+0x578] and [ecx+0x5870] where
  // eax/ecx = saved ebx (GOT base) reloaded from the stack. These
  // are GOT-relative globals, not class members of `this`. We name
  // them as `globals.*` here; if cross-reference shows them to be
  // class members, switch to `this[0x578]` / `this[0x5870]`.
  // -------------------------------------------------------------------
  const msgId = engine.msgIdSlowmoSync; // [ebx+0x1f34]

  // msg 0 — payload is the 4-byte value at GOT+0x578.
  engineBeginMessage(msgId, /* reliable */ true, p);
  engineWriteByte(0);
  engineWriteLong(globals.slowmoState0); // *(GOT+0x578)
  engineEndMessage();

  // msg 1 — payload is 0/1 derived from cvar at [ebx+0x1480]+0xc.
  // FPU pattern: dl = (cvar+0xc >= 0) ? 1 : 0. For a 0/1 boolean
  // cvar this collapses to "value === 0 ? 1 : 0" (i.e. send 1 if
  // cvar is unset). The original TS got this inverted.
  engineBeginMessage(msgId, true, p);
  engineWriteByte(1);
  engineWriteLong(cvars.slowmoFlag.value === 0 ? 1 : 0);
  engineEndMessage();

  // msg 2 — payload is (int) cvar at [ebx+0x18bc]+0xc.
  engineBeginMessage(msgId, true, p);
  engineWriteByte(2);
  engineWriteLong(cvars.slowmoTimeRemaining.value | 0);
  engineEndMessage();

  // msg 3 — payload is the 4-byte value at GOT+0x5870.
  engineBeginMessage(msgId, true, p);
  engineWriteByte(3);
  engineWriteLong(globals.slowmoState1); // *(GOT+0x5870)
  engineEndMessage();

  // -------------------------------------------------------------------
  // Phase 4 — Spectator frame-sync.
  //
  // Only runs when both this[0x8] and this[0x10] are non-negative
  // (FPU: fcomp [eax+0x8] with eax=this, skip if 0>mem; then
  // cmp [eax+0x10], 0; je skip). The destination is a separate
  // server-side entity referenced from [ebx+0x12c8].
  //
  // Sends max(0, p[0x8] - gameTime) as a byte, then 0.
  //
  // TODO(asm-ambiguous): the disassembly's [esp+0x5c] at 0x6936c is
  //   8 bytes off from the standard `p` offset (which is
  //   [esp+0x54]). Either the disassembly listing has a 0x5c/0x64
  //   typo, or there's a register-relative load I'm missing. The
  //   semantic intent is "subtract current time from the player's
  //   timestamp at offset 0x8", so we use `p[0x8]` here and mark
  //   the offset for confirmation.
  // -------------------------------------------------------------------
  if (this[0x8] !== 0 && this[0x10] !== 0) {
    engineBeginMessage(engine.msgIdSpectatorSync, true, p);
    const rawElapsed = p[0x8] - globals.gameTime;
    const elapsed = rawElapsed > 0 ? rawElapsed : 0;
    engineWriteByte(elapsed | 0);
    engineWriteByte(0);
    engineEndMessage();
  }

  // -------------------------------------------------------------------
  // Phase 5 — For every player 1..max_players, broadcast their
  // ent index plus a 0/1 flag derived from pev[0x244].
  // -------------------------------------------------------------------
  const maxPlayers = globals.server.maxPlayers; // *(gpGlobals+0x90)
  const msgIdPlayers = engine.msgIdPlayerState; // [ebx+0x1d84]
  for (let i = 1; i <= maxPlayers; i++) {
    const target = UTIL_PlayerByIndex(i);
    if (target == null) continue;

    // Vtable call at [target+0x60][+0xc8] — IsNetClient gate.
    // Returns 0 for dead/disconnected clients.
    // TODO(asm-ambiguous): exact method name unknown; treat the
    //   gate as a truthy boolean via a generic call.
    if (target.isValidForHudSync && !target.isValidForHudSync()) continue;

    engineBeginMessage(msgIdPlayers, true, p);
    const targetIdx = engine.entIndex(target.entvars);
    engineWriteByte(targetIdx);
    // pev[0x244] is a 4-byte flag (1 if non-zero, else 0).
    // TODO(asm-ambiguous): offset 0x244 in pev — likely a user
    //   field (iuser3 or similar).
    engineWriteByte(target.entvars[0x244] !== 0 ? 1 : 0);
    engineEndMessage();
  }

  // -------------------------------------------------------------------
  // Phase 6 — Position the new player as an observer using the saved
  // (origin, view_ofs) pair, then zero out the bookkeeping fields
  // the player accumulates while dead/in-spectator.
  // -------------------------------------------------------------------
  const observerPos: Vector = [
    p.entvars.origin.x,
    p.entvars.origin.y,
    p.entvars.origin.z,
  ];
  const observerView: Vector = [
    p.entvars.viewOfs.x,
    p.entvars.viewOfs.y,
    p.entvars.viewOfs.z,
  ];
  StartObserver(p, observerPos, observerView);

  // Reset transient player state. Offsets/types inferred from
  // opcodes: byte mov for 0x7ba/0x714/0x7c8, dword mov for the
  // others. The TS values are correct as written.
  p[0x7ba] = 0; // byte flag
  p[0x714] = 0; // byte flag
  p[0x53c] = 0; // dword
  p[0x538] = 0; // dword
  p[0x7c4] = 0; // dword
  p[0x7c8] = 0; // byte
  p[0x7cc] = 0; // dword

  // -------------------------------------------------------------------
  // Phase 7 — Clamp the respawn-time cvar into [min, max], convert
  // to int, and apply via SetPlayerRespawnTime.
  //
  // The cvar is at [ebx+0x1f84][+0xc]; bounds are floats at
  // [ebx-0x6e818] (min) and [ebx-0x6e810] (max).
  //
  // NOTE: the disassembly only pushes (p, int) before the call
  // (cleanup is `add esp, 0xc` = 4 return + 4 + 4 = 12). The 3rd
  // bool arg of the HLSDK signature is NOT passed at this call
  // site. Don't add it.
  // -------------------------------------------------------------------
  const rawRespawn = cvars.respawnCvar.value;
  const minRespawn = globals.respawnCvarMin; // [ebx-0x6e818]
  const maxRespawn = globals.respawnCvarMax; // [ebx-0x6e810]
  const clampedRespawn =
    rawRespawn < minRespawn ? minRespawn
    : rawRespawn > maxRespawn ? maxRespawn
    : rawRespawn;
  const respawnInt = clampedRespawn | 0;
  SetPlayerRespawnTime(p, respawnInt);

  // -------------------------------------------------------------------
  // Phase 8 — Zero 64 bytes at p+0x49a (transient per-player
  // buffer, likely a round-end HUD accumulator), then reset the
  // player's armament.
  // -------------------------------------------------------------------
  memset(p[0x49a], 0, 0x40);
  ResetArmament(p);

  // -------------------------------------------------------------------
  // Phase 9 — Mid-round objective refresh.
  //
  // If the global round-state at [ebx+0x210c][0x0] is 2 or 3
  // (mid-round or pre-game), clear p[0x758] and re-send the
  // objective list to the new player.
  //
  // NOTE: the disassembly's `mov ecx, [esp+0x54]` loads `p`, not
  // `this`. So the field written is on the CBasePlayer, not the
  // CTSGameRules. The original TS had it on the wrong object.
  // -------------------------------------------------------------------
  const phase = globals.roundState.value; // *(GOT+0x210c)[0x0]
  if (phase === 2 || phase === 3) {
    p[0x758] = 0; // TODO(asm-ambiguous): field meaning
    SendObjectiveList(this, p);
  }

  // -------------------------------------------------------------------
  // Phase 10 — Reset the new player's slot in the per-player
  // stats/state array (indexed by ent-index, capped at 31).
  //
  // Layout: 72-byte struct slots at this[0x684 + n*72]; parallel
  // "index" word at this[0x6c8 + n*72]. Wipe 18 dwords of zeros
  // (0x12 dwords = 72 bytes) and set the parallel word to entIdx+1.
  //
  // NOTE: the disassembly uses LEA to compute the slot ADDRESS,
  // not a deref. `memset(this[0x684 + n*72], 0, ...)` would read
  // a 4-byte value from inside the slot and pass that as the
  // destination, which is wrong. Use address arithmetic.
  // -------------------------------------------------------------------
  const entIdx = engine.entIndex(p.entvars);
  if (entIdx <= 0x1f) {
    memset(this + 0x684 + entIdx * 72, 0, 0x48); // 0x12 dwords = 72 B
    this[0x6c8 + entIdx * 72] = entIdx + 1;
  }
}
