/**
 * CTSDMHill::WaitThink — Schedules the next WaitThink tick.
 *
 * Computes:
 *   nextthink = max(this.m_flWaitFinished, floorConstant) + waitInterval
 *
 * Faithful to the disassembly at 0x00062280: load cvar value,
 * load m_flWaitFinished, conditionally clamp to the QWORD floor,
 * add the cvar, store to pev->nextthink.
 *
 * @param this  CTSDMHill instance (the sole argument; passed in
 *              [esp+0xc] after the `push ebx; sub esp, 0x4` prologue).
 */

// Stubs so the snippet compiles in isolation. Replace with real
// declarations once D.4 / D.5 wire up the cvar + entvars types.
declare const cvarDmHillWait: { value: number };
declare const floorConstant: number;

interface CTSDMHillEntvars {
  nextthink: number;
}
interface CTSDMHill {
  m_flWaitFinished: number;
  pev: CTSDMHillEntvars;
}

export function WaitThink(this: CTSDMHill): void {
  // [ebx+0x1600] → ptr → ptr → float: a two-level indirection into a
  // cvar. Plausibly (cvar_t*)*globalCache, then cvar->value. The TS
  // abstracts to a single `.value` read; the binary does two hops.
  // TODO: confirm cvar name via strings-n5.txt (ts_dmhill_wait?).
  const waitInterval: number = cvarDmHillWait.value;

  // [eax+0x78] = this->m_flWaitFinished (offset 0x78 in CTSDMHill).
  // TODO(asm-ambiguous): confirm field layout against the CTSDMHill class.
  const scheduledTime: number = this.m_flWaitFinished;

  // The QWORD floor at [ebx-0x6f010] is read as an 8-byte double —
  // unusual for a GoldSrc game-time constant. Identity TBD.
  // TODO(asm-ambiguous): identify this global.
  const baseTime: number = Math.max(scheduledTime, floorConstant);

  // [ecx+0x104] where ecx = *this (pev). Offset 0x104 in entvars_t is
  // nextthink — confirmed against HLSDK engine/eiface.h.
  this.pev.nextthink = baseTime + waitInterval;
}
