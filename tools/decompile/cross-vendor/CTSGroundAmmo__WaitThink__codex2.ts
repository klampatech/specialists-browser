/**
 * CTSGroundAmmo::WaitThink — periodic "wait" think handler.
 *
 * Disasm summary (49 B at 0x00092e54):
 *   1. ebx := GOT_BASE (via call/pop/add pattern)
 *   2. edx := this->pev                 (pev is the first class field)
 *   3. eax := *[GOT_BASE + 0x1600]      (double-deref → cached cvar float)
 *   4. ST(0) := *(GOT_BASE - 0x6f018)   (loaded QWORD; used as float)
 *   5. ST(0) += *eax                    (engine_time + wait_delay)
 *   6. *(edx + 0x104) := ST(0)          (pev->nextthink in this layout)
 *
 * No branches. Single linear scheduling write.
 *
 * @param this  The CTSGroundAmmo entity instance (implicit in C++).
 * @returns     void
 */
export function WaitThink(this: any): void {
  // this->pev — GoldSrc convention: first class field is the engine's
  // entvars_t pointer. Disasm: `mov edx, [eax]` with eax = this.
  const pev: any = this.pev;

  // [ebx - 0x6f018] — engine time. QWORD-sized load in disasm; the C
  // value is a 32-bit float. Maps to engine.curtime in GoldSrc.
  // TODO(asm-ambiguous): confirm symbol; ENGINE.curtime is the
  // GoldSrc-side name but the exact TS-mod variable is unknown here.
  const engineTime: number = (globalThis as any).__engineTime ?? 0;

  // [ebx + 0x1600] — pointer to a cached cvar value, double-dereffed.
  // Pattern fits `cvar_t* -> value` (typical of Half-Life cvar glue).
  // TODO(asm-ambiguous): pin cvar name from strings-n5.txt cross-ref.
  const waitDelay: number = 0; // cvar double-deref placeholder

  // pev + 0x104 == pev->nextthink in this build's entvars_t layout.
  pev.nextthink = engineTime + waitDelay;
}
