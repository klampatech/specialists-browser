// Sibling declarations so this file compiles in isolation.
// (D.4 will define CTSTrigger properly; these are minimal stubs.)
type CTSTrigger = {
  pev: { nextthink: number };
  m_flWait: number;
};
declare const gpGlobals: { time: number };
// TODO(asm-ambiguous): confirm MIN_WAIT identity and value — it's// the QWORD at [ebx-0x6f010] in .rodata (ebx = 0x165e10 →
// absolute address 0x0F6E00). HL1 CBaseToggle logic commonly uses
// ~0.1s for this clamp.
declare const MIN_WAIT: number;

/**
 * CTSTrigger::WaitThink — Reschedules the next think by writing
 * pev->nextthink = gpGlobals->time + max(m_flWait, MIN_WAIT).
 * The wait interval is clamped to a static minimum to prevent
 * degenerate sub-tick waits.
 */
export function WaitThink(this: CTSTrigger): void {
  const curTime = gpGlobals.time;
  const wait = this.m_flWait;
  const clampedWait = wait >= MIN_WAIT ? wait : MIN_WAIT;
  this.pev.nextthink = curTime + clampedWait;
}
