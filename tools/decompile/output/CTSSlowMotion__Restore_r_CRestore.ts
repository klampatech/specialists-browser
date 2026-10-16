/**
 * CTSSlowMotion::Restore — restore this entity's state from a save game.
 *
 * Defers to the base class (CBaseEntity::Restore) for the shared entity
 * state, then loads CTSSlowMotion's two extra fields through
 * CRestore::ReadFields and the data-driven TYPEDESCRIPTION table.
 *
 * @param this    The CTSSlowMotion entity instance
 * @param restore The CRestore helper used to read save data
 * @returns       0 if the base class restore failed; otherwise the
 *                result of CRestore::ReadFields (typically 1 on success).
 */
// External references — ambient stubs so the snippet type-checks in
// isolation. D.4 will replace these with real CBaseEntity / CRestore /
// CTSSlowMotion declarations.
declare const CBaseEntity: any;

export function Restore(this: any, restore: any): number {
  // Defer to the base class. CRestore-style restore returns 1 on success,
  // 0 on failure — propagate that failure if it happened.
  if (CBaseEntity.Restore(this, restore) === 0) {
    return 0;
  }

  // Restore this class's two extra fields via the data-driven save table.
  // ReadFields args (source order): pName, pData, pTypeDesc, nFields.
  //   pName:     static label         — lea eax, [ebx-0x6ed47]
  //   pData:     pointer to `this`    — pushed esi (the `this` register)
  //   pTypeDesc: TYPEDESCRIPTION ptr  — push DWORD PTR [ebx+0x18c4]
  //   nFields:   2                    — push 0x2
  // TODO(asm-ambiguous): the exact contract for pName (class-name string
  //                       used for error reporting vs. a data-block
  //                       identifier) is inferred — not visible from the
  //                       disassembly alone.
  // TODO: resolve the two globals at offsets -0x6ed47 (below GOT) and
  //       +0x18c4 (above GOT) once the GOT layout and strings-n5.txt
  //       are fully mapped.
  return restore.ReadFields(
    undefined as any, // TODO: static label (GOT - 0x6ed47)
    this,
    undefined as any, // TODO: TYPEDESCRIPTION table (GOT + 0x18c4)
    2,
  );
}
