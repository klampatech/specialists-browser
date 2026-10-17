/**
 * CTSKnife::Spawn — initialise a CTSKnife entity on level spawn.
 *
 * Sequence:
 *   1. Parent class spawn (CTSPhysicObject::Spawn).
 *   2. 3-way branch on this.field_0xa0 (cmp 8 / cmp 6 / default)
 *      that calls g_engfuncs.pfnSetModel with a per-case rodata
 *      model name and writes per-case pev.friction.
 *   3. Common pev fields (0x120, 0x108, 0x10c) after the branch.
 *   4. UTIL_SetSize(pev, cube, cube) — uniform cube bbox,
 *      halfExtent loaded from [.rodata] via PIC.
 *   5. Four packed ints on the entity at offsets 0xc/0x10 and
 *      0x14/0x18 (raw values 0x460000, 0x60, 0x490000, 0x60).
 *   6. Schedule first think: pev.field_0x104 = gpGlobals.time,
 *      entity.field_0x88 = gpGlobals.time + NEXT_THINK_DELAY,
 *      entity.field_0x90 = 1, entity.field_0x91 = 0,
 *      pev.field_0x254 = 1.0.
 *   7. pev.field_0x250 = 0; |= 1   (pev flag clearing then bit set).
 *
 * @param this  The CTSKnife instance (via stack-offset 0x40 in the
 *              cdecl-thiscall ABI; collapsed to a `this` param).
 */
export function Spawn(this: any /* CTSKnife */): void {
  // TODO(asm-ambiguous): identify what `this.field_0xa0` represents
  // (entity type? spawn variant?).
  // TODO(asm-ambiguous): resolve MODEL_*_KNIFE strings against
  //   strings-n5.txt / .rodata at PIC offsets
  //   [ebx-0x6dff3] (8), [ebx-0x6ea80] (6), [ebx-0x6dfdf] (default).
  const MODEL_THROW_KNIFE: string = "";
  const MODEL_REGULAR_KNIFE: string = "";
  const MODEL_DEFAULT_KNIFE: string = "";

  // 1. Parent class spawn.
  this.CTSPhysicObject_Spawn();

  // 2. Branch on this.field_0xa0 — same body shape across arms:
  //    SET_MODEL(pev->0x208, model_name) ; pev->0x11c = friction.
  //    float literals verified against IEEE-754 hex:
  //      0x3f59999a = 0.85 ; 0x3f400000 = 0.75 ;
  //      0x3e99999a = 0.3  ; 0x11c = entvars_t friction offset.
  switch (this.field_0xa0) {
    case 8:
      g_engfuncs.pfnSetModel(this.pev.field_0x208, MODEL_THROW_KNIFE);
      this.pev.friction = 0.85;
      break;
    case 6:
      g_engfuncs.pfnSetModel(this.pev.field_0x208, MODEL_REGULAR_KNIFE);
      this.pev.friction = 0.75;
      break;
    default:
      g_engfuncs.pfnSetModel(this.pev.field_0x208, MODEL_DEFAULT_KNIFE);
      this.pev.friction = 0.3;
      break;
  }

  // 3. Common pev fields after the branch.
  // TODO(asm-ambiguous): resolve pev 0x120 / 0x108 / 0x10c against
  //   engine/eiface.h entvars_t layout.
  this.pev.field_0x120 = 0.8;     // 0x3f4ccccd
  this.pev.field_0x108 = 10;
  this.pev.field_0x10c = 2;

  // 4. Bounding box: mins == maxs == halfExtent (cube).
  // TODO(asm-ambiguous): BOUNDING_HALF_EXTENT loaded from [.rodata]
  //   via [ebx-0x6f408] PIC.
  const BOUNDING_HALF_EXTENT = 0;
  const halfExtent = BOUNDING_HALF_EXTENT;
  const cube: Vector3 = { x: halfExtent, y: halfExtent, z: halfExtent };
  UTIL_SetSize(this.pev, cube, cube);

  // 5. Packed fields at entity offsets 0xc / 0x10 / 0x14 / 0x18.
  // TODO(asm-ambiguous): identify against CBaseEntity / CBaseAnimating.
  //   Low 16 bits are 0 — could be shorts packed into ints, or
  //   simply (high16 = entity_id, low16 = sub_id); disassembly alone
  //   doesn't tell us.
  this.field_0x0c = 0x460000;
  this.field_0x10 = 0x60;
  this.field_0x14 = 0x490000;
  this.field_0x18 = 0x60;

  // 6. Schedule first think + initial state.
  // asm: pev.field_0x104 = gpGlobals->time (via 2-level deref
  //   of the gpGlobals pointer-of-pointer at [ebx+0x1600]).
  // TODO(asm-ambiguous): confirm pev offsets 0x104 / 0x254 against
  //   entvars_t (0x104 is suspiciously high for HL1 pev).
  // TODO(asm-ambiguous): confirm entity offsets 0x88 / 0x90 / 0x91
  //   against CTSPhysicObject / CBaseEntity (e.g., next-think,
  //   bounce-flag, hide-flag).
  // asm: NEXT_THINK_DELAY is a 64-bit .rodata constant
  //   ([ebx-0x6ecc8], fld QWORD) added to a 32-bit float; result
  //   is stored as float.
  this.pev.field_0x104 = gpGlobals.time;            // asm: gpGlobals->time
  this.pev.field_0x254 = 1.0;                        // 0x3f800000
  this.field_0x88 = gpGlobals.time + NEXT_THINK_DELAY;
  this.field_0x90 = 1;                              // byte flag
  this.field_0x91 = 0;                              // byte flag

  // 7. pev flag field: clear, then OR in bit 0.
  this.pev.field_0x250 = 0;
  this.pev.field_0x250 |= 1;
}
