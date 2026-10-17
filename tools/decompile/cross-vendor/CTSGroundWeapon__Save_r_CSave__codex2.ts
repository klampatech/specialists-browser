/**
 * CTSGroundWeapon::Save — persist this ground-weapon entity's runtime
 * state into the supplied CSave buffer. Calls CBaseEntity::Save first;
 * if the base save returned non-zero (success), writes the 3 subclass-
 * specific fields through CSave::WriteFields.
 *
 * @param this  The CTSGroundWeapon entity instance (the C++ `this`).
 * @param save  The CSave buffer being populated.
 * @returns     Whatever CSave::WriteFields returns on the success path
 *              (its return value is preserved in `eax` across the
 *              cleanup in the disassembly); 0 on the failure path,
 *              matching `mov eax, 0x0` when the base save fails.
 */
// TODO(decompile): replace `any` aliases with real class skeletons
// (CTSGroundWeapon, CSave, CBaseEntity, TYPEDESCRIPTION) once D.4
// lands in tools/decompile/types/.
type CTSGroundWeapon = any;
type CSave = any;
type CBaseEntity = any;
type TYPEDESCRIPTION = any;

// The TYPEDESCRIPTION table for CTSGroundWeapon is loaded from a GOT
// entry at `[ebx+0x1b78]` in the disassembly (`push DWORD PTR
// [ebx+0x1b78]`), i.e. it's a static class member (the HLSDK
// convention for per-class save data) or a translation-unit global —
// NOT a per-instance `this` field. The 3 actual entries are not
// visible in this function's disassembly and must be extracted by
// D.4 (TS-specific gameplay) from the data segment or a sibling
// function.
// TODO(asm-ambiguous): the 3 TYPEDESCRIPTION entries are unknown// until D.4 cross-references the data segment.
const CTSGroundWeapon_SaveData: TYPEDESCRIPTION[] = [] as any;

export function Save(this: CTSGroundWeapon, save: CSave): number {
  // Persist all inherited CBaseEntity fields first. If the base save
  // returned 0 (failure), propagate the failure and skip our own
  // fields entirely — matches the original `if (!CBaseEntity::Save(save))`
  // (`test eax,eax` / `jne 91980` in the disassembly).
  if (CBaseEntity.prototype.Save.call(this, save) === 0) {
    return 0;
  }

  // Base save succeeded — write the 3 CTSGroundWeapon-specific fields.
  //   arg1 (CSave this): save  //   arg 2 (class name): "CTSGroundWeapon" — debug tag, loaded from
  //                       `[ebx-0x6b6ac]` (a rodata string)
  //   arg 3 (data ptr):   this — `esi` in the disassembly, loaded
  //                       from `[esp+0x10]` (the original `this` arg)
  //   arg 4 (TYPEDESCRIPTION[]): CTSGroundWeapon_SaveData — static
  //                              class member, GOT-resident
  //   arg 5 (count):      3 — `push 0x3`
  return save.WriteFields(
    "CTSGroundWeapon",
    this,
    CTSGroundWeapon_SaveData,
    3,
  );
}
