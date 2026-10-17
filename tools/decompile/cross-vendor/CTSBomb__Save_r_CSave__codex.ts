```typescript
/**
 * CTSBomb::Save — persist CTSBomb-specific state to a CSave buffer.
 *
 * Delegates base-class persistence to CTSObjective::Save, then writes
 * CTSBomb's two typed fields through CSave::WriteFields.
 *
 * @param this  The CTSBomb entity instance (this in the original C++)
 * @param save  The CSave buffer to write into (by reference)
 * @returns     Non-zero on success, zero on failure (CSave convention)
 */
export function Save(this: CTSBomb, save: CSave): number {
  // Let the parent class persist its own fields first. Bail if it fails.
  if (CTSObjective_Save(this, save) === 0) {
    return 0;
  }

  // Persist CTSBomb's two typed fields via the engine's typed-field writer.
  return save.WriteFields(
    CTSBomb_CLASS_NAME,             // const char* class name (data-segment literal)
    this,                           // void* instance pointer
    CTSBomb_TYPEDESCRIPTION_TABLE,  // TYPEDESCRIPTION* table (2 entries)
    2,                              // int field count
  );
}
```
