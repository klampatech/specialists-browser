```typescript
/**
 * CTSMapGlobals::Save(r CSave) — serialize CTSMapGlobals entity
 * state by delegating to CBaseEntity::Save, then writing the 2
 * typed fields declared for this class via CSave::WriteFields.
 *
 * @param this  The CTSMapGlobals entity instance (this in the original C++)
 * @param save  The CSave destination (passed by reference in the original C++)
 * @returns     number — non-zero on success; 0 if CBaseEntity::Save failed
 */
export function Save(this: CTSMapGlobals, save: CSave): number {
  // TODO(asm-ambiguous): CSave / CBaseEntity are engine types not yet
  //   stubbed in our TS model — treat as forward declarations.
  // Forward to the base entity save first.
  if (CBaseEntity.Save(save) === 0) {
    return 0;
  }
  // CSave::WriteFields(pClassName, pBaseData, pTypeDescriptors, fieldCount)
  // TODO: [ebx+0x1d8c] is a GOT-relative global referencing the typed-save
  //   descriptor table (2 entries) declared for CTSMapGlobals.
  return save.WriteFields(
    "CTSMapGlobals",              // class name literal (rodata at GOT-relative ebx-0x6ed6f)
    this,                         // entity state buffer base
    CTSMapGlobals_TypeDescriptors,
    2
  );
}
```
