```typescript
/**
 * CTSObjectiveManager::Save — serialize this entity's state into a CSave buffer.
 *
 * Chains to CBaseEntity::Save; on success, writes 13 typed fields via
 * CSave::WriteFields using the class's TYPEDESCRIPTION table.
 *
 * @param this  The CTSObjectiveManager entity instance
 * @param save  The CSave buffer to serialize into
 * @returns     Non-zero on success; 0 if base CBaseEntity::Save failed
 */
export function Save(this: CTSObjectiveManager, save: CSave): number {
  // TODO: CTSObjectiveManager / CSave / CBaseEntity bindings land in D.4.
  // TODO(asm-ambiguous): the base Save return convention (0 == fail) and the
  //       exact propagation of WriteFields' return value are inferred from
  //       the disassembly, not from the GoldSrc SDK source.

  // 1. Chain to the base class. If it failed, abort with 0.
  if ((this as any).Save(save) === 0) {
    return 0;
  }

  // 2. Write this class's typed fields (13 entries). Both the classname
  //    literal and the TYPEDESCRIPTION* table are globals resolved via the
  //    PIC/GOT base computed in the prologue:
  //      className  @ GOT - 0x6cd33   (the entity classname literal)
  //      pFields    @ GOT + 0x20ac    (CTSObjectiveManager::m_Typedescription)
  // TODO(asm-ambiguous): exact classname literal content not visible in chunk.
  return (save as any).WriteFields(
    /* className  */ "TSObjectiveManager",
    /* pInstance  */ this,
    /* pFields    */ TYPEDESCRIPTION_TABLE,
    /* fieldCount */ 13,
  );
}
```
