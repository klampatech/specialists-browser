```typescript
// Stubs — replaced when the engine layer lands (D.4).
declare function MAKE_STRING(s: string): number;
declare function STRING(t: number): string;
declare function UTIL_SetOrigin(pev: any, origin: any): void;
declare const g_engfuncs: any;
declare const SOME_STATIC_GLOBAL: any;
declare const FIRST_THINK_DELAY: number;

/**
 * CTSBomb::Spawn — initialize a freshly-created CTSBomb entity.
 *
 * Invoked by the engine right after the entity factory creates this
 * instance. Sets the classname, installs the model, syncs origin,
 * initializes health/state, schedules the first think, and zeroes
 * out all wire state.
 *
 * @param this  The CTSBomb entity instance (this in original C++).
 * @returns     void
 */
export function Spawn(this: any): void {
  const pev: any = this.pev;

  // (1) Tag the entity so save/restore and scripting can identify it.
  // TODO(asm-ambiguous): confirm exact classname string at
  // [GOT-base - 0x6ce0c] — likely "ts_bomb" or "CTSBomb".
  pev.classname = MAKE_STRING("CTSBomb");

  // (2) Install the model via the engine function table. The compiler
  //     routed this through [GOT+0x1aa8]+0x8 with two args:
  //     pev.[0x208] and STRING(pev.model).
  // TODO(asm-ambiguous): pev+0x208 is most likely pev->pContainingEnt
  // (the edict wrapped by this entvar), making the call
  // g_engfuncs.pfnSetModel(edict, model). Confirm against the HL SDK
  // entvars_t offset map.
  g_engfuncs.pfnSetModel(pev[0x208], STRING(pev.model));

  // (3) Sync the server-side entity position to the pev origin.
  UTIL_SetOrigin(pev, pev.origin);

  // (4) Initial combat state. 128 is a typical bomb HP for TS.
  pev.health = 128;             // 0x80
  pev.takedamage = 0;           // DAMAGE_NO
  // TODO: which pev fields are at 0x108 / 0x1a4 — possibly animtime
  // and a sound-precache slot.
  pev[0x108] = 0;
  pev[0x1a4] = 0;

  // (5) CTSBomb-specific runtime state. The bomb has 4 wires (see
  //     SetRandomWires / CutWire / WaitThink in the class table).
  // TODO(asm-ambiguous): field names below are inferred from class
  // context, not from a confirmed HL SDK offset map.
  this[0x64] = 0;               // byte  — likely m_bArmed
  this[0x14] = 0;               // dword — likely m_iState
  this[0x18] = 0;               // dword — likely m_iBombType

  // (6) State flags word + a pointer to a static (probably a class
  //     vtable, a linked-list node for objective tracking, or the
  //     next bomb in a chain).
  this[0xc] = 0xffff0000;       // dword — state flags (initial value)
  this[0x10] = SOME_STATIC_GLOBAL;

  // (7) Schedule the first think.
  // TODO(asm-ambiguous): pev+0x100 / pev+0x104 are most likely
  // pev->ltime / pev->nextthink. The double constant loaded from
  // [GOT-base - 0x6f018] is the "first think" delay.
  pev[0x104] = pev[0x100] + FIRST_THINK_DELAY;

  // (8) Zero out all four wires: 4 dwords at this+0x6c..this+0x78
  //     (probably cut times) and 4 bytes at this+0x7c..this+0x7f
  //     (probably wire color IDs / cut flags).
  this[0x6c] = 0;
  this[0x70] = 0;
  this[0x74] = 0;
  this[0x78] = 0;
  this[0x7c] = 0;
  this[0x7d] = 0;
  this[0x7e] = 0;
  this[0x7f] = 0;
}
```
