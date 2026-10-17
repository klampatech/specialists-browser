/**
 * CTSObjectiveManager::Spawn — initialize a CTSObjectiveManager on spawn:
 *   1. Register the static classname via the engine string table.
 *   2. Set pev->effects = 0x80.
 *   3. Zero three pev fields (offsets 0x10c, 0x1a4, 0x108).
 *   4. Zero four CTSObjectiveManager member fields (offsets 0x0c, 0x10, 0x14, 0x18).
 *   5. Schedule the first think = static_delay + gpGlobals->time.
 *
 * Compiled from the i386 disassembly at 0x0007b7bc (147 bytes).
 *
 * @param this  The CTSObjectiveManager entity instance (this in the original C++).
 * @returns     void
 */
export function Spawn(this: any): void {
  // Standard HL1 PIC/GOT prologue: `call $+5; pop ebx; add ebx, <GOT>`
  // computes the global offset table base. After this, [ebx ± k] accesses
  // globals and static data:
  //   [ebx - 0x6e694]  static classname string in .data
  //   [ebx + 0x1600]   engine pointer-to-pointer (gpGlobals on deref)
  //   [ebx - 0x6ecd0]  QWORD nextthink-delay constant
  const GOT_BASE = 0; // symbolic anchor; the real base is runtime-computed.

  const pev = this.pev; // first CBaseEntity member (entvars_t*)

  // 1) pev->classname = engine string-table index for the static classname.
  //
  //    asm (0x7b7d2–0x7b7e8):
  //      esi = this->pev
  //      edi = [GOT + 0x1600]                 // engine pointer-to-pointer
  //      ecx = *edi                            // engine object
  //      eax = GOT - 0x6e694                  // static classname string addr
  //      eax -= [ecx + 0x98]                  // subtract engine string-table base
  //      [esi] = eax                           // store index
  //
  // TODO(runtime-binding): the engine string-table base and the static
  // classname string address are runtime values; bind them via the engine
  // API when D.5 wires up the engine↔mod boundary. The COMPUTATION shape
  // below is correct per the asm.
  const engine_ptr       = GOT_BASE + 0x1600;
  const static_classname = GOT_BASE - 0x6e694;
  const engine_obj       = (engine_ptr as unknown) as any;
  pev[0x00] = (static_classname as any) - engine_obj[0x98];

  // 2) Set pev->effects = 0x80 (offset 0x118 in HL1 entvars_t).
  pev[0x118] = 0x80;

  // 3) Zero three pev fields.
  // TODO(D.4-entvars): field purposes at 0x108 / 0x10c / 0x1a4 are unclear
  // without a confirmed entvars_t map for the TS build.
  pev[0x10c] = 0;
  pev[0x1a4] = 0;
  pev[0x108] = 0;

  // 4) Zero four CTSObjectiveManager member fields (offsets into `this`,
  //    not into pev — the writes here use `edx` directly, not `[edx]+k`).
  // TODO(D.4-class-layout): fields at 0x0c / 0x10 / 0x14 / 0x18 are
  // objective-manager state of unknown purpose without the D.4 class
  // layout (likely a small aggregate describing the current objective —
  // index, team, flags).
  this[0x0c] = 0;
  this[0x10] = 0;
  this[0x14] = 0;
  this[0x18] = 0;

  // 5) Schedule first think:
  //    asm (0x7b836–0x7b842):
  //      edx = this->pev                       ; reload
  //      eax = *engine_ptr                     ; gpGlobals
  //      fld  QWORD PTR [GOT - 0x6ecd0]        ; static_delay (double)
  //      fadd DWORD PTR [eax]                  ; + gpGlobals->time (single)
  //      fstp DWORD PTR [edx + 0x104]          ; pev->nextthink
  //
  // TODO(runtime-binding): static_delay is a QWORD at [GOT - 0x6ecd0] —
  // likely a small positive value (~0.1s) for a think interval; bind it
  // at runtime. The COMPUTATION shape below is correct per the asm.
  const static_delay_qw = GOT_BASE - 0x6ecd0;
  const gpGlobals       = (engine_obj[0] as unknown) as { time: number };
  pev[0x104] = (static_delay_qw as any) + gpGlobals.time;
}
