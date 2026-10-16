```typescript
/**
 * CTSSlowMotionPoint::CreateSlowMotionPoint — static factory that allocates
 * a new CTSSlowMotionPoint entity, places it at `position`, spawns it in
 * the world, and activates the slow-motion effect with the supplied
 * parameters. Returns null (after broadcasting an error to all clients)
 * if the entity allocation fails.
 *
 * Demangled: `CTSSlowMotionPoint::CreateSlowMotionPoint(Vector, float, float, float, bool)`
 * NOTE: static method — no `this` parameter in the original C++ signature.
 *
 * @param position    World-space position (12 bytes copied into `pev->origin`).
 * @param duration    Forwarded to `ActivateSlow` as the 1st float.
 * @param slowAmount  Forwarded to `ActivateSlow` as the 2nd float.
 * @param radius      Forwarded to `ActivateSlow` as the 3rd float.
 * @param active      Forwarded to `ActivateSlow` as the bool.
 * @returns           The new CTSSlowMotionPoint, or null on allocation failure.
 */
export function CreateSlowMotionPoint(
  position: Vector,
  duration: number,
  slowAmount: number,
  radius: number,
  active: boolean
): CTSSlowMotionPoint | null {
  // 1. Engine-side entity allocation (CREATE_ENTITY macro).
  const point = GetClassPtr(CTSSlowMotionPoint);

  // 2. Allocation failure: broadcast an error and bail with null.
  if (point === null) {
    // TODO(asm-ambiguous): the actual error string is the static C string
    // at GOT-0x6ecb0 in ts_i386.so — almost certainly an "out of edicts"
    // or "out of memory" diagnostic. msg_type 3 = HUD center print.
    UTIL_ClientPrintAll(/* msg_type */ 3, /* TODO: see GOT-0x6ecb0 */ "");
    return null;
  }

  // 3. Copy the 12-byte position Vector into pev->origin.
  //    Class layout (CTSSlowMotionPoint, inherited from CBaseEntity):
  //      offset 0x00 = pev_t* pev
  //      pev  + 0x08 = origin (vec3_t — the engine reads this each tick)
  //    The compiler emits `cld; mov ecx, 3; rep movsd` for the 12-byte copy.
  point.pev.origin.x = position.x;
  point.pev.origin.y = position.y;
  point.pev.origin.z = position.z;

  // 4. Virtual Spawn() — initialise the entity in the world.
  //    Vtable pointer lives at class+0x60 (vfptr); Spawn sits at vtable slot 9
  //    (vtable + 0x24). The compiler emits:
  //      mov eax, [ebp+0x60]; push ebp; call DWORD PTR [eax+0x24]
  //    The trailing `add esp, 0x2` is a stack-alignment nudge.
  point.Spawn();

  // 5. Activate the slow-motion effect with the three floats + bool.
  //    Note: the bool is pushed as a 16-bit value (`push ax` after `mov al, ...`)
  //    — a compiler quirk packing the 1-byte bool into a 2-byte stack slot.
  //    The function is a member call (this = `point`, returned earlier).
  point.ActivateSlow(duration, slowAmount, radius, active);

  return point;
}
```
