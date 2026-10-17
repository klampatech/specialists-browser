// --- stubs so this compiles in isolation ----------------------------
declare const g_pEngine: any;

// CTSScoreGiver is a TS-specific entity. Fields at offsets 0x0c,
// 0x10, 0x14, 0x18 are score-related counters; D.4 will name them.
interface CTSScoreGiver {
  pev: any;
  // TODO(D.4): name class fields at offsets 0x0c / 0x10 / 0x14 / 0x18.
  // Likely m_iKills / m_iDeaths / m_iAssists / m_iScore.
  [offset: number]: any;
}
// -------------------------------------------------------------------

/**
 * CTSScoreGiver::Spawn — initialize a CTSScoreGiver entity:
 * set classname, zero its score-tracking fields, set an initial
 * pev field as constant + engine_value, then dispatch to the
 * parent class's Spawn via vtable.
 */
export function Spawn(this: CTSScoreGiver): void {
  // PIC base setup (call $+5; pop ebx; add GOT_OFFSET) is elided —
  // the runtime resolves globals directly.

  const pev: any = this.pev;

  // -----------------------------------------------------------------
  // pev->classname = "score_giver"
  // asm: lea eax, [ebx-0x6ce3d]        ; static string addr
  //      sub  eax, [ecx+0x98]           ; - engine string-table base
  //      mov  [esi], eax                ; store offset to pev[0]
  // The asm builds a string-table-relative offset (GoldSrc stores
  // strings as offsets into a global table). In TS we keep the
  // string literal; the runtime is responsible for interning it.
  // -----------------------------------------------------------------
  // TODO(D.4): confirm "score_giver" by checking the static at
  //   [GOT - 0x6ce3d] in tools/decompile/analysis/strings-n5.txt.
  pev.classname = "score_giver";

  // -----------------------------------------------------------------
  // pev[0x118] = 0x80
  // asm: mov DWORD [eax+0x118], 0x80
  // -----------------------------------------------------------------
  // TODO(D.4): 0x80 at pev offset 0x118. Could be a FL_* flag bit
  // (FL_PREDATOR = 0x80), an EF_* effect bit, or a TS-specific
  // extension. Not a standard HLSDK entvars_t field at this  // offset in vanilla builds.
  pev[0x118] = 0x80;

  // -----------------------------------------------------------------
  // Zero three pev fields.
  // asm: mov DWORD [eax+0x10c], 0
  //      mov DWORD [eax+0x1a4], 0
  //      mov DWORD [eax+0x108], 0
  // -----------------------------------------------------------------
  // TODO(D.4): identify pev fields at offsets 0x10c, 0x1a4, 0x108.
  pev[0x10c] = 0;
  pev[0x1a4] = 0;
  pev[0x108] = 0;

  // -----------------------------------------------------------------
  // Zero four CTSScoreGiver instance fields.
  // asm: mov DWORD [edx+0x14], 0
  //      mov DWORD [edx+0x18], 0
  //      mov DWORD [edx+0xc],  0
  //      mov DWORD [edx+0x10], 0
  // -----------------------------------------------------------------
  // TODO(D.4): name class fields at offsets 0x0c / 0x10 / 0x14 / 0x18.
  this[0x0c] = 0;
  this[0x10] = 0;
  this[0x14] = 0;
  this[0x18] = 0;

  // -----------------------------------------------------------------
  // pev[0x104] = global_constant + engine_field_0
  // asm: fld   QWORD [ebx-0x6ecd0]    ; load 8-byte float constant
  //      fadd  DWORD  [eax]           ; add engine struct's first field
  //      fstp  DWORD  [ecx+0x104]     ; store to pev+0x104
  //
  // edi = [ebx + 0x1600] is the engine global (likely engine  // singleton or cvar registry).
  // -----------------------------------------------------------------
  // TODO(D.4): identify the 8-byte constant at [GOT - 0x6ecd0] and
  // the engine field at [edi+0]. pev[0x104] is likely pev->dmg_take
  // / pev->dmg_save or a TS-specific state field (e.g.,
  // m_flNextScoreGive).
  const engineGlobal: any = g_pEngine;          // [ebx + 0x1600]
  const baseConstant: number = 0;                // TODO: [GOT - 0x6ecd0]
  const engineField0: number = engineGlobal[0];  // [edi + 0]
  pev[0x104] = baseConstant + engineField0;

  // -----------------------------------------------------------------
  // Dispatch to parent class Spawn via vtable.
  // asm: mov  eax, [edx+0x60]   ; vtable pointer at this+0x60
  //      push edx               ; this (cdecl thiscall)
  //      call [eax+0x3c]        ; vtable[0x3c/4] = parent::Spawn
  // -----------------------------------------------------------------
  // The vtable pointer sits at class offset 0x60 (TS uses a
  // non-standard vtable layout — vanilla C++ puts it at offset 0).
  // 0x3c is a byte offset; the function-pointer index is 0x3c / 4 = 15.
  const vtable: any = this[0x60];
  vtable[0x3c / 4].call(this);
}
