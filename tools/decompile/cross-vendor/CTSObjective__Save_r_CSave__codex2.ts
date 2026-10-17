/**
 * CTSObjective::Save — Serialize this CTSObjective entity into a
 * save buffer.
 *
 * First delegates the base-class portion to CBaseEntity::Save, then
 * writes one CTSObjective-specific typed-field block via
 * CSave::WriteFields. In the original 32-bit MSVC build, `this` is
 * the entity pointer, `save` is the engine's CSave helper, and the
 * return is an int (0 = failure / "stop saving this entity",
 * non-zero = success).
 *
 * Demangled: Save__12CTSObjectiveR5CSave
 * Address:   0x0007c210, 80 bytes
 * Class:     CTSObjective (TS gameplay entity)
 * Sibling:   Restore__12CTSObjectiveR8CRestore at 0x0007c260
 */

// Minimal type stubs so this file compiles in isolation. These get
// fleshed out in D.4 (CTSObjective) and D.5 (CSave / CBaseEntity).
declare class CTSObjective {}
declare class CSave {}
declare function CBaseEntity_Save(this: any, save: CSave): number;
declare function CSave_WriteFields(
  save: CSave,
  sectionName: string,
  baseData: any,
  typedDescriptions: any,
  fieldCount: number,
): number;

// D.4 follow-up: pin down the actual section name + TYPEDESCRIPTION
// table by mapping [ebx-0x6cce9] and [ebx+0x1fe8] into the mod's
// .rodata / .data. For now, declare the symbols so the file
// compiles.
declare const CTSObjective_SAVE_SECTION: string;
declare const CTSObjective_TYPEDESCRIPTION_TABLE: any;

export function CTSObjective_Save(this: CTSObjective, save: CSave): number {
  // 1) Let the base class save its fields first. If CBaseEntity::Save
  //    returns 0, the engine treats the save as failed for this entity
  //    — bail out before writing any subclass-specific fields.
  if (CBaseEntity_Save(this, save) === 0) {
    return 0;
  }

  // 2) Write the single CTSObjective-specific typed field block.
  //    CSave::WriteFields(save, sectionName, this, typedDescriptions, 1)
  //
  //    Argument order comes from the asm's push sequence (reverse-cdecl):
  //      push 0x1                        ; fieldCount
  //      push [ebx+0x1fe8]              ; TYPEDESCRIPTION table
  //      push esi                        ; this
  //      lea eax, [ebx-0x6cce9]          ; section name string
  //      push eax                        ; section name
  //      push edi                        ; save (this for WriteFields)
  //      call CSave::WriteFields
  //
  // TODO(asm-ambiguous): the section-name string ([ebx-0x6cce9]) and
  //    the TYPEDESCRIPTION table pointer ([ebx+0x1fe8]) live in
  //    .rodata / .data and need a data-section mapping (D.4 work) to
  //    pin down their actual values. They are referenced here via
  //    named constants matching the GOT-relative addresses.
  return CSave_WriteFields(
    save,
    CTSObjective_SAVE_SECTION,         // [ebx-0x6cce9]
    this,
    CTSObjective_TYPEDESCRIPTION_TABLE, // [ebx+0x1fe8]
    1,
  );
}
