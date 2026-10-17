/**
 * CTSTeamEscape::Restore — deserializes a CTSTeamEscape entity from a save game.
 *
 * First delegates to the base CTSObjective::Restore; if that succeeds, reads
 * this class's single typed field via CRestore::ReadFields using the class's
 * static TYPEDESCRIPTION table and field-name string. Both the table and the
 * string live in the .data segment and are addressed via the PIC GOT base
 * ([ebx+0x1ac4] and [ebx-0x6ccbb] respectively).
 *
 * @param this      The CTSTeamEscape entity being restored.
 * @param restore   CRestore helper providing the serialized state stream.
 * @returns         Result of CRestore::ReadFields (typically 1); 0 if the
 *                  parent CTSObjective::Restore failed.
 */
// TODO: wire up real types for CTSTeamEscape, CTSObjective, CRestore,
// TYPEDESCRIPTION, and the static TYPEDESCRIPTION table at .data+0x1ac4
// (and the class-name string at .rodata+(-0x6ccbb) from the GOT base).
// Until then, use `any` everywhere so this file compiles in isolation.
type CTSTeamEscape = any;
type CTSObjective  = any;
type CRestore      = any;
type TYPEDESCRIPTION = any;
// Shim so the parent-call lookup compiles without a real CTSObjective class.
declare const CTSObjective: { prototype: { Restore(this: any, restore: CRestore): number } };

export function Restore(this: CTSTeamEscape, restore: CRestore): number {
  // Delegate to the base CTSObjective::Restore. The engine treats 0 as
  // "couldn't restore this entity" — propagate that without calling
  // ReadFields.
  if (CTSObjective.prototype.Restore.call(this, restore) === 0) {
    return 0;
  }
  // Restore this class's single typed field. The TYPEDESCRIPTION table and
  // class-name string are static data in another translation unit; both are
  // resolved via the PIC GOT base. The string is inferred to be the C++
  // class name (HL save-format convention) — verify against .rodata.
  return restore.ReadFields(
    /* pName      */ "CTSTeamEscape",                      // inferred; verify at [ebx-0x6ccbb]
    /* pBaseData  */ this,
    /* pFields    */ __CTSTEAMESCAPE_TYPEDESCRIPTION_TABLE, // static at [ebx+0x1ac4]
    /* fieldCount */ 1,
  );
}

// External symbol — the static TYPEDESCRIPTION[1] table that lives near
// CTSTeamEscape's other out-of-line definitions in the original C++.
declare const __CTSTEAMESCAPE_TYPEDESCRIPTION_TABLE: TYPEDESCRIPTION;
