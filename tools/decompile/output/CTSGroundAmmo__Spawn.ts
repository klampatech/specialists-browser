/**
 * CTSGroundAmmo::Spawn — initializes a ground ammo pickup entity.
 *
 * Disassembly-driven decompilation. Field identities and string
 * constants left as TODO placeholders; control flow and stores match
 * the assembly.
 *
 * @param this  The CTSGroundAmmo entity instance
 * @returns     void
 */
export function Spawn(this: any /* CTSGroundAmmo */): void {
  // ---- 1. Call base class Spawn via vtable (this+0x60, slot 0x28/4) ----
  // Disasm: mov eax, [esi+0x60]; push esi; call [eax+0x28].
  // This is a virtual call into a base-class Spawn.
  const vt = (this as any).vtable as
    | Record<number, (self: any) => unknown>
    | undefined;
  vt?.[0x28 / 4]?.call(this);

  // ---- 2. SET_MODEL / PRECACHE_MODEL pattern ----
  // Disasm: mov ecx, [esi]; mov edx, [ebx+0x1aa8];
  //        lea  eax, [ebx-0x6bcd4];          // <-- cstr in .rodata (unknown)
  //        push eax; push [ecx+0x208];       // <-- pev field at 0x208 (unknown)
  //        call [edx+0x8];                  // <-- vtable slot 2 of unknown obj
  // The callee identity, the first-arg semantics (pev+0x208), and the
  // string content are all unknown. Treat as TODOs.
  engineCall_via_got_slot(/* pev.field_0x208 */ this.pev.field_0x208, /* cstr @ data[-0x6bcd4] */ UNKNOWN_STRING_AT_DATA_MINUS_0x6BCD4);

  // ---- 3. Branch on FL_KILLME → write 5 or 6 to pev+0x108 ----
  // Disasm stores raw dword 0x5 / 0x6. If pev+0x108 were the float
  // pev->nextthink, those bits are denormal (~5e-45) — semantically
  // nonsense. Far more likely an int field with literal 5/6 values.
  // TODO(asm-ambiguous): identify pev+0x108.
  if ((this.pev.flags & 0x10 /* FL_KILLME */) !== 0) {
    this.pev.field_0x108 = 5;
  } else {
    this.pev.field_0x108 = 6;
  }

  // ---- 4. Write 2 to pev+0x10c ----
  // TODO(asm-ambiguous): identify pev+0x10c (NOT ltime — deprecated in
  // modern HLSDK).
  this.pev.field_0x10c = 2;

  // ---- 5. Re-apply origin (no-op for value; engine re-links edict) ----
  // Disasm passes &pev->origin by reference.
  UTIL_SetOrigin(this.pev, this.pev.origin);

  // ---- 6. Set bounding box ----
  // Disasm: lea ecx, [esp+0x20]; mov eax, [ebx-0x6f408];
  //        mov [esp+0x20..0x28], eax (three times);  // maxs
  //        lea edx, [esp+0x10]; mov [esp+0x10..0x18], eax (three times);  // mins
  //        sub esp,0x4; push ecx; push edx; push [esi]; call UTIL_SetSize.
  // The constant at GOT-0x6f408 is loaded into all six vector slots →
  // box is degenerate (mins == maxs). Constant value unknown.
  // TODO(asm-ambiguous): read data[-0x6f408].
  const size_const = 0 as number; // placeholder; the true constant lives in the binary
  const v = { x: size_const, y: size_const, z: size_const };
  UTIL_SetSize(this.pev, v, v);

  // ---- 7. CTSGroundAmmo member fields at this+0x0c / 0x10 / 0x14 / 0x18 ----
  // Disasm: mov ax,0; or eax,0xffff0000       → this->fld_0xc = 0xffff0000
  //        mov edx,[ebx+0x1730]; mov [esi+0x10], edx  → this->fld_0x10 = global
  //        mov [esi+0x14], 0                  → this->fld_0x14 = 0
  //        mov [esi+0x18], 0                  → this->fld_0x18 = 0
  this.field_0xc  = 0xffff0000;
  this.field_0x10 = GOT_VALUE_AT_PLUS_0x1730; // NOT zero — disasm stores a global
  this.field_0x14 = 0;
  this.field_0x18 = 0;

  // ---- 8. Store (data_double + gpGlobals->time) into pev+0x104 ----
  // Disasm: mov edx,[esi]; mov eax,[ebx+0x1600]; mov eax,[eax];  // eax = *ptr
  //        fld  QWORD [ebx-0x6ecd8];                             // st(0) = const_d
  //        fadd DWORD [eax];                                     // st(0) += *ptr
  //        fstp DWORD [edx+0x104];                               // pev->field_0x104
  // eax was [ebx+0x1600] dereffed — almost certainly gpGlobals+0
  // (= gpGlobals->time). The double constant is unknown; the TS rewrite
  // must NOT guess 0.1.
  // TODO(asm-ambiguous): read data[-0x6ecd8] (8-byte little-endian double).
  this.pev.field_0x104 = (gpGlobals as any).time + DATA_DOUBLE_AT_MINUS_0x6ECD8;

  // ---- 9. Clear pev+0x250, then set bit 0x02 ----
  // Disasm: mov eax,[esi]; mov [eax+0x250],0; mov eax,[esi]; or [eax+0x250],0x2.
  // Vanilla pev->effects is ~0xe4; offset 0x250 is deeper. Possibly an
  // extended field or a TS-injected block. Bit 0x02 is one of
  // EF_BRIGHTLIGHT / EF_DIMLIGHT / EF_NODRAW-ish but the exact mapping
  // depends on the field identity.
  // TODO(asm-ambiguous): identify pev+0x250 (effects-like vs. other).
  this.pev.field_0x250 = 0;
  this.pev.field_0x250 |= 0x2;

  // ---- 10. Clear byte at this+0x64 ----
  // TODO(asm-ambiguous): internal flag byte.
  this.byte_field_0x64 = 0;
}

// ---------------------------------------------------------------------------
// Ambient declarations so the file compiles in isolation under TS strict mode.
// In a real project these would come from engine/util.ts and friends.
// ---------------------------------------------------------------------------
declare function engineCall_via_got_slot(a1: any, a2: string): unknown;
declare function UTIL_SetOrigin(pev: any, origin: any): void;
declare function UTIL_SetSize(pev: any, mins: any, maxs: any): void;
declare const gpGlobals: any;
declare const GOT_VALUE_AT_PLUS_0x1730: number;
declare const DATA_DOUBLE_AT_MINUS_0x6ECD8: number;
declare const UNKNOWN_STRING_AT_DATA_MINUS_0x6BCD4: string;
