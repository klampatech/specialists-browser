/**
 * CTSTeamEscape::WaitThink — periodic think during the team-escape
 * "wait" phase. Re-arms the next-think timer and clears the per-cycle
 * state buffer so the next cycle starts fresh.
 *
 * Disassembly: 77 bytes at 0x0007d6b0; no conditional branches.
 *
 * @param this  The CTSTeamEscape entity instance (`this` in C++).
 * @returns     void
 */
export function WaitThink(this: CTSTeamEscape): void {
  // ---- Arm next-think timer --------------------------------------
  //   pev->nextthink (offset 0x104 in entvars_t)
  //     = gpGlobals->time + INTERVAL
  //
  // gpGlobals is reached via [ebx + 0x1600] (PIC/GOT) and the
  // two-step deref `mov eax,[ebx+0x1600]; mov eax,[eax]` reads its
  // first field — a float — unambiguously. Cvars don't have this
  // shape (no two-step deref + fadd), so this is gpGlobals, not a
  // cvar.
  //
  // INTERVAL is loaded as a 64-bit float constant via
  // `fld QWORD PTR [ebx - 0x6f018]`. The QWORD shape + read via FPU
  // (not a pointer deref) proves it's a constant in the data
  // section, not another global.
  //
  // TODO(asm-ambiguous): confirm exact WAIT_THINK_INTERVAL value
  //                    (1.0? 0.1? — not visible in this chunk).
  this.pev.nextthink = gpGlobals.time + WAIT_THINK_INTERVAL;

  // ---- Reset per-cycle wait-state region -------------------------
  // `lea edi, [edx+0x6c]; mov ecx, 0x21; rep stos DWORD`
  // zeros 33 dwords at offsets 0x6c, 0x70, 0x74, ..., 0xec (last
  // written offset is 0xec; rep stos advances past it, so 0xf0 is
  // untouched by this path).
  //
  // `mov DWORD PTR [edx+0xf0], 0x0` then zeros the trailing dword
  // at this+0xf0 explicitly.
  //
  // Zeroed dword offsets: 0x6c..0xf0 inclusive (34 dwords, 136
  // bytes). 0xf4 is NOT zeroed by this function.
  //
  // TODO(asm-ambiguous): field layout at offsets 0x6c..0xf0 is not
  //                    yet documented; inferred to be a per-team
  //                    objective/counter table that resets each
  //                    wait cycle.
  memset32(this, 0x6c, 0x21);
  this.field_0xf0 = 0;
}

// ---- Stand-ins (replaced once the engine bindings exist) ----
type CTSTeamEscape = any;
declare const gpGlobals: { time: number };
declare const WAIT_THINK_INTERVAL: number;
declare function memset32(
  target: any,
  byteOffset: number,
  dwordCount: number,
): void;
