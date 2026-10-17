/**
 * CTSHack::Restore — restores CTSHack-specific save-state fields from
 * a save game. Binary: `Restore__7CTSHackR8CRestore` @ 0x0007cc7c,
 * 80 bytes. PIC GOT base = 0x15e010 (call/pop/add0xe918c).
 *
 * Flow: delegate to CTSObjective::Restore; if it returned non-zero,
 * call CRestore::ReadFields once with the CTSHack typedesc.
 *
 * @param this     CTSHack*  — the entity being restored
 * @param restore  CRestore& — engine save/restore stream
 * @returns        ReadFields()'s int (0=FALSE / non-zero=TRUE)
 */
export function Restore(this: any, restore: any): number {
  // 1. Delegate to parent. Disasm pushes for CTSObjective::Restore
  //    (right-to-left under GCC i386, this is explicit):
  //      push edi (restore)  → arg2
  //      push esi (this)     → arg1 (this)
  //      call CTSObjective::Restore
  //    Demangled: Restore__12CTSObjectiveR8CRestore  (one CRestore&).
  //    jne success; mov eax,0; jmp epilogue on parent failure.
  // TODO(asm-ambiguous): CTSObjective type not yet defined.
  const baseResult: any = (CTSObjective as any).Restore(this, restore);
  if (baseResult === 0) {
    return 0;
  }

  // 2. CRestore::ReadFields for the CTSHack-specific field.
  //    Demangled: ReadFields__8CRestorePCcPvP15TYPEDESCRIPTIONi
  //      = ReadFields(CRestore*, const char*, void*, TYPEDESCRIPTION*, int)
  //
  //    Disasm arg pushes (right-to-left), top→bottom after sub esp,0xc:
  //      edi                = restore this for ReadFields
  //      eax  = lea [ebx-0x6ccd2]  = field-name string (rodata literal)
  //      esi                = this CTSHack*  (base ptr for field offset)
  //      [ebx+0x166c]       = TYPEDESCRIPTION* (1-entry typedesc table)
  //      0x1                = int count
  //
  //    Cleanup: add esp,0x20 = 0xc + 5*4 ✓
  return (restore as any).ReadFields(
    CTSHACK_FIELD_NAME,        // const char*  — rodata @ [GOT - 0x6ccd2]
    this,                      // void*        — base for field offset
    CTSHACK_TYPEDESCRIPTION,   // TYPEDESCRIPTION* — GOT[+0x166c], 1 entry
    1,                         // int          — read exactly one field
  );
}
