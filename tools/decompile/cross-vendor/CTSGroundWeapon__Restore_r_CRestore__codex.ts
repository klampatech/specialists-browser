```typescript
/**
 * CTSGroundWeapon::Restore — restore this CTSGroundWeapon's saved state.
 *
 * Lets CBaseEntity::Restore restore base-entity fields first; if that
 * succeeds, reads the CTSGroundWeapon-specific typed fields (3 of them)
 * via CRestore::ReadFields.
 *
 * @param this    The CTSGroundWeapon instance being restored
 * @param restore The engine's CRestore helper for this save/restore pass
 * @returns       Non-zero on success; 0 if CBaseEntity::Restore failed
 */
export function Restore(this: CTSGroundWeapon, restore: CRestore): number {
  // (1) Parent (base-entity) restore must succeed before we proceed.
  if (CBaseEntity_Restore(this, restore) === 0) {
    return 0;
  }

  // (2) CTSGroundWeapon-specific fields.
  //
  // The class-name string ("CTSGroundWeapon") and the TYPEDESCRIPTION[3]
  // array are static globals in the .so's data segment, addressed via the
  // PIC/GOT base in the original asm (offsets -0x6b6ac and +0x1b78). They
  // are produced next to CTSGroundWeapon::Save and are not materialized in
  // this chunk.
  const className:  any /* "CTSGroundWeapon"   */ = "CTSGroundWeapon" as any; // TODO(asm-ambiguous): confirm against strings-n5.txt
  const typedDesc:  any /* TYPEDESCRIPTION[3]  */ = null as any;              // TODO(asm-ambiguous): field layout out of scope here
  const fieldCount = 3;

  // ReadFields' return value is preserved through the epilogue (the asm
  // does not touch eax after the call) and flows out as our return value.
  // HL Restore convention: 0 = fail, non-0 = ok.
  return restore.ReadFields(className, this, typedDesc, fieldCount) as number;
}
```
