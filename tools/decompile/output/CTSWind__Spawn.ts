/**
 * CTSWind::Spawn — initialize a CTSWind entity on world entry.
 *
 *   1. pev->classname  = MAKE_STRING(static "wind" string)
 *   2. this+0xc        = 0xFFFF0000                  (TODO D.4: name)
 *      this+0x10       = [GOT + 0x1fb0]             (TODO D.4: name)
 *   3. pev+0x104       = gpGlobals->time + delay    (TODO D.4: nextthink?)
 *
 * No call to BlowThink — it's queued via the nextthink path.
 */
export function Spawn(this: CTSWind): void {
  // 1. asm: eax = static_str - gpGlobals->pStringBase; [esi] = eax
  this.pev.classname = STRING_OFFSET(staticWindString);

  // 2. asm: [ecx+0xc] = 0xFFFF0000;   [ecx+0x10] = GOT[0x1fb0]
  // TODO(D.4): name from CTSWind layout (likely think-state + fn ptr).
  this.someField_0xc  = 0xffff0000;
  this.someField_0x10 = GOT_GLOBAL(0x1fb0);

  // 3. asm: fld const; fadd gpGlobals.time; fstp pev+0x104
  // TODO(D.4): verify 0x104 is pev->nextthink in the TS-SDK entvars_t.
  this.pev.someFloatField_0x104 = gpGlobals.time + WIND_FIRST_THINK_DELAY;
}

// ---- compile-isolation stubs (real defs from D.4 + engine SDK) ----
declare const gpGlobals: { time: number };
declare function GOT_GLOBAL(offset: number): unknown;
declare function STRING_OFFSET(s: string): number;
declare const staticWindString: string;
declare const WIND_FIRST_THINK_DELAY: number;

interface CTSWind {
  pev: Record<string, unknown>;
  someField_0xc: number;
  someField_0x10: unknown;
  [k: string]: unknown;
}
