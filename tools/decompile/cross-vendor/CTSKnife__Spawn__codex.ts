```typescript
/**
 * CTSKnife::Spawn — initialize a CTSKnife entity on level spawn.
 *
 * Calls the parent CTSPhysicObject::Spawn, picks a model + friction
 * based on the knife's movement-type-like field (8 = throwing, 6 =
 * regular, else fallback), sets a uniform-cube bounding box,
 * initializes several pev and CTSKnife gameplay fields, schedules
 * the first think, and resets pev flags to FL_ONGROUND.
 *
 * @param this  The CTSKnife entity instance.
 * @returns     void
 */
// TODO: CTSKnife class not yet defined; using `any` until D.4 lays out the class.
export function Spawn(this: any /* CTSKnife */): void {
  // 1. Parent class spawn (CTSPhysicObject::Spawn).
  this.CTSPhysicObject_Spawn();

  // 2. Branch on the knife's movement-type-like field to pick model + friction.
  switch (this.field_0xa0) {
    case 8:
      // Throwing knife — heavier friction for throw arc.
      SET_MODEL(this.pev.pContainingEntity, MODEL_THROW_KNIFE);
      this.pev.friction = 0.85;
      break;
    case 6:
      // Regular knife.
      SET_MODEL(this.pev.pContainingEntity, MODEL_REGULAR_KNIFE);
      this.pev.friction = 0.75;
      break;
    default:
      // Fallback (lowest friction).
      SET_MODEL(this.pev.pContainingEntity, MODEL_DEFAULT_KNIFE);
      this.pev.friction = 0.3;
      break;
  }

  // 3. Common pev fields set after the model choice.
  // TODO(asm-ambiguous): exact pev field names at these offsets are unknown.
  this.pev.field_0x120 = 0.8;
  this.pev.field_0x108 = 10;
  this.pev.field_0x10c = 2;

  // 4. Bounding box: uniform cube (mins == maxs).
  // The half-extent is a constant loaded from .rodata via PIC.
  // TODO(asm-ambiguous): exact value of BOUNDING_HALF_EXTENT.
  const halfExtent = BOUNDING_HALF_EXTENT;
  const box = { x: halfExtent, y: halfExtent, z: halfExtent };
  UTIL_SetSize(this.pev, box, box);

  // 5. Packed fields on the entity. High 16 bits look like a model
  // index, low 16 bits look like a body number — likely two model
  // configurations for the knife.
  this.field_0x0c = 0x460000;
  this.field_0x10 = 0x60;
  this.field_0x14 = 0x490000;
  this.field_0x18 = 0x60;

  // 6. Schedule the first think + set initial gravity.
  // The gpGlobals access chain is 3 levels of indirection; we
  // collapse it to a direct read of gpGlobals.time here.
  // TODO(asm-ambiguous): verify the gpGlobals indirection pattern.
  this.pev.field_0x104 = gpGlobals.time;                  // nextthink-ish
  this.pev.field_0x254 = 1.0;                             // gravity
  this.field_0x88 = gpGlobals.time + NEXT_THINK_DELAY;    // m_fNextThink
  this.field_0x90 = 1;                                    // byte flag
  this.field_0x91 = 0;                                    // byte flag

  // 7. Reset pev flags, then set FL_ONGROUND.
  this.pev.field_0x250 = 0;
  this.pev.field_0x250 |= 1;
}
```
