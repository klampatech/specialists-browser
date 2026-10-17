```
VERDICT: FAIL

Checklist:
1. Signature — ✅ — matches `CTSGroundWeapon::Save(CSave&)` from the
   demangled symbol `Save__15CTSGroundWeaponR5CSave`; `this: CTSGroundWeapon`
   arg + `save: CSave` arg + `number` return all line up.
2. Version check pattern — ⚠️ N/A — this is an entity method, not a
   `GetEntityAPI*` / `GetNewDLLFunctions` entry point. No interface
   version gate to compare.
3. `*interfaceVersion` assignment-back — ⚠️ N/A — same reason.
4. Success path — ✅ — `CBaseEntity.prototype.Save.call(this, save)` →
   `save.WriteFields(...)` mirrors the disassembly's
   `call CBaseEntity::Save` → `test eax,eax` / `jne` → `call WriteFields`
   control flow exactly, including the `mov eax,0x0` early-out on the
   failure path.
5. No fabricated paths — ❌ — `this.m_SaveData` is fabricated. The
   disassembly loads the TYPEDESCRIPTION table from a GOT-resident
   static/global at `[ebx+0x1b78]` (`push DWORD PTR [ebx+0x1b78]`),
   not from anything on `this`. There is no read of `esi+/-offset` for
   the table — the source operand is purely GOT-relative, which is   how PIC code addresses static class members.
6. No TODO body — ✅ — body is real logic; TODOs only on `any` aliases.
7. Field names — ⚠️ — `m_SaveData` is the correct HLSDK name for the
   per-class TYPEDESCRIPTION table (matches `CBaseEntity::m_SaveData`
   and the per-subclass overrides), but it's a *static class member*,
   not an instance field. The TS treats it as `this.m_SaveData`
   (instance), which is the wrong scope.
8. Compiles in isolation — ✅ — the `any` aliases cover all referenced
   types; the function compiles standalone.

Issues to fix:
- `this.m_SaveData` is fabricated data flow. Replace with a
  static/global symbol. Two acceptable forms:
    (a) a module-level constant: `const CTSGroundWeapon_SaveData:
 TYPEDESCRIPTION[] = [] as any;`
    (b) a static on the class: `(CTSGroundWeapon as any).m_SaveData`
  Form (a) is cleaner given the conversion guidance says "don't
  reconstruct the full class yet".
- `this as unknown as VoidPtr` is unnecessary noise — `save.WriteFields`
  is typed through `CSave = any`, which already accepts `this` (also
  `any`) directly. Drop the cast; `this` *is* the data pointer
  (`esi` in the disassembly, loaded from `[esp+0x10]`).
- The `VoidPtr` type alias is unused after removing the cast — remove
  it, or keep it only if you want to document the intent.
- Doc comment should note that the success-path return is whatever
  `WriteFields` returns (eax preserved across the cleanup), not a
  synthesized value — currently it implies this but could be tighter.
- Add a `TODO(asm-ambiguous)` note that the 3 TYPEDESCRIPTION entries
  themselves are not visible in this function's disassembly — D.4 needs
  to extract them from the data segment or a sibling function.

Suggested rewrite (full TS function):

```typescript
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
```
