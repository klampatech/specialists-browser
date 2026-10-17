/**
 * CTSWinGiver::Use — once this entity has been used its configured
 * number of times, call CTSGameRules::TeamWin, optionally broadcast a
 * localized HUD message to all clients, then latch and reset.
 *
 * C symbol:    Use__11CTSWinGiverP11CBaseEntityT18USE_TYPEf
 * Demangled:   CTSWinGiver::Use(CBaseEntity*, USE_TYPE, float)
 * Reference:   void CBaseEntity::Use(CBaseEntity*, USE_TYPE, float)
 *
 * `this` field offsets (via ESI in the disassembly):
 *   [esi+0x64] int   use counter
 *   [esi+0x68] byte  fired flag (1 = latched)
 *   [esi+0x74] int   team passed to TeamWin
 *   [esi+0x78] int   required-uses threshold
 *
 * GOT slots (via EBX, the PIC base):
 *   [ebx+0x14f0] g_pGameRules
 *   [ebx+0x1600] engine subsystem (localization lookup; name inferred)
 */

// ---- Ambient declarations (eiface.h / cbase.h in the real module) ----
declare const g_pGameRules: {
  TeamWin: (
    winningTeam: number,
    scoreDelta: number,
    flag1: boolean,
    flag2: boolean
  ) => void;
};
declare const g_EngineSubsystem: unknown; // inferred name; see TODO

declare function TSHudMessageAll(
  channel: number,
  color: number,
  x: number,
  y: number,
  holdTime: number,
  msg: string
): void;

declare class CBaseEntity {}
declare type USE_TYPE = number; // HL1 USE_TYPE

declare class CTSWinGiver {
  m_iUseCount: number;       // [esi+0x64]
  m_bFired: 0 | 1;           // [esi+0x68]
  m_iTeam: number;           // [esi+0x74]
  m_iRequiredUses: number;   // [esi+0x78]
  // First dword at *this is dereferenced by the assembly; not a vtable
  // (offset 0x1d4 is too large). Type intentionally `unknown`.
  readonly engineClassInfo: unknown;
}

// ------------------------------------------------------------------------

export function Use(
  this: CTSWinGiver,
  _pActivator: CBaseEntity,
  _useType: USE_TYPE,
  value: number
): void {
  // 1. Latch guard. Assembly: cmp byte [esi+0x68], 0; jne end.
  if (this.m_bFired) return;

  // 2. Increment counter, gate on threshold.
  //    Assembly: mov eax,[esi+0x64]; inc; mov [esi+0x64],eax;
  //              cmp eax,[esi+0x78]; jl end.
  this.m_iUseCount += 1;
  if (this.m_iUseCount < this.m_iRequiredUses) return;

  // 3. FPU round-toward-zero on `value`, then TeamWin.
  //    Demangled callee: TeamWin__12CTSGameRulesiibT3
  //      → CTSGameRules::TeamWin(int, int, bool, ?)
  //    The trailing `?` is most likely a second bool flag.
  const scoreDelta = Math.trunc(value);
  g_pGameRules.TeamWin(this.m_iTeam, scoreDelta, true, false);

  // 4. Optional HUD broadcast.
  //    Assembly: edx = *(uint32_t*)this; cmp [edx+0x1d4], 0; je skip
  //    0x1d4 = 468 — too far for a vtable slot, so `edx` is some
  //    other engine-side record; type is unknown.
  //
  //    NOTE on positional args: per MSVC cdecl, the six pushes map to
  //    parameters as below. Param3 / param4 = (x, y) by HL1 convention;
  //    if TSHudMessageAll reverses them, swap these two literals
  //    accordingly (verify with the TSHudMessageAll chunk).
  const classInfo = this.engineClassInfo as { localizedHudMsgHandle?: number } | undefined;
  if (classInfo?.localizedHudMsgHandle !== undefined && classInfo.localizedHudMsgHandle !== 0) {
    // GOT chain: [ebx+0x1600] → [0] → [0x98] is the engine's
    // localization string-table base. The entity's record contributes
    // an offset to combine with that base.
    const localizedBase = g_EngineSubsystem;
    const msgPtr = (typeof localizedBase === 'function'
      ? (localizedBase as unknown as (h: number) => string)(classInfo.localizedHudMsgHandle)
      : `localized#${classInfo.localizedHudMsgHandle}`);
    TSHudMessageAll(
      0,        // channel
      0xff,     // color (255)
      0x00,     // x   (per assembly: param3 = 0x00 — verify with TSHudMessageAll chunk)
      0x08,     // y   (per assembly: param4 = 0x08)
      0x1e,     // holdTime = 30 (tenths of a second)
      msgPtr    // localized message
    );
  }

  // 5. Reset counter, latch.
  //    Assembly: mov [esi+0x64], 0; mov byte [esi+0x68], 1.
  this.m_iUseCount = 0;
  this.m_bFired = 1;
}
