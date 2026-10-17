```typescript
/**
 * CTSFlag::Spawn — initialise a CTF flag entity when spawned into the world.
 *
 * Calls the parent CTSPhysicObject::Spawn() and a multi-inheritance base
 * virtual, assigns the model via g_engfuncs.pfnSetModel, configures physics
 * fields and two EHANDLE-style ownership slots, and selects a per-team
 * origin-offset Vector3 stored into pev+0x150..0x158.
 *
 * @param this  The CTSFlag instance (C++ `this`)
 * @returns     void
 */
export function Spawn(this: CTSFlag): void {
  // (1) Parent spawn + multi-inheritance base virtual.
  CTSPhysicObject.prototype.Spawn.call(this);
  // TODO(asm-ambiguous): virtual at this+0x60 vtable slot 10 (offset 0x28).
  // Compiler emits this explicitly because CTSFlag inherits through multiple
  // base classes — likely a CBaseEntity-style Spawn via secondary vtable.
  callSecondaryVTable(this, 10);

  // (2) Engine model assignment: g_engfuncs.pfnSetModel(pev_field, model_name).
  // TODO(asm-ambiguous): pev+0x208 role (a stored edict pointer).
  // arg1 is a static string at ebx-0x6c1cf (model name template).
  g_engfuncs.pfnSetModel(this.pev[0x208], MODEL_NAME_CONST);

  // (3) pev scalar writes.
  // TODO: offset meaning unclear for pev+0x108..0x120.
  this.pev[0x108] = 10;
  this.pev[0x10c] = 2;
  this.pev[0x11c] = 0.7;   // 0x3f333333
  this.pev[0x120] = 0.8;   // 0x3f4ccccd

  // (4) Adjust pev[0] (likely classname) by an indirect global subtraction.
  // pev[0] = CONST_A - globals.field_at_0x98
  this.pev[0] = CONST_A - globals.field_at_0x98;

  // (5) UTIL_SetOrigin(pev, &pev->origin). pev->origin is at pev+0x8.
  UTIL_SetOrigin(this.pev, this.pev.origin);

  // (6) UTIL_SetSize with shared mins/maxs from a global Vector3.
  const sharedVec = ZERO_VECTOR_FROM_GLOBAL;
  UTIL_SetSize(this.pev, sharedVec, sharedVec);

  // (7) Initial physics float writes at this+0x88 / this+0x8c.
  this[0x88] = CVAR_FLOAT + globals.field_0;
  this[0x8c] = 0.0;

  // (8) Two EHANDLE-style members cleared to invalid (0xffff0000 pattern).
  this[0xc]  = 0xffff0000;
  this[0x10] = globals.field_at_0x1ed4;
  this[0x14] = 0xffff0000;
  this[0x18] = globals.field_at_0x1a74;

  // (9) pev->nextthink-style (offset 0x104): constant + globals.field_0.
  this.pev[0x104] = NEXT_THINK_DELTA + globals.field_0;

  // (10) pev->flags (offset 0x250) — clear then OR 2.
  this.pev[0x250] = 0;
  this.pev[0x250] |= 2;

  // (11) Misc pev scalars (offsets 0x14c, 0x15c).
  this.pev[0x14c] = 5.0;   // 0x40a00000
  this.pev[0x15c] = 19;    // 0x13

  // (12) Per-team origin-offset Vector3 at pev+0x150..0x158.
  switch (this[0x9c]) {
    case 0:
      this.pev[0x150] = 125.0;   // 0x42fa0000
      this.pev[0x154] = 101.0;   // 0x43250000
      this.pev[0x158] = 210.0;   // 0x43520000
      break;
    case 1:
      this.pev[0x150] = 200.0;   // 0x43480000
      this.pev[0x154] = 90.0;    // 0x42b40000
      this.pev[0x158] = 70.0;    // 0x428c0000
      break;
    case 2:
      this.pev[0x150] = 225.0;   // 0x43610000
      this.pev[0x154] = 205.0;   // 0x434d0000
      this.pev[0x158] = 45.0;    // 0x42340000
      break;
    default:
      this.pev[0x150] = 145.0;   // 0x43110000
      this.pev[0x154] = 215.0;   // 0x43570000
      this.pev[0x158] = 140.0;   // 0x430c0000
      break;
  }

  // (13) Final byte-flag init at this+0xac.
  this[0xac] = 0;
}
```
