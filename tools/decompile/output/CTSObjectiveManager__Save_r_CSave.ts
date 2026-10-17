// Local stubs so this compiles in isolation. D.4 will replace these
// with real class/interface definitions.
type CTSObjectiveManager = any;
type CSave = any;
const TYPEDESCRIPTION_TABLE: any = undefined;

/**
 * CTSObjectiveManager::Save — serialize this entity's state into a CSave buffer.
 *
 * Chains to CBaseEntity::Save; on success, writes 13 typed fields via
 * CSave::WriteFields using the class's TYPEDESCRIPTION table.
 *
 * Disassembly summary:
 *   - Prologue: push edi/esi/ebx, PIC base in ebx.
 *   - esi = this (from [esp+0x10]), edi = save (from [esp+0x14]).
 *   - Call CBaseEntity::Save(this, save).
 *   - test eax,eax; jne to WriteFields block.
 *   - If zero: mov eax, 0; jmp to epilogue (return 0 without writing fields).
 *   - If non-zero: push 5 args right-to-left to
 *     CSave::WriteFields(pClassName, pBaseData, pFields, fieldCount)
 *     and fall through to epilogue — return value is whatever
 *     WriteFields returned (no second failure check).
 *
 * @param this  The CTSObjectiveManager entity instance
 * @param save  The CSave buffer to serialize into
 * @returns     0 if the base CBaseEntity::Save failed; otherwise the
 *              return value of CSave::WriteFields (untested).
 */
export function Save(this: CTSObjectiveManager, save: CSave): number {
  // 1. Chain to the base class. PLT entry `Save__11CBaseEntityR5CSave@plt`
  //    resolves to `CBaseEntity::Save`, not a method on `this`.
  // TODO(D.4): replace CBaseEntity_Save stub with the real base-class
  //       binding once the class hierarchy is in place.
  if (CBaseEntity_Save(this, save) === 0) {
    return 0;
  }

  // 2. Write this class's typed fields. Args pushed right-to-left in
  //    the disassembly; signature resolves to
  //    CSave::WriteFields(pClassName, pBaseData, pFields, fieldCount).
  //
  //    Globals resolved via the PIC base (ebx):
  //      className  @ GOT - 0x6cd33   (entity classname literal)
  //      pFields    @ GOT + 0x20ac    (CTSObjectiveManager::m_Typedescription)
  //    fieldCount = 0xd = 13.
  // TODO(D.4): replace with the real TYPEDESCRIPTION_TABLE binding.
  // TODO(asm-ambiguous): the classname string content isn't in this chunk.
  //       "TSObjectiveManager" is a guess pending strings-n5.txt lookup.
  return save.WriteFields(
    "TSObjectiveManager",     // pClassName — TODO: confirm via strings dump
    this,                     // pBaseData
    TYPEDESCRIPTION_TABLE,    // pFields13,                       // fieldCount
  );
}

// PLT mirror for CBaseEntity::Save. D.4 will replace this stub with the
// real base-class binding once the class hierarchy is in place.
declare function CBaseEntity_Save(this: CTSObjectiveManager, save: CSave): number;
