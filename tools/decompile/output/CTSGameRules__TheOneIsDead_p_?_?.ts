/**
 * CTSGameRules::TheOneIsDead — bookkeeping hook fired when "TheOne"
 * (the top-scoring player in a Specialists match) is killed.
 *
 * Behaviour:
 *   1. Clear the rules-side "TheOne is alive" flag.
 *   2. Clear the victim's own is-TheOne flag.
 *   3. Bail early if a dependent global hasn't been initialised.
 *   4. Broadcast a HUD message — generic for suicide/no-attacker,
 *      or one annotated with the attacker's running score when a
 *      separate attacker is supplied.
 *   5. Run engine-side HUD push + per-player virtual dispatch.
 *   6. Promote the new TheOne via SetPlayerTheOne.
 *
 * Demangled signature has 2 CBasePlayer* params + implicit `this`;
 * the disassembly reads a 3rd stack slot (the "attacker / new
 * TheOne"). The trailing `T1` in the demangled symbol is undecoded
 * by our demangler and may encode the extra CBasePlayer* arg.
 *
 * @param this     The CTSGameRules instance  ([esp+0x20])
 * @param pVictim  The player who died          ([esp+0x24], held in ebp)
 * @param pThird   Attacker (or caller-supplied new-TheOne) ([esp+0x28])
 */

// --- Ambient bindings (TODO(D.4): replace with concrete types) ---
declare const GOT_BASE: number;
declare function readDword(addr: number): number;
declare function readCString(addr: number): string;
declare function TSHudMessageAll(
  r: number, g: number, b: number, channel: number, holdtime: number, msg: string,
): void;
declare function UTIL_VarArgs(fmt: string, ...args: any[]): string;
declare function SetPlayerTheOne(rules: any, ...players: any[]): void;
declare function engineNotifySlot(vtableOffset: number, ...args: any[]): void;
declare function playerVirtualField(
  player: any, fieldOffset: number, vtableSlot: number, ...args: any[]
): any;
declare class CTSGameRules {}
declare class CBasePlayer {}

// String-literal addresses are inside .rodata (not GOT), but we
// keep the GOT_BASE-relative form because the disassembly is
// PIC-relative to ebx = GOT_BASE.
const FMT_SUICIDE_ADDR    = GOT_BASE - 0x6e4e1; // "no-attacker" message
const FMT_KILL_WITH_SCORE = GOT_BASE - 0x6e4d0; // "%d points" style format

// GOT-relative globals
const G_UNINIT_DEP  = GOT_BASE + 0x12cc;       // ptr whose *0 means "not ready"
const G_SCORE_CVAR  = GOT_BASE + 0x1600;       // base score cvar / singleton
const G_ENGINE      = GOT_BASE + 0x2060;       // engine singleton (CEngine*)

export function TheOneIsDead(
  this: CTSGameRules,
  pVictim: CBasePlayer,
  pThird: CBasePlayer | null,
): void {
  // ---- (1) Rules-side "TheOne is alive" flag ----
  // arg1 (the rules) + offset 0x5878.
  // TODO(D.4): confirm the field name once CTSGameRules skeleton lands.
  (this as any).field_0x5878 = 0;

  // ---- (2) Null-guard on pVictim (matches 6b27a-6b27c) ----
  if (!pVictim) return;

  // ---- (3) Victim-side is-TheOne flag ----
  // pVictim + offset 0x7b9. Carried in ebp across the rest of the fn.
  // TODO(D.4): confirm the field name.
  (pVictim as any).field_0x7b9 = 0;

  // ---- (4) Bail on uninitialised dependent global (matches 6b289-6b292) ----
  // If the pointer at GOT[0x12cc] points at a zero dword, the engine
  // (or a TS-specific singleton) isn't ready yet — early return.
  // TODO(asm-ambiguous): identify the global in D.4.
  const depPtr: number = readDword(G_UNINIT_DEP);
  if (readDword(depPtr) === 0) return;

  // ---- (5) HUD message broadcast ----
  // Stack arithmetic: in the attacker branch ESP has been decremented by
  // 0x8, so [esp+0x30] lands on the original arg3 (pThird) at base+0x28.
  if (pThird === null || pThird === pVictim) {
    // Suicide / no separate attacker (matches 6b2a5-6b2c4).
    // TODO: pull exact text from tools/decompile/analysis/strings-n5.txt.
    const noAttackerMsg: string = readCString(FMT_SUICIDE_ADDR);
    TSHudMessageAll(100, 150, 255, 1, 30, noAttackerMsg);
  } else {
    // With separate attacker (matches 6b2cc-6b30f).
    //
    // Disassembly:
    //   eax = (*GOT[0x1600])->field_0x98
    //   edx = *(pThird + 0)
    //   score = eax + *(edx + 0x1d0)
    //
    // The TS reads *(pThird+0)+0x1d0 as `pThird->pev->field_0x1d0`
    // (frags in a TS-extended entvars_t). This assumes `pev` is at
    // offset 0 of CBasePlayer — non-standard; verify in D.4.
    // TODO(asm-ambiguous): reconcile against the real CBasePlayer /
    // entvars_t layouts in D.4; offset 0x1d0 is higher than HLSDK's
    // frags offset.
    const pThirdAny = pThird as any;
    const cvarScoreBase: number = readDword(
      readDword(readDword(G_SCORE_CVAR)) + 0x98,
    );
    const attFrags: number = readDword(pThirdAny.pev + 0x1d0);
    const scoreTotal: number = cvarScoreBase + attFrags;
    const formattedMsg: string = UTIL_VarArgs(
      readCString(FMT_KILL_WITH_SCORE),
      scoreTotal,
    );
    TSHudMessageAll(100, 150, 255, 1, 30, formattedMsg);
  }

  // ---- (6) Engine-side HUD push + per-player virtual dispatch ----
  // Three indirect vtable calls (matches 6b312-6b34b). The engine
  // singleton at GOT[0x2060] is almost certainly the GoldSrc CEngine*.
  // The TS wraps them as opaque engine notifications; identify the
  // exact methods once D.4 cross-references the vtable.
  // TODO(asm-ambiguous): identify the methods at vtable slots 0xe0
  // and 0xdc, and the player-side virtual at [pVictim+0x60]->vt[0xd0].

  // (a) engine vtable slot 0xe0 with args (eax=engine, ebp=pVictim)
  engineNotifySlot(0xe0, pVictim);
  // (b) player-side virtual at pVictim[0x60]->vtable[0xd0] with arg (ebp=pVictim)
  playerVirtualField(pVictim, 0x60, 0xd0);
  // (c) engine vtable slot 0xdc with args (eax=engine, ebp=pVictim, return of (b))
  engineNotifySlot(0xdc, pVictim);

  // ---- (7) Promote the new TheOne ----
  // The disassembly pushes [esp+0x30]=arg3 first and [esp+0x2c]=arg2
  // second, with `add esp, 0x8` cleaning up two dwords. That doesn't
  // fit "this + 1 CBasePlayer*" in cdecl (would need this at arg1 =
  // [esp+0x20]). The cleanest reading is __thiscall with this in ECX
  // and two CBasePlayer* stack args: SetPlayerTheOne(pVictim, pThird).
  // The demangled symbol's trailing `T1` is likely the dropped
  // 2nd-CBasePlayer* param.
  //
  // TODO(asm-ambiguous): re-demangle with a stronger tool; until then
  // pass both players and let the stub ignore extras.
  SetPlayerTheOne(this, pVictim, pThird);
}
