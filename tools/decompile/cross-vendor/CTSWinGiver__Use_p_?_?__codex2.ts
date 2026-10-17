// ---------------------------------------------------------------------------
// Type stubs — in the real tree these come from `ts/dlls/ts_i386.d.ts`
// (D.4 task) and the generated engine bindings. Declared here so this
// file parses in isolation, per checklist item 8.
// ---------------------------------------------------------------------------

type USE_TYPE = number;

interface CBaseEntity {
  // CBaseEntity fields are out of scope for D.3.
}

interface CTSWinGiver extends CBaseEntity {
  /** @offset 0x68 — single-shot fired flag (byte). */
  m_bFired: number;
  /** @offset 0x64 — trigger counter (int, pre-increment then compared). */
  m_iCounter: number;
  /** @offset 0x78 — win threshold (int, signed compare via jl). */
  m_iThreshold: number;
  /** @offset 0x74 — team index to award on trigger (int). */
  m_iTeam: number;
  // vtable pointer lives at offset 0x00 (implicit C++ vtable). Accessed
  // via (this as any).__vtable or a custom helper in D.4.
}

declare function TeamWin(
  g_pGameRules: unknown, // GOT @ 0x14f0 — TODO(D.4): type as CTSGameRules*
  team: number,
  value: number,
  flag1: boolean,        // TODO(asm-ambiguous): pushw 0x1
  flag2: boolean         // TODO(asm-ambiguous): pushw 0x0 (T3 placeholder)
): void;

declare function TSHudMessageAll(
  r: number,
  g: number,
  b: number,
  x: number,
  y: number,
  message: unknown
): void;

// ---------------------------------------------------------------------------
// Decompiled function
// ---------------------------------------------------------------------------

/**
 * CTSWinGiver::Use — Trigger handler for the team-win-giving entity.
 *
 * Each Use call increments this->m_iCounter. When it reaches
 * this->m_iThreshold, the entity awards a team win via
 * CTSGameRules::TeamWin with this->m_iTeam and the int-truncated
 * `value`, optionally broadcasts a HUD message if vtable[0x1d4] is
 * non-null, then locks itself from re-triggering by setting m_bFired.
 *
 * Demangled: `CTSWinGiver::Use(CBaseEntity *, USE_TYPE, float)`
 * (the mangler dedup'd the second CBaseEntity*; actual signature has
 * the standard CBaseEntity::Use 4-arg layout).
 */
export function Use(
  this: CTSWinGiver,
  _pActivator: CBaseEntity, // unused — disassembly never loads slot 2
  _pCaller: CBaseEntity,   // unused — disassembly never loads slot 3
  _useType: USE_TYPE,      // unused
  value: number            // float, truncated to int via fldcw chop
): void {
  // If already fired, ignore subsequent triggers.
  // Disassembly: cmp BYTE PTR [esi+0x68], 0; jne epilogue
  if (this.m_bFired !== 0) return;

  // Increment the trigger counter.
  // Disassembly: mov eax, [esi+0x64]; inc eax; mov [esi+0x64], eax
  this.m_iCounter++;

  // If we haven't hit the threshold yet, stop here.
  // Disassembly: cmp eax, [esi+0x78]; jl epilogue  (signed compare)
  if (this.m_iCounter < this.m_iThreshold) return;

  // Award the team win.
  // Args (cdecl, pushed right-to-left, so first arg at [ESP+0x00] in callee):
  //   [ESP+0x00] g_pGameRules       — push [ebx+0x14f0]      (4 B)
  //   [ESP+0x04] this->m_iTeam      — push [esi+0x74]         (4 B)
  //   [ESP+0x08] trunc(value)       — push eax (from fistp)   (4 B)
  //   [ESP+0x0c] 0x1                — pushw 0x1   (bool true, per iibT3)
  //   [ESP+0x10] 0x0                — pushw 0x0   (T3 placeholder)
  TeamWin(
    /* g_pGameRules (GOT 0x14f0) */ undefined as any, // TODO: wire up
    this.m_iTeam,
    Math.trunc(value), // float → int with chop rounding (fldcw control word 0xc)
    true,              // pushw 0x1  — TODO(asm-ambiguous)
    false              // pushw 0x0  — TODO(asm-ambiguous)
  );

  // Optional HUD message if vtable[0x1d4] is non-null.
  // Disassembly:
  //   mov  edx, [esi]              ; edx = this->vtable (no null check)
  //   cmp  [edx+0x1d4], 0
  //   je   skip_hud                ; jump if vtable slot is null
  //   ...  compute message ptr = [g_someStringTable.ptr][0x98] + vtable[0x1d4]
  //   push 0x00, 0xff, 0x00, 8, 30, message
  //   call TSHudMessageAll
  // No null guard on vtable (C++ guarantees vtable is live for any
  // constructed object). Optional chaining below is a TS-side safety
  // net for `as any`; it does not introduce a new branch.
  const vtable: any = (this as any).__vtable;
  const hudMessage: unknown = vtable?.[0x1d4];
  if (hudMessage !== 0 && hudMessage !== null && hudMessage !== undefined) {
    // Args to TSHudMessageAll (cdecl, right-to-left push):
    //   0x00 (R), 0xff (G), 0x00 (B), 8 (x), 30 (y), message
    TSHudMessageAll(0x00, 0xff, 0x00, 8, 30, hudMessage);
  }

  // Reset counter and lock out further triggers.
  // Disassembly: mov [esi+0x64], 0; mov BYTE [esi+0x68], 1
  this.m_iCounter = 0;
  this.m_bFired = 1;
}
