/**
 * CTSMapGlobals::Restore — restores this entity's save-game state.
 *
 * Invokes the base CBaseEntity::Restore first. If that succeeds, delegates
 * this class's own field deserialization (2 fields, per its
 * TYPEDESCRIPTION table) to the engine's CRestore::ReadFields helper.
 *
 * Demangled symbol: CTSMapGlobals::Restore(CRestore&)
 * Address:          0x000624d8
 * Size:             80 bytes
 *
 * @param this     The CTSMapGlobals entity instance (esi in the original).
 * @param restore  The CRestore helper providing save-game I/O (edi).
 * @returns        0 if CBaseEntity::Restore returned 0; otherwise the
 *                 return value of CRestore::ReadFields.
 */
export function Restore(this: any, restore: any): number {
  // Disassembly 0x624f2–0x624f9: call CBaseEntity::Restore(this, restore).
  // Propagate failure (0) per0x624fc–0x62505.
  if (CBaseEntity_Restore(this, restore) === 0) {
    return 0;
  }

  // Disassembly 0x62508–0x62521: call  //   CRestore::ReadFields(this=restore, sectionName, data=this, typeDesc, fieldCount=2)
  // The section-name string and TYPEDESCRIPTION* are PIC-resolved via
  // `[ebx-0x6ed6f]` and `[ebx+0x1d8c]` respectively — surface them from
  // the GOT / data section in a later integration step.
  return CRestore_ReadFields(
    restore,
    CTSMapGlobals_SectionName, // const char*   → [GOT - 0x6ed6f]
    this,                      // void*         → esi
    CTSMapGlobals_TypeDesc,    // TYPEDESCRIPTION* (count=2) → [GOT + 0x1d8c]
    2,                         // int fieldCount → literal 0x2
  );
}
