/**
 * CTSGun::Spawn — initialize a freshly-spawned CTSGun weapon entity.
 *
 * Pipeline (in order):
 *   1. Reset() — wipe transient state from any prior life.
 *   2. pev->classname = string-offset for "weapon_tsgun"
 *      (computed against the engine's pStringBase as
 *       `szClassname - pStringBase`, NOT via pfnAllocString;
 *       see engine/eiface.h `STRING()` macro for the reference).
 *      TODO(asm-ambiguous): pStringBase accessor at `[gpGlobals+0x98]`
 *        doesn't match stock HLSDK — confirm whether TS patches
 *        globalvars_t or uses a different helper.
 *   3. this->Precache() via the dispatch table at +0x60 (NOT the
 *      C++ vtable — `this` is passed on the stack, which rules out
 *      standard ECX-based virtual dispatch. Treat +0x60 as a manual
 *      dispatch pointer).
 *      TODO(disambiguation): verify which entry of the dispatch
 *        table `Precache` lives in. The current code assumes
 *        `[table+0x28]/4 = 10`, which should be confirmed against
 *        the constructor's `GetClassPtr` write.
 *   4. g_engfuncs.pfnSetModel(pev, "models/w_glock18.mdl")
 *   5. Initialize mode/state fields on the instance.
 *      All writes here set sane defaults for weapons that exist on
 *      the ground before any Deploy() ever happens; Deploy() will
 *      re-touch some of these.
 *      Offset hypotheses (verify in D.4):
 *        0x88  ← m_iClip (default 16, also zeroed by Reset)
 *        0xb4  ← m_bSomeFlag (byte, dword-zero-extended)
 *        0xc4  ← m_bSomeFlag (byte, dword-zero-extended)
 *        0xc8  ← m_iFireMode / m_iWeaponState (also written by Deploy)
 *        0x9e4 ← tail-end counter / sub-ammo bookkeeping
 *        0x9e8 ← tail-end counter / sub-ammo bookkeeping
 *   6. CBasePlayerItem::FallInit() — start the standard
 *      "this item is falling to the ground" animation/state.
 *
 * Generated from asm at 0x0007053c (164 B).
 */
export function Spawn(this: any /* TODO: CTSGun */): void {
  // 1. Wipe transient state from any prior life.
  this.Reset();

  // 2. Compute the string-table offset for the classname.
  //    In C: pev->classname = (string_t)(szClassname - pStringBase)
  //    Where pStringBase is fetched from globalvars_t (TS engine
  //    reportedly at +0x98; verify).
  this.pev.classname = MAKE_STRING_FROM_PTR("weapon_tsgun");

  // 3. Dispatch Precache via the table at [this+0x60], index 0x28/4.
  //    TODO: collapse to `this.Precache();` once CTSGun is reconstructed (D.4).
  const __dispatchTable = this[0x60] as { [k: number]: (self: any) => void };
  __dispatchTable[0x28 / 4](this);

  // 4. Set the world model via the engine's pfnSetModel.
  g_engfuncs.pfnSetModel(this.pev, "models/w_glock18.mdl");

  // 5. Mode/state defaults.
  this["0x88"]  = 0x10;   // ← m_iClip?
  this["0xb4"]  = 1;      // ← m_bSomeFlag?
  this["0xc4"]  = 1;      // ← m_bSomeFlag?
  this["0xc8"]  = 0;      // ← m_iFireMode / m_iWeaponState?
  this["0x9e4"] = 0;      // ← tail counter?
  this["0x9e8"] = 0;      // ← tail counter?

  // 6. Standard "falling to the ground" initializer.
  this.FallInit();
}

// STUBS — replaced by the engine-bindings module (g_engfuncs) and the
// reconstructed CTSGun class. Do NOT treat this declaration as
// authoritative for the runtime g_engfuncs shape.
declare const g_engfuncs: {
  pfnSetModel: (pev: any, model: string) => void;
  // ...other engine funcs added in D.5.
};

// TODO(asm-ambiguous): pStringBase accessor. The assembly reads
//  `pStringBase` from `[gpGlobals_double_derefed + 0x98]`. The TS engine
//  may expose it as `gpGlobals.pStringBase` directly, or it may require
//  a runtime helper. Wire this up to whatever the TS engine exposes.
declare function MAKE_STRING_FROM_PTR(sz: string): number;
