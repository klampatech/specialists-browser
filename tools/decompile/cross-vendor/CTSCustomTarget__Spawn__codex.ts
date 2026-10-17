```typescript
/**
 * CTSCustomTarget::Spawn — one-time entity initialization on map spawn.
 *
 * Sets the classname string, configures the entity as non-solid
 * (SOLID_NOT), non-targetable (FL_NOTARGET), with movetype PUSH,
 * and zeroes internal state fields that KeyValue / GetTargets /
 * FireTarget / Use will populate and read at runtime.
 *
 * @param this  The CTSCustomTarget instance
 * @returns     void
 */
export function Spawn(this: CTSCustomTarget): void {
  // CBaseEntity::m_pev is at offset 0 of the entity.
  const pev: any = this.pev;

  // pev->classname = STRING("ts_custom_target")
  //   Computed at C-link time as: addr(literal) - gpGlobals->pStringBase.
  //   The literal lives at [GOT - 0x6ed83]; pStringBase at [gpGlobals + 0x98].
  // TODO(asm-ambiguous): confirm literal in tools/decompile/analysis/strings-n5.txt
  //      (expected "ts_custom_target") and the engine-version offset of pStringBase.
  pev.classname = STRING('ts_custom_target');

  // pev->flags |= FL_NOTARGET (0x80)
  pev.flags |= 0x80;

  // pev->solid = SOLID_NOT (0)
  pev.solid = 0;

  // pev->movetype = MOVETYPE_PUSH (5)
  pev.movetype = 5;

  // Zero CTSCustomTarget internal fields. Populated later by KeyValue
  // (during map load); consumed by GetTargets / FireTarget / Use.
  // TODO(asm-ambiguous): exact field semantics depend on CTSCustomTarget
  //      class layout not present in this disassembly chunk —
  //        * 0x0c..0x18 look like a small int array
  //          (target counts, next-to-fire index, total fires, etc.)
  //        * 0x870..0x874 look like adjacent 4-byte slots
  //          (likely pointer/size fields inherited from a base class).
  this.field_0x0c = 0;
  this.field_0x10 = 0;
  this.field_0x14 = 0;
  this.field_0x18 = 0;
  this.field_0x870 = 0;
  this.field_0x874 = 0;
}
```
