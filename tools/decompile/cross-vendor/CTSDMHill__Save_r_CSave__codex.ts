```typescript
/**
 * CTSDMHill::Save — Serialize the CTSDMHill entity into a save buffer.
 *
 * Forwards to CBaseEntity::Save; if that returns non-zero, writes the
 * 3-entry TYPEDESCRIPTION data table for this entity via CSave::WriteFields.
 *
 * @param this  The CTSDMHill entity instance (this in the original C++)
 * @param save  The save buffer being written to
 * @returns     0 if CBaseEntity::Save failed; otherwise the result of WriteFields
 */
export function Save(this: CTSDMHill, save: CSave): number {
  // Defer to the parent class save logic first. If it fails, bail out.
  if (CBaseEntity_Save(this, save) === 0) {
    return 0;
  }

  // Write this entity's typed-description table (3 fields). The field-name
  // string and TYPEDESCRIPTION array are static, GOT-relative globals in the
  // .so (resolved through the PIC base in ebx).
  return save.WriteFields(
    /* fieldName */ CTSDMHill_DATATABLE_NAME, // .rodata string @ GOT - 0x6ed53
    /* instance  */ this,                     // start of CTSDMHill instance data
    /* fields    */ CTSDMHill_DATATABLE,      // static TYPEDESCRIPTION[3] @ GOT + 0x1580
    /* count     */ 3,
  );
}
```
