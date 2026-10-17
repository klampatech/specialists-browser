/**
 * CTSTeamEscape::Save — persist a CTSTeamEscape entity to the
 * GoldSrc save buffer.
 *
 *   1. Run CTSObjective::Save on this instance, propagating its
 *      success/failure (1/0) back to the caller.
 *   2. On success, write CTSTeamEscape-specific fields via
 *      CSave::WriteFields.
 *
 * The HL Save/Restore convention is int return, 1 = success.
 * CSave::WriteFields is `void` in HLSDK, so we do not propagate
 * its (non-existent) return value — the disassembly leaves eax
 * to flow out whatever-it-was on the success path, which is the
 * C ABI equivalent of "no defined return"; we pick the convention
 * value (1) explicitly.
 */
export function Save(this: CTSTeamEscape, save: CSave): number {
  // 1. Parent save. Disassembly: `test eax,eax / jne` — non-zero
  //    (success) skips the explicit `mov eax, 0` and falls through
  //    to WriteFields.
  if ((this as unknown as CTSObjective).Save(save) === 0) {
    return 0;
  }

  // 2. CTSTeamEscape-specific field table.
  //    Disassembly pushes (right-to-left cdecl):
  //      edi                       CSave& save            (implicit this)
  //      lea eax,[ebx - 0x6ccbb]   const char* className
  //      esi                       void* data == this
  //      [ebx + 0x1ac4]            TYPEDESCRIPTION* fields
  //      1                         int numFields
  save.WriteFields(
    /* name      */ "CTSTeamEscape", // TODO(verify-D.4): confirm against GOT-0x6ccbb literal
    /* data      */ this,
    /* fields    */ undefined as any, // TODO(D.4): TYPEDESCRIPTION layout from CTSTeamEscape's table
    /* numFields */ 1,
  );

  return 1;
}
