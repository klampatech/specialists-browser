// D.3 stub declarations so this file type-checks in isolation.
declare const CTSEmitter: any;
declare function CheckValues(this: any): void;
declare function UTIL_Remove(this: any): void;
// Globals via [ebx ± offset] in the PIC setup — names TBD by D.4.
declare const RO_DATA_AT_0x6EC6D: number;
declare const GLOBAL_AT_0x1600: any;       // ptr (loaded twice: → ESI, then EDX)
declare const GLOBAL_AT_0x12F0: number;
declare const DOUBLE_CONST_AT_0x6EAC8: number;
declare const ENGINE_FUNC_AT_0x1AA8_PLUS_0xF4: (...args: any[]) => void;
declare const EMITTER_ERROR_FORMAT_STRING: string;

/**
 * CTSEmitter::Spawn — initializes the Emitter marker and removes it.
 * The Emitter is a transient level-design marker (see HANDOFF.md D.3).
 */
export function Spawn(this: CTSEmitter): void {
  // PIC: GOT base = 0x165e10 (= 0x641e0 + 0x101c30).

  // 1. Per-instance vtable thunk patch.
  //    *this.field_0 (= pev[0] or a CTSEmitter-internal dispatch slot)
  //      ← rodata_addr − *( *(GLOBAL_AT_0x1600) + 0x98 )
  //    TODO(D.4): identify which struct member field_0 is, and which
  //    vtable/struct GLOBAL_AT_0x1600 points into.
  (this as any).field_0[0] =
    RO_DATA_AT_0x6EC6D - GLOBAL_AT_0x1600[0x98];   // byte-indexed, matches asm

  // 2. Validate keyvalues (TODO: confirm whether CheckValues reads `this`
  //    from ECX=this.field_0 or from the stack; disassembly is ambiguous).
  CheckValues(this);

  // 3. Default fields — likely CTSEmitter bookkeeping, NOT pev fields.
  //    field_0xc ← 0xFFFF0000  (a flag word? render-mode bits?)
  //    field_0x10 ← global pointer (a cached sprite/model handle?)
  (this as any).field_0xc = 0xffff0000;
  (this as any).field_0x10 = GLOBAL_AT_0x12F0;

  // 4. pev->nextthink = (double)const + (float)global — stored as float.
  //    field_0[0x104] is byte offset 0x104 from field_0 (likely pev->nextthink).
  (this as any).field_0[0x104] =
    DOUBLE_CONST_AT_0x6EAC8 + GLOBAL_AT_0x1600_VALUE;

  // 5. Cache pev->origin (12 bytes) into this.field_0x6c (CTSEmitter m_vecEmitOrigin?).
  //    field_0[2..4] is dword indices at byte offsets 8..20 (= pev->origin).
  //    Convention note: switch this to byte indexing if you also switch
  //    field_0[0x104] above — don't mix.
  const pev = (this as any).field_0;
  (this as any).field_0x6c[0] = pev[2];
  (this as any).field_0x6c[1] = pev[3];
  (this as any).field_0x6c[2] = pev[4];

  // 6. If a required field is unset (no model — field_0x64 == -1), warn + remove.
  if ((this as any).field_0x64 === -1) {
    ENGINE_FUNC_AT_0x1AA8_PLUS_0xF4(
      4,                        // at_warning
      EMITTER_ERROR_FORMAT_STRING,
      0x200 // varargs: TBD by D.4 (entity index? delay?)
    );
    UTIL_Remove(this);
  }

  // 7. Always remove — Emitter is a marker, not runtime state.
  //    (In the field_0x64 == -1 branch above, this is the SECOND  //    UTIL_Remove; in the normal branch, the only one. UTIL_Remove is
  //    idempotent — likely a code-gen artifact rather than intentional.)
  UTIL_Remove(this);
}
