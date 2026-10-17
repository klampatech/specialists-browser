/**
 * CTSGameRules::SelectRandomTheOne — periodically selects a random
 * eligible player to become "The One" (the VIP in TS's objective
 * mode). Disassembly @ 0x0006af28, 335 bytes.
 *
 * Behaviour:
 *  1. Timer gate: return early if nextSelectTheOneTime has not
 *     elapsed relative to gpGlobals->time.
 *  2. Reset the gate to (gpGlobals->time + interval).
 *  3. Walk player indices 1..maxClients and collect candidates *     that pass IsPlayer(), IsAlive(), and a TS-specific role gate.
 *  4. If any candidate has the "no The One" byte flag set, the
 *     entire selection is aborted (jne to function epilogue).
 *  5. Pick a random candidate via the engine's RandomLong.
 *  6. Hand the pick to SetPlayerTheOne.
 *  7. Announce via two engine-server user-message calls.
 */

// Module-level globals (set by GiveFnptrsToDll / engine handoff).
declare const gpGlobals: { time: number; maxClients: number };
declare const g_engfuncs: {
  RandomLong: (lo: number, hi: number) => number;
  RandomFloat: (lo: number, hi: number) => number;
};

// Minimal class stubs so the function compiles in isolation.
declare class CBasePlayer {
  IsPlayer(): boolean;
  IsAlive(): boolean;
  GetTeamId(): number;
  [k: string]: any;
}
declare class CTSGameRules {
  nextSelectTheOneTime: number;
  SetPlayerTheOne(p: CBasePlayer): void;
  [k: string]: any;
}
declare function UTIL_PlayerByIndex(idx: number): CBasePlayer | null;

export function SelectRandomTheOne(this: CTSGameRules): void {
  // --- Local stack layout (relative to entry esp) -------------------
  //   esp+0x10 .. esp+0x94 : candidates[0..32] (CBasePlayer *)
  //   esp+0xc0             : 'this' (CTSGameRules *), passed by caller
  // Bound check is `cmp edi, 0x20; jg skip`, so up to 33 entries.
  const candidates: Array<CBasePlayer | null> = new Array(33).fill(null);
  let candidateCount = 0;

  // --- PIC / GOT globals (offsets relative to GOT base in ebx) -----
  //   +0x1600  : &gpGlobals (double-deref to gpGlobals->time).
  //   -0x6ecd0 : QWORD constant — the select-interval constant.
  //   +0x1aa8  : engine RNG vtable; +0x168 is RandomLong(min, max).
  //   +0x2060  : engine server vtable; +0xe0 / +0xdc are user-message
  //              sends. Reached through a two-step dereference.

  // --- Timer gate ---------------------------------------------------
  // this+0x587c holds the next-select time. The
  // fcomp/fnstsw/test ah,0x41/je pattern is the standard x87
  // "ST(0) <= op" test (jump when ah & 0x41 == 0).
  if (this.nextSelectTheOneTime > gpGlobals.time) {
    return;
  }

  // Reset the gate: nextSelectTheOneTime = gpGlobals->time + INTERVAL.
  // fld QWORD [ebx-0x6ecd0]; fadd DWORD [gpGlobals->time]; fstp.
  // TODO(asm-ambiguous): the QWORD constant value is unverified —
  // confirm against strings-n5.txt cvar (likely ts_theone_*).
  const SELECT_INTERVAL = 30.0;
  this.nextSelectTheOneTime = gpGlobals.time + SELECT_INTERVAL;

  // --- Candidate scan ------------------------------------------------
  for (let playerIndex = 1; playerIndex <= gpGlobals.maxClients; playerIndex++) {
    const player = UTIL_PlayerByIndex(playerIndex);
    if (!player) continue;

    // player->vtable+0xc8 = IsPlayer().
    if (!player.IsPlayer()) continue;

    // player+0x7b9: TS-specific byte flag. If non-zero on ANY
    // candidate, the whole selection is aborted (jne to epilogue).
    // TODO(asm-ambiguous): field name; likely m_bIsBot / m_bNoTheOne.
    if (((player as any).m_bNoTheOne) !== 0) {
      return;
    }

    // player->vtable+0xb4 = IsAlive().
    if (!player.IsAlive()) continue;

    // [player+0]+0x244 must be 0. Two-step dereference suggests
    // a class-type / role gate (e.g. m_iClassType, m_iRole).
    // TODO(asm-ambiguous): field layout inferred.
    if (((player as any).m_iRoleGate ?? 0) !== 0) continue;

    // Bound check: signed `jg 0x20` caps at 32 (write can occur at
    // index 32 before the cap trips).
    if (candidateCount > 0x20) continue;
    candidates[candidateCount++] = player;
  }

  if (candidateCount <= 0) return;

  // --- Pick a random candidate ---------------------------------------
  // Disassembly: lea eax,[edi-1]; push eax; push 0; call [vtable+0x168];
  // picked = candidates[eax]. No `fistp` between the call and the
  // index use, so the callee returns an int — that is RandomLong,
  // not RandomFloat.
  const pickedIdx = g_engfuncs.RandomLong(0, candidateCount - 1);
  const picked = candidates[pickedIdx];
  if (!picked) return;

  this.SetPlayerTheOne(picked);

  // --- Announce ------------------------------------------------------
  // Two engine-server calls. Vtable reached via a triple deref
  // (ebx+0x2060 → esi → eax → edx), methods at +0xe0 and +0xdc.
  // The second call also passes picked->GetTeamId() (vtable+0xd0).
  // TODO(asm-ambiguous): exact method names; only vtable offsets known.
  // Note arg order from asm push order — cdecl reverses the pushes,
  // so the engine-pointer arg comes first, the picked-player arg
  // comes second.
  const engineServer = (this as any).g_EngineServer as any;
  engineServer.SendMessageA?.(/* engine ctx */ null, picked, /* msg id */ 0);
  const teamId = picked.GetTeamId?.() ?? 0;
  engineServer.SendMessageB?.(/* engine ctx */ null, picked, teamId, /* flags */ 0, /* msg id */ 0);
}
