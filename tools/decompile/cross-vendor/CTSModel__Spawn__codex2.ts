// Demangled symbol: Spawn__8CTSModel  →  CTSModel::Spawn()
// HLSDK note: this is a TS gameplay method, not one of the 4 engine
// entry points (GiveFnptrsToDll, GetEntityAPI, GetEntityAPI2,
// GetNewDLLFunctions). HLSDK checklist items 2/3/4 do not apply.

// --- In-isolation stubs. Move to real .d.ts in D.4. ---
type CTSModel = any;
type entvars_t = any;
type enginefuncs_t = any;
declare function UTIL_SetSize(pev: entvars_t, mins: any, maxs: any): void;
declare function UTIL_SetOrigin(pev: entvars_t, origin: any): void;
declare function InitBoneControllers(self: CTSModel): void;
declare function ResetSequenceInfo(self: CTSModel): void;
// Globals (PIC-relocated in the .so; in TS they're module-level lets).
declare const g_engfuncs: enginefuncs_t;
// *(*engineGlobal + 0x98) — string-table base used by string_t resolution.
declare const g_gpGlobalsStringTableBase: number;

export function Spawn(this: CTSModel): void {
  const pev: entvars_t = this.pev;

  // 1. Embedded-interface method call at this->field_0x60.
  //    [edi+0x60] is a vtable; [vtable+0x28] is called with `this` as the arg.
  // TODO(asm-ambiguous): the vtable identity is unknown; D.4 should
  //   cross-reference the function-pointer table at offset 0x60 in
  //   CTSModel and identify which subsystem this dispatches into.
  this.iface60.vmethod_0x28(this);

  // 2. pev->classname via string_t subtraction.
  //    eax = (static_addr) - (*(*engineGlobal + 0x98))
  // TODO(asm-ambiguous): the static classname string address is
  //   hardcoded data in the .so; cannot be inferred from the disassembly.
  const classnameStaticAddr = 0; // placeholder
  pev.classname = classnameStaticAddr - g_gpGlobalsStringTableBase;

  // 3. Branch on pev->renderfx (offset 0xB8).
  //    disassembly: `cmp [edx+0xb8], 0; je minimal_path`
  if (pev.renderfx !== 0) {
    // --- Custom-model path ---
    // pfnPrecacheModel(string_table_base + pev->renderfx)
    // pfnSetModel(pev->field_0x208, string_table_base + pev->renderfx)
    //
    // Note: TS computes modelName once. The disassembly recomputes the
    // string-table expression twice (once before each call); the TS
    // hoists it to a local — equivalent and cleaner.
    const modelName: number = g_gpGlobalsStringTableBase + pev.renderfx;
    g_engfuncs.pfnPrecacheModel(modelName);
    g_engfuncs.pfnSetModel(pev.field_0x208, modelName);
  } else {
    // --- Default-model path: one engine call + early return ---
    // TODO(asm-ambiguous): gEngfuncs.vmethod_0x58 is unidentified; D.4
    //   should resolve it against the enginefuncs_t layout.
    // TODO(asm-ambiguous): pev->field_0x208 purpose is unknown — likely
    //   a model-name string_t but lives past standard entvars_t end.
    g_engfuncs.vmethod_0x58(pev.field_0x208);
    return;
  }

  // 4. UTIL_SetSize(pev, size_min, size_max) with size_min == size_max
  //    from a static vec3 in the .so (PIC GOT-relative).
  // TODO(asm-ambiguous): the static vec3 value cannot be inferred; likely
  //   a point-sized or zero bbox since CTSModel has no collision of its
  //   own.
  const sizeVec: any = /* static vec3 at GOT-0x6f408 */ null as any;
  UTIL_SetSize(pev, sizeVec, sizeVec);

  // 5. UTIL_SetOrigin(pev, &pev.origin).
  //    Re-asserts the origin to the engine — syncs the edict with the
  //    current pev origin (effectively a no-op for the field itself but
  //    ensures engine-side consistency).
  UTIL_SetOrigin(pev, (pev as any) + 0x08);

  // 6. CBaseAnimating init.
  InitBoneControllers(this);

  // 7. Per-field entvars writes (offsets preserved verbatim from disassembly).
  //    Most are TS-specific and not in standard HL entvars_t; D.4 should
  //    resolve each against CTSModel's actual layout.
  pev.field_0x10C = 3;
  pev.field_0x108 = 0;
  pev.field_0x16C = 0;
  pev.field_0x118 = 0;
  pev.field_0x160 = 1.0;
  pev.field_0xB0 = 5.0;            // plausibly pev->scale (HL1 entvars_t 0xB0)
  pev.field_0xAC = pev.field_0x54; // copy one field to another
  this.field_0x6C = 75.0;          // CTSModel-specific
  this.field_0x70 = 0;             // CTSModel-specific

  // 8. pev+0x104 += global float constant (loaded as double from GOT-0x6f018).
  //    pev+0x104 is `dmg_take` in HLSDK entvars_t; here it may be a TS-
  //    specific float field.
  // TODO(asm-ambiguous): resolve pev+0x104 against CTSModel layout in D.4.
  pev.field_0x104 += /* global float at GOT-0x6f018 */ 0;

  // 9. CBaseAnimating sequence reset.
  ResetSequenceInfo(this);
}
