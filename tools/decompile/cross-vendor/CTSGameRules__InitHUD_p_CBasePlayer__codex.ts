The file system is read-only in this sandbox, so the calling system will capture the output. Here is the TypeScript code per the prompt's "output only the TypeScript code block" instruction:

```typescript
/**
 * CTSGameRules::InitHUD — initialize HUD / networking state for a player
 * who has just spawned or reconnected.
 *
 * Sends a batch of engine messages to the new client (slow-motion context,
 * "The One" pointer, per-player visibility flags), positions the player via
 * StartObserver, resets their armament and respawn timer, and clears their
 * slot in the per-player state array.
 *
 * @param this  The CTSGameRules singleton (the active game-rules instance).
 *              Inherited from CBasePlayer.
 * @param p     The CBasePlayer whose HUD is being initialized.
 * @returns     void
 */
export function InitHUD(this: CTSGameRulesP11CBasePlayer, p: CBasePlayer): void {
  // -------------------------------------------------------------------
  // Phase 1 — Slow-motion context HUD messages.
  //
  // The cvars live at the GOT-relative addresses [ebx+0x1dbc] and
  // [ebx+0x1484]; we read the float at offset 0 / +0xc of the cvar
  // struct. The two strings come from [ebx-0x6e470] and [ebx-0x6e450].
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
  if (cvars.slowmoTimer.value > 0) {
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
  // -------------------------------------------------------------------
  // TODO(asm-ambiguous): offset 0x5884 is a byte flag whose name is not
  //   visible in the disassembly; it gates InformClientsOnWeaponsParams.
  if (this[0x5884] !== 0) {
    InformClientsOnWeaponsParams(this);
  }

  // -------------------------------------------------------------------
  // Phase 3 — Sync the slow-motion game state to the new client.
  //
  // Four MessageBegin/WriteByte(X)/WriteLong(...)/MessageEnd blocks,
  // distinguished by their single WriteByte tag (0, 1, 2, 3). The
  // engine vtable is at [ebx+0x1aa8]; the msg-id source is at [ebx+0x1f34].
  // -------------------------------------------------------------------
  // msg 0 — payload is this[0x578] (DWORD, opaque).
  engineBeginMessage(/* msgId from [ebx+0x1f34] */, /* singleplayer */ true, p);
  engineWriteByte(0);
  engineWriteLong(this[0x578]); // TODO: field meaning
  engineEndMessage();

  // msg 1 — payload is 0/1 derived from cvar at [ebx+0x1480]+0xc.
  engineBeginMessage(/* msgId */, true, p);
  engineWriteByte(1);
  engineWriteLong(cvars.slowmoFlag.value !== 0 ? 1 : 0);
  engineEndMessage();

  // msg 2 — payload is (int) cvar at [ebx+0x18bc]+0xc.
  engineBeginMessage(/* msgId */, true, p);
  engineWriteByte(2);
  engineWriteLong(cvars.slowmoTimeRemaining.value | 0);
  engineEndMessage();

  // msg 3 — payload is this[0x5870] (DWORD).
  engineBeginMessage(/* msgId */, true, p);
  engineWriteByte(3);
  engineWriteLong(this[0x5870]); // TODO: field meaning
  engineEndMessage();

  // -------------------------------------------------------------------
  // Phase 4 — Spectator frame-sync.
  //
  // Only runs when both this[0x8] and this[0x10] are non-zero. Sends
  // max(0, this[0x8] - gameTime) as a byte, then 0. The msg-id source
  // is at [ebx+0x12c8]; the destination is some non-p ent (likely the
  // server proxy) — see the inline disassembly at 69347-69359.
  // -------------------------------------------------------------------
  if (this[0x8] !== 0 && this[0x10] !== 0) {
    // TODO(asm-ambiguous): the destination here is a server-side entity,
    //   not p. Cross-reference with engine.entFromMsgId once defined.
    engineBeginMessage(/* msgId from [ebx+0x12c8] */, true, /* dest */ null);
    const rawElapsed = this[0x8] - globals.gameTime;
    const elapsed = rawElapsed > 0 ? rawElapsed : 0;
    engineWriteByte(elapsed | 0);
    engineWriteByte(0);
    engineEndMessage();
  }

  // -------------------------------------------------------------------
  // Phase 5 — For every player 1..max_players, broadcast their net
  // index plus a 0/1 flag derived from pev[0x244].
  // -------------------------------------------------------------------
  const maxPlayers = globals.server.maxPlayers; // [ebx+0x1600][0x90]
  for (let i = 1; i <= maxPlayers; i++) {
    const target = UTIL_PlayerByIndex(i);
    if (target == null) continue;

    // Vtable call at [target+0x60][+0xc8] — acts as an IsPlayer /
    // IsNetClient gate. Returns 0 for dead/disconnected clients.
    // TODO(asm-ambiguous): exact method name unknown.
    if (!target.isValidForHudSync()) continue;

    engineBeginMessage(/* msgId from [ebx+0x1d84] */, true, p);
    const targetIdx = engine.entIndex(target.entvars);
    engineWriteByte(targetIdx);
    // pev[0x244] is a 4-byte flag (1 if non-zero, else 0).
    // TODO(asm-ambiguous): offset 0x244 in pev — likely a user field
    //   (iuser3 or similar).
    engineWriteByte(target.entvars[0x244] !== 0 ? 1 : 0);
    engineEndMessage();
  }

  // -------------------------------------------------------------------
  // Phase 6 — Position the new player as an observer using the saved
  // (origin, view_ofs) pair, then zero out the bookkeeping fields the
  // player accumulates while dead/in-spectator.
  // -------------------------------------------------------------------
  // p[0] is pev. From pev we read origin (+0x8) and view_ofs (+0x74).
  // These two vectors are the position and the eye offset for
  // StartObserver.
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

  // Reset transient player state. Offsets/types inferred from opcodes.
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
  // -------------------------------------------------------------------
  const rawRespawn = globals.respawnCvar.value;
  const minRespawn = globals.respawnCvarMin; // [ebx-0x6e818]
  const maxRespawn = globals.respawnCvarMax; // [ebx-0x6e810]
  const clampedRespawn =
    rawRespawn < minRespawn ? minRespawn
    : rawRespawn > maxRespawn ? maxRespawn
    : rawRespawn;
  const respawnInt = clampedRespawn | 0;
  SetPlayerRespawnTime(p, respawnInt, /* bUpdate */ false);

  // -------------------------------------------------------------------
  // Phase 8 — Zero 64 bytes at p+0x49a (a transient per-player
  // buffer, probably the round-end HUD accumulator), then reset
  // the player's armament.
  // -------------------------------------------------------------------
  memset(p[0x49a], 0, 0x40);
  ResetArmament(p);

  // -------------------------------------------------------------------
  // Phase 9 — Mid-round objective refresh.
  //
  // If the global round-state at [ebx+0x210c][0x0] is 2 or 3 (mid-
  // round or pre-game), clear this[0x758] and re-send the objective
  // list to the new player.
  // -------------------------------------------------------------------
  const phase = globals.roundState.value; // [ebx+0x210c][0x0]
  if (phase === 2 || phase === 3) {
    this[0x758] = 0; // TODO: field meaning (likely "last sent objectives version")
    SendObjectiveList(this, p);
  }

  // -------------------------------------------------------------------
  // Phase 10 — Reset the new player's slot in the per-player
  // stats/state array (indexed by ent-index, capped at 31).
  //
  // Layout: 72-byte struct slots at this[0x684 + n*72], parallel
  // "index" word at this[0x6c8 + n*72]. The slot is wiped with 18
  // dwords of zeros (0x12 dwords = 72 bytes), and the parallel word
  // is set to entIdx+1.
  // -------------------------------------------------------------------
  const entIdx = engine.entIndex(p.entvars);
  if (entIdx <= 0x1f) {
    const slotAddr = this[0x684 + entIdx * 72];
    memset(slotAddr, 0, 0x48); // 0x12 dwords = 72 bytes
    this[0x6c8 + entIdx * 72] = entIdx + 1;
  }
}
```
