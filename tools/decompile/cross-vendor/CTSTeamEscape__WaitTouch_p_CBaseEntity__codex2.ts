// --- Stubs so this file compiles standalone. Real definitions live
//     elsewhere in the TS browser rebuild; we mark unknowns as `any`-
//     compatible declarations so D.3 doesn't block on D.4/D.5 work.

declare class CBaseEntity {
  /** pev-style subobject pointer at offset 0 in the class. */
  pev: any;
}
declare class CBasePlayer extends CBaseEntity {}
declare class CTSObjective extends CBaseEntity {
  static CanInteract(self: CTSObjective, other: CBasePlayer): boolean;
}
declare class CTSTeamEscape extends CTSObjective {
  active: number;          // byte at offset 0x64
  teamId: number;          // dword at offset 0x68; -1 = "any team"
  mode: 0 | 1 | 2 | 3;     // dword at offset 0xf4; selects threshold
  touchCount: number;      // dword at offset 0xf0
  touchers: (CBaseEntity | null)[]; // ptr array at offset 0x6c
  /** Vtable fn at [this+0x60]+0x114 (slot 69 = SUB_UseTargets). */
  subUseTargets(useType: number): void;
}
declare enum USE_TYPE {
  ON = 0,
  OFF = 1,
  TOGGLE = 3,
}

// --- Helpers (real impls come later). Names mirror the @plt symbols.
// const MAX_PLAYERS = 32;  // matches the `cmp eax, 0x20` constant.

declare function callInterfaceVfnAt0x60(
  receiver: CBaseEntity,
  slot: number,
  arg: CBaseEntity,
): unknown;

declare function getTeamPlayersAddress(teamId: number): number;
declare function TSCountPlayers(addr: number, _b: boolean): number;
declare function getPlayerIndex(pOther: CBaseEntity): number;
declare function STRING(offset: number): string;
declare function FireTargets(
  target: string,
  activator: CBaseEntity,
  caller: CBaseEntity,
  useType: USE_TYPE,
  delay: number,
): void;
/** `TSHudMessageAll__FUcUcUciiPc`: 3 uchars, 2 ints, 1 char*. */
declare function TSHudMessageAll(
  a: number, b: number, c: number,
  d: number, e: number,
  msg: string,
): void;

const MAX_PLAYERS = 32;

/**
 * CTSTeamEscape::WaitTouch — touch handler for a team-escape trigger.
 *
 * Counts unique players on `this.teamId` that touch the trigger. Once
 * the touch count clears a mode-dependent threshold
 *   mode 0 -> 0                     (any touch triggers)
 *   mode 1 -> floor(playerCount/3)
 *   mode 2 -> 2*floor(playerCount/3)
 *   mode 3 -> playerCount           (whole team)
 * the trigger fires its target string, broadcasts the HUD message, then
 * runs SUB_UseTargets(true).
 *
 * Address: 0x0007d4ec, 452 bytes, demangled
 *   `WaitTouch__13CTSTeamEscapeP11CBaseEntity`.
 */
export function WaitTouch(this: CTSTeamEscape, pOther: CBaseEntity): void {
  // Bail if this trigger is not active. [esi+0x64] vs 0; je exit.
  if (this.active === 0) return;

  // Bail if pOther fails the vtable[0x32] probe at [pOther+0x60]+0xc8,
  // returning null/zero.
  // TODO(asm-ambiguous): exact HL method name (likely IsPlayer-side).
  if (!callInterfaceVfnAt0x60(pOther, 0xc8, pOther)) return;

  let triggered = 0;        // byte at [esp+0xb]
  let playerCount = 0;      // edi, reused as a local

  // CanInteract(this as CTSObjective, pOther as CBasePlayer).
  if (CTSObjective.CanInteract(this as unknown as CTSObjective, pOther as CBasePlayer)) {
    // teamId == -1 means "any team"; skip the per-team count.
    // `cmp [esi+0x68], 0xffffffff; jle skip` (signed).
    if (this.teamId > -1) {
      // Address calc in the disasm:
      //   [ebx+0x14f0] -> eax (per-team table pointer via GOT)
      //   eax + 0x1c
      //   + (teamId * 35 * 4)        (lea/shl/sub trick)
      //   + 0xc                       (skip array header)
      // The 140-byte stride (35 * 4) implies a fixed-size per-team struct.
      // TODO: real layout of the per-team block at GOT[0x14f0].
      const teamPlayersAddr = getTeamPlayersAddress(this.teamId);
      playerCount = TSCountPlayers(teamPlayersAddr, true);
    }

    // Player index for pOther: indirected through [pOther][.208] and a
    // vtable call at GOT[0x1aa8]+0x11c.
    // TODO: offset 0x1aa8 (engine singleton), 0x208 (pev-internal),
    //       0x11c (vtable slot 71) — needs HLSDK cross-ref.
    const playerIdx = getPlayerIndex(pOther);

    if (playerIdx <= MAX_PLAYERS) {
      // Dedup + record. `[esi+eax*4+0x6c]` is a 4-byte ptr array;
      // `[esi+0xf0]` is `touchCount`.
      if (this.touchers[playerIdx] === null) {
        this.touchCount++;
      }
      this.touchers[playerIdx] = pOther;
    }

    // Mode-dependent threshold (jump table at [esi+0xf4], four cases).
    let required = 0;
    switch (this.mode) {
      case 1: required = Math.floor(playerCount / 3); break;        // 0x7d5e8 imul trick
      case 2: required = 2 * Math.floor(playerCount / 3); break;    // 0x7d5fc imul trick
      case 3: required = playerCount; break;                          // 0x7d614
      // case 0 (and default): required stays 0
    }

    // `cmp [esi+0xf0], ebp; jl skip` -> if touchCount < required: skip.
    if (this.touchCount >= required) {
      triggered = 1;
    }
  }

  if (triggered === 0) return;

  // Fire this->target. Reads `string_t` at [this.pev+0x1c8] via
  // GOT[0x1600]->[0]->[0x98] (pStringBase) + offset (the STRING() macro).
  // TODO(asm-ambiguous): the [this+0] indirection is the pev subobject,
  //   not a flat field — the TS treats it as `this.target` for readability.
  if (this.target) {
    FireTargets(STRING(this.target), this, this, USE_TYPE.TOGGLE, 0);
  }

  // Broadcast HUD message from `this.hudMessage` (string_t at
  // [this.pev+0x1d4]). Push order is right-to-left (arg1..arg6):
  //   7d67f  push eax              ; arg6 = STRING(hudMessage)
  //   7d680  push 0x1e             ; arg5 = 30
  //   7d682  push 0x8              ; arg4 = 8
  //   7d684  push 0x0              ; arg3 = 0
  //   7d686  push 0xff             ; arg2 = 0xff (255)
  //   7d68b  push 0x0              ; arg1 = 0
  //   7d68d  call TSHudMessageAll
  // NB: arg2 is `0xff`, arg3 is `0` — DO NOT swap them.
  if (this.hudMessage) {
    TSHudMessageAll(0, 0xff, 0, 8, 30, STRING(this.hudMessage));
  }

  // SUB_UseTargets(true). Vtable at [this+0x60], slot 0x114 (= index
  // 0x45 / 69). Args pushed: (this, USE_TYPE=1) via push esi + pushw 0x1.
  this.subUseTargets?.(true);
}
