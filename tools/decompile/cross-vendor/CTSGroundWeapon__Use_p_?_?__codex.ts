```typescript
/**
 * CTSGroundWeapon::Use — forward a "use" event to the activator entity.
 *
 * When this ground weapon is picked up / triggered, the activator's
 * dispatch table is queried and the entry at byte offset 0x118 is invoked
 * with (pActivator, useType). The float value (flValue) is intentionally
 * not forwarded.
 *
 * @param this       The CTSGroundWeapon entity instance (the ground weapon)
 * @param pActivator The entity using / picking up this weapon
 * @param useType    USE_TYPE describing how the weapon is being used
 * @param flValue    Float value paired with the use event (unused)
 * @returns          void
 */
export function Use(
  this: CTSGroundWeapon,
  pActivator: CBaseEntity,
  useType: USE_TYPE,
  flValue: number
): void {
  // Forward the use event through the activator's dispatch table.
  //
  // asm:
  //   mov eax, [esp+0x18]    ; eax = pActivator (arg1, thiscall)
  //   mov edx, [eax+0x60]    ; edx = pActivator->field_0x60 (function-table ptr)
  //   push [esp+0x1c]        ; arg2 = useType
  //   push eax               ; arg1 = pActivator
  //   call [edx+0x118]       ; indirect call through the table
  //
  // The called function has signature (CBaseEntity*, USE_TYPE) -> void.
  // ecx at the call site still holds `this` (CTSGroundWeapon*) and is NOT
  // used as `this`, so this is a free-function / static-helper dispatch,
  // not a __thiscall virtual call.
  //
  // TODO(asm-ambiguous): CBaseEntity+0x60 is not the standard vtable
  //   (single-inheritance classes put the vtable at offset 0). It may be
  //   a TS-specific dispatch table, a pev-like engine-interface pointer,
  //   or a hidden base subobject.
  // TODO(asm-ambiguous): Identify the function at table[0x118]. The 2-arg
  //   signature suggests a SUB_UseTargets-style helper, a Use override on
  //   a non-first base, or a TS-specific "fire use effects" callback.
  // TODO: CTSGroundWeapon, CBaseEntity, USE_TYPE are defined elsewhere
  //   (in the parent D.4 class reconstruction task).

  const dispatchTable = (pActivator as unknown as Record<number, unknown>)[0x60] as
    Record<number, (a: CBaseEntity, u: USE_TYPE) => void>;
  dispatchTable[0x118](pActivator, useType);
}
```
