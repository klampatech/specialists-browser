```typescript
/**
 * CTSMapGlobals::Restore — restores this entity's save-game state.
 *
 * Invokes the base CBaseEntity::Restore first. If that succeeds, delegates
 * this class's own field deserialization (2 fields, per its
 * TYPEDESCRIPTION table) to the engine's CRestore::ReadFields helper.
 *
 * @param this     The CTSMapGlobals entity instance (esi in the original).
 * @param restore  The CRestore helper providing save-game I/O (edi).
 * @returns        0 if CBaseEntity::Restore returned 0; otherwise the
 *                 return value of CRestore::ReadFields (typically 1).
 */
export function Restore(this: any, restore: any): number {
  // Defer to the base CBaseEntity::Restore; propagate failure (0).
  if (CBaseEntity_Restore(this, restore) === 0) {
    return 0;
  }

  // Read this class's 2 declared fields via CRestore::ReadFields.
  // Args (right-to-left as pushed by the compiler at 0x62508–0x6251c):
  //   2                              — fieldCount (literal)
  //   [GOT + 0x1d8c]                 — TYPEDESCRIPTION* (class's m_TypeDesc, 2 entries)
  //   this                           — void* data pointer
  //   [GOT - 0x6ed6f]                — const char* section name (likely "CTSMapGlobals")
  //   restore                        — CRestore& (`this` for ReadFields, passed in edi)
  // TODO(asm-ambiguous): the literal section-name string and the
  //   TYPEDESCRIPTION table are resolved against the GOT but not surfaced
  //   in this chunk; both are CTSMapGlobals statics declared elsewhere.
  return CRestore_ReadFields(
    restore,
    CTSMapGlobals_SectionName, // const char*  — see [GOT - 0x6ed6f]
    this,                     // void*
    CTSMapGlobals_TypeDesc,   // TYPEDESCRIPTION* (count = 2) — see [GOT + 0x1d8c]
    2,                        // fieldCount
  );
}
```
