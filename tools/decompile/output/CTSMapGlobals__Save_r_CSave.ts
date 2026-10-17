/**
 * CTSMapGlobals::Save(CSave&) — serialize the CTSMapGlobals entity
 * state by first delegating to CBaseEntity::Save, then writing the
 * typed fields declared on this class via CSave::WriteFields.
 *
 * Address: 0x00062488  Size: 80 bytes
 * Demangled symbol: Save__13CTSMapGlobalsR5CSave
 *   → "Save(CTSMapGlobals&, CSave&)" — i.e., an instance method
 *     emitted in this binary with the (this, save) two-arg form.
 *
 * @param this  The CTSMapGlobals entity instance (C++ `this`)
 * @param save  The CSave destination (passed by reference)
 * @returns     CSave::WriteFields' return value on success;
 *              0 if the base CBaseEntity::Save chain failed.
 */

// TODO(asm-ambiguous): CSave / CBaseEntity / CTSMapGlobals are
//   engine / mod types not yet stubbed in our TS model — treat
//   them as forward `any` declarations for D.3.
// TODO(asm-ambiguous): [ebx+0x1d8c] is a GOT-relative global
//   referencing the typed-save descriptor table (2 entries) for
//   CTSMapGlobals. Forward-declare
//     const CTSMapGlobals_TypeDescriptors: any[] = [/* 2 entries */];
//   Real shape (one float, one CBaseEntity*) is a D.4 task.

export function Save(this: CTSMapGlobals, save: CSave): number {
  // First call into the base class. The disassembly at 624a2-624a4
  // pushes both `esi` (this) and `edi` (save) before the PLT call
  // to Save__11CBaseEntityR5CSave — i.e., the base-class save is
  // dispatched in the same two-arg (this, save) shape as ours.
  if (CBaseEntity.Save(this as CBaseEntity, save) === 0) {
    return 0; // 624b0: mov eax, 0x0 ; jmp 624d4
  }

  // CSave::WriteFields(CSave&, char const*, void*, TYPEDESCRIPTION*, int)
  // Pushed right-to-left at 624bb-624cc; order on the wire is
  // (save, "CTSMapGlobals", this, descriptors, 2). The string literal
  // is the GOT-relative rodata at ebx-0x6ed6f; the descriptor table
  // pointer is at ebx+0x1d8c; the count is the literal `push 0x2`.
  return save.WriteFields(
    "CTSMapGlobals",                // classname (rodata via GOT)
    this,                          // entity state base
    CTSMapGlobals_TypeDescriptors, // typed-description table
    2                              // field count
  );
}
