/**
 * CTSHack::Save — persist this CTSHack entity's runtime state to a save buffer.
 *
 * Calls the parent CTSObjective::Save first to serialize inherited state;
 * if that returns 0 (failure), short-circuits and returns 0. Otherwise
 * writes the single CTSHack-specific TYPEDESCRIPTION entry via
 * CSave::WriteFields, which is what actually commits this class's own
 * fields to the buffer.
 *
 * @param this  The CTSHack entity instance (this in the original C++)
 * @param save  Reference to the active save buffer (CSave& in the original C++)
 * @returns     Non-zero on success; 0 if the parent Save returned failure
 */
export function Save(this: CTSHack, save: CSave): number {
  // Serialize parent-class state first; bail out on failure.
  if (CTSObjective_Save(this, save) === 0) {
    return 0;
  }

  // Serialize this class's own fields (one TYPEDESCRIPTION entry).
  return save.WriteFields(
    "CTSHack",          // classname (PIC base - 0x6ccd2 → .rodata literal)
    this,               // entity base pointer
    CTSHack_DATADESC,   // TYPEDESCRIPTION array singleton ([ebx + 0x166c])
    1,                  // field count
  );
}