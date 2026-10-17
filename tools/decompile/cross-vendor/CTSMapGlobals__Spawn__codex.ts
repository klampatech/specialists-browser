```typescript
/**
 * CTSMapGlobals::Spawn — initialize the map-globals entity when it spawns.
 *
 * Performs the standard HL spawn boilerplate (clear pev user fields,
 * set origin, set a point-sized bounding box) on the entity itself,
 * then drives fields in the global game-state struct from the
 * entity's spawnflags + the freshly-computed weapon restriction.
 *
 * @param this  The CTSMapGlobals entity instance (this in the original C++).
 * @returns     void
 */
export function Spawn(this: CTSMapGlobals): void {
  // TODO(asm-ambiguous): virtual call on the sub-object at this+0x60,
  // vtable slot 10 (offset +0x28), with `this` passed as the explicit
  // first stack arg. Field purpose and call effect unknown.
  this.subObject_0x60?.vtable[10]?.(this);

  // Clear two pev fields at +0x108 / +0x10c.
  this.pev.field_0x108 = 0;
  this.pev.field_0x10c = 0;

  // UTIL_SetOrigin(pev, pev->origin).
  // TODO(asm-ambiguous): pev+0x08 is being used here as the Vector origin
  // reference, but vanilla HL SDK puts origin at +0x54. TS likely
  // reshuffled entvars_t — confirm against an actual TS pev dump.
  UTIL_SetOrigin(this.pev, this.pev.origin);

  // UTIL_SetSize with a point-sized bounding box — both min and max
  // vectors are identical, all three coords loaded from the same
  // global DWORD at [GOT-0x6f408].
  const boundsDword = _g_pointBoundsVec; // [ebx-0x6f408], single DWORD reused for x/y/z
  const pointVec = { x: boundsDword, y: boundsDword, z: boundsDword };
  UTIL_SetSize(this.pev, pointVec, pointVec);

  // Zero out four CTSMapGlobals state fields (+0x0c through +0x18).
  this.field_0x0c = 0;
  this.field_0x10 = 0;
  this.field_0x14 = 0;
  this.field_0x18 = 0;

  // Schedule first think one second out:
  //   pev->field_0x104 = 1.0 + gpGlobals->time
  // — fld QWORD [ebx-0x6ecd0] loads the constant 1.0 (extended-precision),
  // fadd DWORD [eax] adds gpGlobals->time (at offset 0 of globalvars_t),
  // fstp DWORD [edx+0x104] stores back as float.
  this.pev.field_0x104 = 1.0 + gpGlobals.time;

  // Propagate spawnflags + weapon restriction into the global game-state struct.
  const gameState = _g_gameState; // [ebx+0x14f0] — large game-state singleton

  // Bit 5 of spawnflags INVERTED into gameState.field_0x10:
  //   ((spawnflags >> 5) & 1) ^ 1, then masked to 1 byte.
  gameState.field_0x10 = ((this.pev.spawnflags >> 5) & 1) ^ 1;

  // Bit 6 of spawnflags into gameState.field_0x5885.
  gameState.field_0x5885 = (this.pev.spawnflags >> 6) & 1;

  // Compute and apply weapon restriction: same value to two DWORDs,
  // then zero two flag bytes.
  const restriction = this.get_weapon_restriction();
  gameState.field_0x5870 = restriction;
  gameState.field_0x586c = restriction;
  gameState.field_0x5875 = 0;
  gameState.field_0x5874 = 0;
}
```
