```typescript
/**
 * CTSWind::Spawn — initializes a CTSWind entity on world entry.
 *
 * Does three things, in order:
 *   1. pev->classname = MAKE_STRING(static "wind" string).
 *      Uses the engine's MAKE_STRING idiom: subtract gpGlobals->pStringBase
 *      from a static string address to produce a string-table offset.
 *   2. Initialize two class fields (likely think-state, see TODOs).
 *   3. Schedule the first think via pev->someFloatField (offset 0x104)
 *      = gpGlobals->time + smallDelay.
 *
 * No external function calls — BlowThink is queued, not invoked directly.
 *
 * @param this  The CTSWind entity instance.
 * @returns     void.
 */
export function Spawn(this: CTSWind): void {
  // 1. pev->classname = MAKE_STRING(static "wind" string).
  //    lea  eax, [GOT - 0x6ec62]        ; static string address
  //    sub  eax, [gpGlobals + 0x98]     ; subtract gpGlobals->pStringBase
  //    mov  [esi], eax                  ; esi = this->pev (offset 0)
  // TODO: confirm the static string is "wind" via
  //       tools/decompile/analysis/strings-n5.txt.
  this.pev.classname = STRING_OFFSET(staticWindString);

  // 2. Class field init.
  //    this+0xc  := 0xFFFF0000           (low 16 cleared, high 16 set)
  //    this+0x10 := [GOT + 0x1fb0]       (GOT-relative global)
  // TODO(asm-ambiguous): without a CTSWind / CBaseEntity layout, these
  // fields can't be named. The values suggest a flag/state constant plus
  // a pointer, likely related to think scheduling (e.g. m_pfnThink-style
  // function pointer and an associated state word).
  (this as unknown as Record<string, unknown>)["someField_0xc"] = 0xffff0000;
  (this as unknown as Record<string, unknown>)["someField_0x10"] = GOT_GLOBAL(0x1fb0);

  // 3. Schedule first think.
  //    fld  QWORD [GOT - 0x6eac8]       ; constant delay (8-byte float)
  //    fadd DWORD [eax]                 ; gpGlobals->time (offset 0 of gpGlobals)
  //    fstp DWORD [edx + 0x104]         ; edx = this->pev + 0x104
  // TODO(asm-ambiguous): pev+0x104 is some entvars_t float field — most
  // likely pev->nextthink in the TS server SDK build, but the exact
  // offset depends on the SDK build. The QWORD constant is the
  // inter-think delay (likely 0.1f — TODO: read the constant value).
  (this.pev as unknown as Record<string, unknown>)["someFloatField_0x104"] =
    gpGlobals.time + WIND_FIRST_THINK_DELAY;
}

// ---------------------------------------------------------------------------
// Compile-isolation stubs. Real definitions come from the engine SDK + D.4.
// ---------------------------------------------------------------------------
declare const gpGlobals: { time: number };
declare function GOT_GLOBAL(offset: number): unknown;
declare function STRING_OFFSET(s: string): number;
declare const staticWindString: string;
declare const WIND_FIRST_THINK_DELAY: number;
interface CTSWind { pev: Record<string, unknown>; [k: string]: unknown }
```
