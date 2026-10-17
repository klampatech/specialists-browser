```typescript
/**
 * CTSObjective::Save — Serialize this CTSObjective entity into a save buffer.
 *
 * First delegates the base-class portion to CBaseEntity::Save, then writes
 * one CTSObjective-specific typed-field block via CSave::WriteFields.
 *
 * In the original 32-bit MSVC build, `this` is the entity pointer, `save`
 * is the engine's CSave helper, and the return is an int (0 = failure /
 * "stop saving this entity", non-zero = success).
 *
 * @param this  The CTSObjective entity instance (esi in the original C++)
 * @param save  The CSave helper from the engine save system
 * @returns     Non-zero on success; 0 if the base-class save failed.
 */
export function Save(this: CTSObjective, save: CSave): number {
  // 1) Let the base class save its fields first. If CBaseEntity::Save
  //    returns 0, the engine treats the save as failed for this entity
  //    — bail out before writing any subclass-specific fields.
  if (CBaseEntity_Save(this, save) === 0) {
    return 0;
  }

  // 2) Write the single CTSObjective-specific typed field block.
  //    Both the section-name string and the TYPEDESCRIPTION* table are
  //    resolved from the GOT/data segment in the asm (ebx ± offset);
  //    here we reference them as named constants.
  //
  //    CSave::WriteFields signature:
  //      int CSave::WriteFields(
  //        const char*       pSectionName, // section / table name
  //        void*             pBaseData,    // = this
  //        TYPEDESCRIPTION*  pFields,
  //        int               fieldCount
  //      );
  //
  // TODO(asm-ambiguous): the exact section-name string and the field it
  //    covers are not visible from the disassembly alone — they live in
  //    .rodata at the computed addresses and would need a data-section
  //    mapping (D.4 work) to pin down. For now they are referenced via
  //    named constants matching the GOT-relative addresses.
  const sectionName       = CTSObjective_SAVE_SECTION;             // [ebx-0x6cce9]
  const typedDescriptions = CTSObjective_TYPEDESCRIPTION_TABLE;    // [ebx+0x1fe8]
  return CSave_WriteFields(save, sectionName, this, typedDescriptions, 1);
}
```
