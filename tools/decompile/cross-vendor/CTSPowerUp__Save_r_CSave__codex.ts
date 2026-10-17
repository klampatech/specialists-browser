```typescript
// === Forward references — full types land in D.4 (full-class decomp). ===
declare type CTSPowerUp = any;
declare type CSave = any;
declare type VoidPointer = any;
declare const CBaseAnimating_Save: (self: CTSPowerUp, save: CSave) => number;
declare const CTSPowerUp_SAVENAME: string;
declare const CTSPowerUp_FIELDS: any;

/**
 * CTSPowerUp::Save — persist CTSPowerUp-specific typed fields via the
 * engine CSave save buffer.
 *
 * Calls CBaseAnimating::Save first to write base-class fields; on
 * success, writes two CTSPowerUp-specific typed fields through
 * CSave::WriteFields using the entity's class-name string and the
 * global TYPEDESCRIPTION table.
 *
 * @param this  The CTSPowerUp entity instance (this in the original C++)
 * @param save  The CSave context wrapping the save buffer
 * @returns     Non-zero on success; 0 if CBaseAnimating::Save failed
 */
export function Save(this: CTSPowerUp, save: CSave): number {
  // Delegate base-class persistence; bail out if the base save fails.
  if (CBaseAnimating_Save(this, save) === 0) {
    return 0;
  }

  // Write CTSPowerUp-specific typed fields. The class-name string is
  // resolved PIC-relative from the GOT base (ebx-0x6c66c) and the
  // TYPEDESCRIPTION table is a global at GOT+0x16fc with two entries.
  return save.WriteFields(
    CTSPowerUp_SAVENAME, // entity class-name tag, e.g. "CTSPowerUp"
    this as unknown as VoidPointer,
    CTSPowerUp_FIELDS,   // TYPEDESCRIPTION[2]
    2,                   // field count
  );
}
```
