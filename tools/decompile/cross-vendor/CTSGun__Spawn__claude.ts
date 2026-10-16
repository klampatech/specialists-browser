/**
 * CTSGun::Spawn — initialize a freshly-spawned CTSGun weapon entity.
 *
 * Pipeline (in order):
 *   1. Reset() — wipe transient state from any prior life.
 *   2. pev->classname = MAKE_STRING("weapon_tsgun") — static-literal
 *      string_t via in-line pointer subtraction against
 *      gpGlobals->pStringBase.
 *   3. this->Precache() — virtual call (vtable[10] in this binary's
 *      layout; vtable pointer is at this+0x60, NOT at offset 0 as
 *      in standard C++ ABI — verify against __vt_6CTSGun).
 *   4. g_engfuncs.pfnSetModel(pev, "models/w_glock18.mdl") — engine
 *      call via g_engfuncs[2].
 *   5. Initialize a handful of mode/state fields on the instance
 *      (most get re-touched by Deploy(); the writes here set sane
 *      defaults for weapons that exist on the ground before any
 *      deploy ever happens).
 *   6. CBasePlayerItem::FallInit() — start the standard "this item
 *      is falling to the ground" animation/state.
 *
 * Note on the model: every CTSGun-derived weapon initially gets the
 * Glock-18 world model assigned here. Subclasses that need a
 * different model override Spawn() and re-call SetModel.
 *
 * Generated from asm at 0x0007053c (164 B).
 */
export function Spawn(this: any /* TODO: CTSGun */): void {
  // PIC / GOT base established by the prologue.
  //   [ebx+0x1600] → gpGlobals (double-indirect: [GOT] → &gpGlobals → struct)
  //   [ebx+0x1aa8] → g_engfuncs (engine functions table)

  // String-table offsets resolved against .rodata (GOT-relative):
  //   [ebx-0x6dda6] = vaddr 0xF806A = "weapon_tsgun"        (classname)
  //   [ebx-0x6e287] = vaddr 0xF7B89 = "models/w_glock18.mdl" (model)

  // 1. Wipe transient state. Reset() zeros the bulk of the CTSGun
  //    instance (see CTSGun__Reset.ts for the exact ranges).
  this.Reset();

  // 2. Classname on the server entity. In-line MAKE_STRING: subtract
  //    gpGlobals->pStringBase from the static string literal's
  //    address to produce a string_t offset. The disassembly does
  //    NOT call ALLOC_STRING (which would be a runtime string-table
  //    registration); this is a compile-time-ish offset computation
  //    the compiler emitted inline.
  // TODO(asm-ambiguous): gpGlobals->pStringBase is at offset 0x98
  //   here, vs offset ~0x80 in stock HLSDK. Either TS's gpGlobals
  //   has extra fields, or this is a different field. Confirm against
  //   the TS engine header (the mod's `mp.dll` headers if shipped,
  //   else derive from the actual binary's struct layout).
  this["0x00"].classname = MAKE_STRING("weapon_tsgun");

  // 3. Precache() — virtual dispatch via the most-derived vtable.
  //    Disassembly: `mov eax, [esi+0x60]; call [eax+0x28]` with
  //    `this` pushed as the arg. vtable[10] in this binary's layout
  //    is Precache__6CTSGun.
  // TODO(asm-ambiguous): the vtable is at this+0x60 in this binary
  //   (NOT at offset 0 as in standard C++ ABI). Verify by reading
  //   __vt_6CTSGun+0x28 = 0x00103248 in the .so; the dword there
  //   should be 0x00070660 (Precache__6CTSGun). If not, [esi+0x60]
  //   is something other than a vtable (m_pPlayer or a TS dispatch
  //   table), and the call target needs re-deriving.
  this.Precache();

  // 4. Set the world model. g_engfuncs.pfnSetModel is g_engfuncs[2]
  //    (the 3rd entry; offset 0x8 = 0x8/4 = index 2). The arg pair
  //    (in push order: pev+0x208 first, model string second) maps
  //    to the cdecl right-to-left convention pfnSetModel(pev, szModel).
  //    The +0x208 deref reads through pev to whatever the engine
  //    uses as the internal edict ref for this entity (commonly
  //    pev->pvPrivateData or pev->pContainingEntity depending on
  //    engine version).
  g_engfuncs.pfnSetModel(this["0x00"], "models/w_glock18.mdl");

  // 5. Initialize mode/state fields on the instance. Most get
  //    re-touched by Deploy(); these writes set sane defaults so
  //    a weapon sitting on the ground (pre-deploy) reports sensible
  //    values.
  // TODO(asm-ambiguous): field names below are speculative — semantic
  //   names come from class reconstruction in D.4.
  this["0x88"]  = 0x10;  // transient state — possibly clip size (16 is a common default)
  this["0xb4"]  = 1;     // flag (dword)
  this["0xc4"]  = 1;     // flag (dword)
  this["0xc8"]  = 0;     // transient state — also zeroed by Reset()
                          //   (NOT a permanent weapon index; that
                          //   would survive Reset())
  this["0x9e4"] = 0;     // counter/state (near end of object)
  this["0x9e8"] = 0;     // counter/state (near end of object)

  // 6. Hand off to the standard "this thing is falling to the ground"
  //    initializer inherited from CBasePlayerItem. FallInit sets
  //    pev->movetype = 6 (MOVETYPE_TOSS), pev->solid = 2 (SOLID_BBOX),
  //    snaps origin, calls SetSize(pev, mins=0, maxs=0), sets render
  //    color, and schedules pev->nextthink = gpGlobals.time + delay.
  this.FallInit();
}

// Stubs — replace with actual definitions / imports from the engine
// bindings module and the reconstructed CTSGun class.
declare const g_engfuncs: {
  pfnSetModel: (pev: any, model: string) => void;
  // ...other engine funcs as needed.
};
declare function MAKE_STRING(str: string): number;