// CTSTeamEscape::WaitTouch — TS server mod (decompiled from ts_i386.so
// @ 0x7d4ec). Self-contained: every external reference is `any`-typed
// or stubbed so this file compiles in isolation. Concrete types are
// wired up in D.4 / D.5.

// ── external symbol stubs (replace with real imports in D.4) ──────
type CTSTeamEscape = any;
type CBaseEntity   = any;
type CBasePlayer   = any;
type CTSObjective  = any;

declare enum USE_TYPE {
  USE_OFF = 0, USE_ON = 1, USE_SET = 2, USE_TOGGLE = 3,
}

// Dispatch through whatever this->field_0x60 turns out to be
// (vtable? secondary base class?). Returns whatever the vfn returns;
// a `null` return bails the touch.
declare function callInterfaceVfnAt0x60(
  obj: any, vfnOffset: number,
): any;

// Address of the per-team player array for `teamId`. In the
// disassembly: addr = *(GOT+0x14f0) + 0x1c + teamId * 140 + 0xc.
// The140 (= 35 dwords) stride is the size of one per-team slot in
// whatever struct `[ebx+0x14f0]` points at.
declare function getTeamPlayersAddress(teamId: number): any;

// Engine vtable[0x47] over pOther->pev->field_0x208 → player slot
// (0..0x20), or >0x20 if not a player.
declare function getPlayerIndex(p: CBaseEntity): number;

// C entry: TSCountPlayers(char* array, bool includeBots) → int
declare function TSCountPlayers(addr: any, includeBots: boolean): number;

// C entry: FireTargets(const char* target, CBaseEntity* caller,
// CBaseEntity* activator, USE_TYPE, float delay)
declare function FireTargets(
  target: string, caller: CBaseEntity, activator: CBaseEntity,
  useType: USE_TYPE, delay: number,
): void;

// HLSDK STRING() macro: gpGlobals->pStringBase + string_t offset.
declare function STRING(offset: number): string;

// C entry: TSHudMessageAll(Uc channel, Uc r, Uc g, Uc b?, int x,
// int y, char* msg) — TS layout per codebase convention.
declare function TSHudMessageAll(
  channel: number, r: number, g: number, b: number,
  x: number, y: number, msg: string,
): void;

// ── the function ───────────────────────────────────────────────────/**
 * CTSTeamEscape::WaitTouch — touch handler for a team-escape trigger.
 *
 * Counts unique players (by engine player index) that touch the
 * trigger. Once a mode-dependent threshold is reached
 * (any / 1/3 / 2/3 / all of the configured team), fires the
 * trigger's `target` string and HUD message, then calls
 * SUB_UseTargets(true).
 *
 * @param this    The CTSTeamEscape entity (the trigger itself).
 * @param pOther  The entity that just touched the trigger.
 */
export function WaitTouch(this: CTSTeamEscape, pOther: CBaseEntity): void {
  // Bail if this trigger is not active (byte flag at this+0x64).
  // Assembled: `cmp BYTE PTR [esi+0x64], 0; je 7d6a8`
  if (this.active === 0) return;

  // Bail if pOther isn't a valid interactive player. Disassembly
  // dispatches through `pOther->field_0x60` (vtable? secondary base?)
  // calling vfn[0xc8/4 = 0x32], passing pOther as `this`, and testing
  // the returned pointer for non-null.
  // TODO(asm-ambiguous): exact interface / method name unknown.
  // TODO(asm-ambiguous): offset 0x60 is unusual for a vtable
  //                      (HLSDK CBaseEntity has vtable at +0).
  // TODO(asm-ambiguous): vfn 0x32 semantics unknown — likely
  //                      IsPlayer() / FNullEnt-style guard.
  if (!callInterfaceVfnAt0x60(pOther, 0xc8)) return;

  // Local byte at [esp+0xb] (triggered flag) and edi (player count).
  let triggered: 0 | 1 = 0;
  let playerCount = 0;

  // Can this player interact with the objective?
  // Disassembly: `push pOther; push this; call CanInteract; test al,al`
  // cdecl right-to-left → CanInteract(this as CTSObjective, pOther as CBasePlayer).
  // A `false` return leaves `triggered = 0` and bails at the second check below.
  if (CTSObjective.CanInteract(this as CTSObjective, pOther as CBasePlayer)) {
    // Count players on this.teamId, if a specific team is required.
    // Assembled: `cmp [esi+0x68], -1; jle skip` → run count only when
    // teamId > -1. teamId == -1 means "any team".
    if (this.teamId > -1) {
      // Per-team player-array base, computed as
      //   *(GOT[+0x14f0]) + 0x1c + teamId * 35 * 4 + 0xc
      // TODO(asm-ambiguous): per-team struct layout (140-byte slots).
      const teamPlayersAddr = getTeamPlayersAddress(this.teamId);
      playerCount = TSCountPlayers(teamPlayersAddr, /*includeBots=*/ true);
    }

    // Look up pOther's player index via engine vtable[0x47], passing
    // `pOther->pev->field_0x208` (a TS-extended entvars field) as the
    // argument. Returns 0..0x20 for valid players, >0x20 otherwise.
    // TODO(asm-ambiguous): meaning of pev+0x208 (engine userid?).
    const playerIdx = getPlayerIndex(pOther);

    // Dedup by player index. touchers is a fixed array at this+0x6c
    // (33 slots of 4 bytes → ends at 0xf0 where touchCount lives);
    // touchCount is at this+0xf0. Out-of-range idx (>0x20) skips both.
    if (playerIdx <= 0x20) {
      // `cmp X, 0; jne` matches both null and undefined — use loose ==.
      if (this.touchers[playerIdx] == null) {
        this.touchCount++;
      }
      this.touchers[playerIdx] = pOther;
    }

    // Mode-dependent threshold (switch on this.mode at offset 0xf4).
    //   mode 0 → required = 0         (any touch triggers)
    //   mode 1 → required = ⌊cnt/3⌋  (a third of the team)
    //   mode 2 → required = 2⌊cnt/3⌋ (two thirds)
    //   mode 3 → required = cnt      (whole team)
    // Disassembly uses the standard `imul 0x55555556; sar; sub`
    // integer-divide-by-3 pattern.
    let required = 0;
    switch (this.mode) {
      case 1: required = Math.floor(playerCount / 3); break;
      case 2: required = 2 * Math.floor(playerCount / 3); break;
      case 3: required = playerCount; break;
      // default (mode 0 or > 3): required stays 0
    }

    if (this.touchCount >= required) {
      triggered = 1;
    }
  }

  if (triggered === 0) return;

  // Fire the trigger's target string if set.
  // STRING() = gpGlobals->pStringBase + string_t offset.
  // The string_t lives at this->pev+0x1c8 (TS-extended entvars).
  // TODO(asm-ambiguous): pev+0x1c8 is not standard HLSDK entvars_t
  //                      (vanilla target is at +0x90). Same offset
  //                      used by CTSTrigger::WaitTouch for pev->target,
  //                      so it's a TS-wide extension.
  if (this.target) {
    FireTargets(STRING(this.target), this, this, USE_TYPE.USE_TOGGLE, 0);
  }

  // Broadcast HUD message if set. The string_t is at pev+0x1d4.
  // cdecl push order (deepest first) — see the verifier's  // `TSHudMessageAll(0, 0xff, 0, 8, 30, msg)` derivation.
  if (this.hudMessage) {
    TSHudMessageAll(0, 0xff, 0, 8, 30, STRING(this.hudMessage));
  }

  // SUB_UseTargets(true) — vtable-dispatched via this->field_0x60,
  // vfn0x114/4 = 0x45. Assembled: `pushw 0x1; push this; call vfn`.
  // TODO(asm-ambiguous): same +0x60 vtable quirk as above.
  this.subUseTargets?.(true);
}
