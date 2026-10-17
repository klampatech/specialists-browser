```typescript
/**
 * CTSDMHill::Restore — restore a CTSDMHill entity from a save game stream.
 *
 * Calls `CBaseEntity::Restore` first to initialize base save/restore
 * state. If that returns 0, this function returns 0 as well.
 * Otherwise it reads the entity's 3 typed fields via
 * `CRestore::ReadFields` and propagates that function's result.
 *
 * @param this         The CTSDMHill entity being restored
 * @param saveHandle   The CRestore read stream
 * @returns            Non-zero on success, 0 if the base restore failed
 */
export function Restore(this: any /* CTSDMHill */, saveHandle: any /* CRestore& */): number {
  // Step 1: base-entity restore. Bail out with 0 on failure.
  if (CBaseEntity_Restore(this, saveHandle) === 0) {
    return 0;
  }

  // Step 2: read this subclass's 3 typed fields via CRestore::ReadFields.
  //   arg1: const char*  — entity class-name string (lea eax, [ebx-0x6ed53])
  //   arg2: void*        — entity instance pointer (esi)
  //   arg3: TYPEDESC*    — static field descriptor table @ [ebx+0x1580]
  //   arg4: int          — number of fields to read (3)
  return saveHandle.ReadFields(
    CTSDMHill_CLASS_NAME,
    this,
    CTSDMHill_FIELD_DESCRIPTORS,
    3,
  );
}
```
