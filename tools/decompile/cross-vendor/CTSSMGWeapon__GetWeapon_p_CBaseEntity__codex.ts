```typescript
/**
 * CTSSMGWeapon::GetWeapon — initializes the SMG weapon on pickup.
 * Guards on an entity state byte, delegates to the ground-weapon base,
 * caches the active weapon id into the entity, then resolves the SMG's
 * weapon info and applies its model string to the entity via the engine.
 *
 * @param this  The CTSSMGWeapon instance (passed in as the CBaseEntity* arg)
 * @returns     void
 */
export function GetWeapon(this: CTSSMGWeapon): void {
  const pev = this.pev;                                // [ebp+0x0]

  // Guard: if pev+0x118 (a state byte in the engine entity vars) is
  // signed-negative, the entity is in an invalid state — return
  // without doing any work.
  // TODO(asm-ambiguous): exact meaning of pev+0x118.
  if ((pev as any).field_0x118 < 0) {
    return;
  }

  // Call the base class (CTSGroundWeapon::GetWeapon) with the entity
  // and a second argument whose source is not visible in this chunk.
  // TODO(asm-ambiguous): second arg pushed from [esp+0x2c].
  (CTSGroundWeapon as any).GetWeapon(this, undefined);

  // Re-check the guard. If pev+0x118 became negative during the base
  // call, resolve the active weapon id via a virtual call on the class
  // vtable at this+0x60, offset 0x11c, and cache it in m_iId at
  // this+0xa4.
  if ((pev as any).field_0x118 < 0) {
    const classVtable = (this as any).classVtable;     // [ebp+0x60]
    this.m_iId = (classVtable as any).call_0x11c(this);
  }

  // Resolve the SMG's weapon info by id, then take the pointer at
  // info+0x1f2 — probably the viewmodel / model string field.
  const info = get_weapon_info(this.m_iId);
  const infoString = (info as any) + 0x1f2;

  // Apply the strings through the engine singleton: push the entity's
  // pev+0x208 string (likely a model / view slot) and the info string,
  // calling through the engine's vtable at offset 8.
  // TODO(asm-ambiguous): exact role of pev+0x208 and the engine
  //                       singleton at [ebx+0x1aa8].
  const pevString = (pev as any).field_0x208;
  const engine = (globalThis as any).g_Engine;         // [ebx+0x1aa8]
  (engine as any).call_0x8(pevString, infoString);     // [esi+0x8]
}
```
