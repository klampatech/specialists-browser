/**
 * CTSGroundWeapon::WaitThink — re-arm pev->nextthink so the engine
 * fires the entity's current think again after a fixed interval.
 *
 * Equivalent C++:
 *     pev->nextthink = (float)((double)WAIT_INTERVAL + gpGlobals->time);
 *
 * The demangled symbol takes no explicit args, but the i386 disassembly
 * reads `[esp+0xc]` (the first stack-arg slot after `push ebx;
 * sub esp, 0x4`). In this binary the compiler is passing `this` on the
 * stack rather than in `ecx`; we expose it as a `this` parameter to
 * match modern TS-style method declarations.
 *
 * @param this  The CTSGroundWeapon entity instance.
 * @returns     void
 */

// Local stubs so this file compiles in isolation. Replace with the
// real declarations in D.5 once the engine↔mod interface is wired up.
type CTSGroundWeapon = any;
declare const gpGlobals: { time: number };

export function WaitThink(this: CTSGroundWeapon): void {
  // WAIT_INTERVAL lives at [GOT - 0x6f018] as a 64-bit double
  // constant in the data section. Without reading .rodata we can't
  // pin the exact value; common TS ground-weapon think intervals are
  // 0.1, 0.2, 0.5, or 1.0. TODO(asm-ambiguous): load from data
  // section or profile a running server.
  const WAIT_INTERVAL: number = 0.0;

  // C++: pev->nextthink = (float)(WAIT_INTERVAL + gpGlobals->time);
  this.pev.nextthink = gpGlobals.time + WAIT_INTERVAL;
}
