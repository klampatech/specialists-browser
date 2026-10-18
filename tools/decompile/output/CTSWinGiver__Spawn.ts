/**
 * CTSWinGiver::Spawn — initialise the WinGiver entity on level load.
 *
 * Faithful translation of `Spawn__11CTSWinGiver` (0x0007bf10, 157 B).
 *  - Sets classname (string_t computed via PIC + engine string table base).
 *  - Clears four pev visual-default fields.
 *  - Zeroes four WinGiver-specific dwords (offsets 0x0c / 0x10 / 0x14 / 0x18).
 *  - Schedules the first think via pev->0x104 (= HLSDK `nextthink`).
 *  - Dispatches a virtual call through this->field_0x60->vtable[15].
 *
 * All TS entvars_t / CTSWinGiver field identities are TODO-confirm.
 */

declare const GOT_BASE: number;

class CTSWinGiver {
  pev: any = null;
  // Members zeroed in body (order in asm: 0x14, 0x18, 0x0c, 0x10;
  // reordered here for clarity — independent stores).
  field_0x0c = 0;
  field_0x10 = 0;
  field_0x14 = 0;
  field_0x18 = 0;
  // Pointer at offset 0x60; vtable slot 15 (= 0x3c / 4).
  field_0x60: any = null;
}

export function Spawn(this: CTSWinGiver): void {
  // ---- PIC base -----------------------------------------------------
  // 0x1600 GOT slot points to an engine struct. We deref twice
  // (engineStructPtr -> engineStruct -> first dword). The same
  // engineStruct is used for both classname (offset 0x98, presumably
  // a string-table base) and nextthink (offset 0, presumably a time).
  // gpGlobals is unlikely outright (its struct is ~12 fields so
  // +0x98 makes no sense in gpGlobals).
  // TODO(asm-ambiguous): identify engineStruct against TS engine structs.
  // TODO(asm-ambiguous): confirm string-table offset (0x98) and
  // time-source offset (0) against the symbol table.
  const engineStructPtr: any = (GOT_BASE as any) + 0x1600;
  const engineStruct: any = readDword(engineStructPtr);
  const engineStructDeref: any = readDword(engineStruct);

  const pev = this.pev;

  // ---- classname (string_t) -----------------------------------------
  // asm: lea eax, [ebx-0x6ce49]; sub eax, [ecx+0x98]
  // Standard PIC pattern for (literal_runtime_addr - string_table_base).
  // [ecx+0x98] is the engine's runtime string-table base pointer;
  // ecx == engineStruct.
  pev.classname = (GOT_BASE - 0x6ce49) - readDword(engineStruct + 0x98);

  // ---- pev visual-default fields (offsets not yet mapped to TS names)
  // TODO(asm-ambiguous): confirm 0x118 / 0x10c / 0x1a4 / 0x108 against TS entvars_t.
  pev['field_0x118'] = 0x80;
  pev['field_0x10c'] = 0;
  pev['field_0x1a4'] = 0;
  pev['field_0x108'] = 0;

  // ---- WinGiver-specific state (4 dwords) ---------------------------
  this.field_0x0c = 0;
  this.field_0x10 = 0;
  this.field_0x14 = 0;
  this.field_0x18 = 0;

  // ---- Schedule nextthink -------------------------------------------
  // asm: fld QWORD [ebx-0x6ecd0]; fadd DWORD [eax]; fstp DWORD [ecx+0x104]
  // 0x104 in pev is HLSDK `nextthink`; eax is engineStructDeref
  // (a re-load of the same slot — same value as the classname path).
  // TODO(asm-ambiguous): the fld QWORD / fadd DWORD size mismatch —
  //   only the low 4 bytes of the constant participate. A literal
  //   nextthink = time + 0.1f would emit `fld DWORD`, not `fld QWORD`.
  //   Either the constant is genuinely stored as 8 bytes (rare) or
  //   this is a peephole quirk; worth eyeballing the bytes at
  //   GOT_BASE-0x6ecd0.
  pev['field_0x104'] = (GOT_BASE - 0x6ecd0) + readDword(engineStructDeref);

  // ---- Virtual call -------------------------------------------------
  // asm: sub esp,0xc (uninitialised); mov eax,[edx+0x60]; push edx;
  //      call [eax+0x3c]; add esp,0x20
  // The 3 uninit dwords are real — the asm never writes them.
  // Most likely a "schedule a callback" trampoline whose callee
  // doesn't read them; passing explicit zeros would be a fabrication.
  // TODO(asm-ambiguous): identity of this.field_0x60 and vtable slot 15.
  // TODO(asm-ambiguous): why 3 extra dwords are uninitialised on the
  //   stack — variadic helper, or stack scratch?
  const iface: any = (this as any).field_0x60;
  if (iface) {
    (iface.vtable as any)[15].call(iface, this);
  }
}

// Local helper so the file parses in isolation.
// In a real build this would be a generated PIC stub.
export function readDword(addr: number): number {
  // Placeholder for the decompiler — real implementation reads from
  // the loaded module's data segment.
  return 0 as any;
}
