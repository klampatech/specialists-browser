/**
 * CTSWorldGun::CreateWeapon — factory for a CTSWorldGun entity.
 *
 * Allocates a fresh worldgun, fills in its classname/weaponId/56-byte
 * weapon-definition block, runs its virtual init, and (when given an
 * anchor worldgun) wires ownership and a think-schedule derived from
 * the anchor. Special-cases weapon id 29 with five pev overrides.
 *
 * Demangled symbol: `CTSWorldGun::CreateWeapon(p ?, ?)` — the
 * "??" is `CBasePlayer*` + `tsweapon_t` + `s_weapon_status*` per the
 * mangled suffix `P11CBasePlayer10tsweapon_tP15s_weapon_status`. The
 * disassembly actively reads 3 args (the [esp+0x2c] read at 908cb
 * is arg1 re-loaded after stack shifts, not a 4th arg). Treat the
 * "pExisting" interpretation here as a working hypothesis pending
 * cross-reference with the rest of CTSWorldGun's call sites.
 *
 * @param arg1  Per the demangler, CBasePlayer*; per the disassembly's
 *              null branch +0x208/0x180/0x60 reads, plausibly a
 *              CTSWorldGun* anchor. Inherits owner when non-null.
 * @param weaponId tsweapon_t — stored at +0x88; compared to 29 for
 *              the special-case override.
 * @param pStatus  s_weapon_status* — 56-byte weapon-definition
 *              block, block-copied into +0x8c..+0xc4.
 * @returns        The new CTSWorldGun, or null on allocation failure.
 */
export function CreateWeapon(
  arg1: any | null,                  // CBasePlayer* per demangler; TODO: confirm vs CTSWorldGun*
  weaponId: tsweapon_t,
  pStatus: any,                      // s_weapon_status* — passed by pointer, not by value
): CTSWorldGun | null {
  // 1. Allocate the new entity. GetClassPtr<CTSWorldGun>(NULL) is HL's
  //    templated factory: passing NULL forces a fresh edict slot.
  const newEnt: CTSWorldGun = (GetClassPtr as any)<CTSWorldGun>(null);

  if (newEnt == null) {
    // Severity 3 = HUD_PRINTNOTIFY. 5 args: severity + 4 NULLs.
    // The localized error string at PIC-relative GOT-0x6b7d0 is not
    // in this chunk.
    UTIL_ClientPrintAll(3 /* HUD_PRINTNOTIFY */, /* ebx-0x6b7d0 */ 0, 0, 0, 0);
    return null;
  }

  // 2. pev->classname = MAKE_STRING(<classname literal>) = literal - gpGlobals->pStringBase.
  //    [GOT+0x1600] is a pointer-to-gpGlobals; *([GOT+0x1600]) is gpGlobals;
  //    pStringBase is at offset 0x98 in gpGlobals.
  // TODO(asm-ambiguous): literal text not in this chunk; likely
  // "weapon_worldgun" or similar.
  newEnt.pev.classname =
    ((GOT_LITERAL_AT_0x6b6c5 as any) - (GOT_FTABLE_0x1600_0x98 as any)) as any;

  // 3. newEnt->m_iWeaponId at +0x88 (dword).
  newEnt.m_iWeaponId = weaponId;

  // 4. memcpy 56 bytes (14 dwords) of weapon definition from pStatus
  //    into newEnt->m_weaponData at +0x8c..+0xc4.
  memcpyStruct(newEnt.m_weaponData, pStatus, 56);

  // 5. Virtual init via vtable at newEnt+0x60, slot 0x24. One arg:
  //    `this` (= newEnt). TODO(asm-ambiguous): confirm vtable slot.
  (newEnt as any).__vtable[0x24 / 4](newEnt);

  if (arg1 != null) {
    // 6a. Inherit owner: deref arg1->pev->+0x208 and store at
    //     newEnt.pev.owner (offset 0x198).
    // TODO: verify +0x198 (likely pev.owner) and +0x208 (some entvar
    // chain field) against this HL build's entvars_t layout.
    newEnt.pev.owner = (arg1 as any)[0][0x208 / 4];

    // 6b. Time-think branching. Compare a global float at PIC-relative
    //     GOT-0x6f408 against arg1+0x180 (NOT through pev — ecx was
    //     loaded as arg1 at 90884 and not reloaded before the fcomp).
    //     MSVC FPU pattern: `fcomp`+`fnstsw ax`+`test ah, 0x40; jne`
    //     — the `jne` jumps when FPU ZF=1, i.e. when values are EQUAL.
    // TODO(asm-ambiguous): identify the global (likely a cvar or a
    // gpGlobals->time slot) and the +0x180 field (some entity/player
    // time field).
    const refTime: number = (arg1 as any)[0x180 / 4]; // NOT [0][0x180/4]
    const globalTime: number = GLOBAL_FLOAT_AT_GOT_MINUS_0x6f408 as any;

    if (globalTime !== refTime) {
      // Different: vtable[5](this=newEnt, time, 0). The disassembly
      // pushes 0, time, then newEnt — so the function reads args in
      // order (this, time, 0).
      (newEnt as any).__vtable[0x14 / 4](newEnt, refTime, 0);
    } else {
      // Equal: chain via arg1->vtable[4](arg1) → float, then call
      // vtable[5](newEnt, chained, 0). arg1's vtable is at arg1+0x60
      // (NOT through pev — the disassembly does [edx+0x60] on the
      // freshly-loaded arg1, not on pev).
      const chained: number = (arg1 as any)[0x60 / 4][0x10 / 4](arg1);
      (newEnt as any).__vtable[0x14 / 4](newEnt, chained, 0);
    }
  } else {
    // 6c. No anchor: zero owner, set pev+0x254 = 1.0 (default state).
    newEnt.pev.owner = null;
    newEnt.pev.field_0x254 = 1.0; // 0x3f800000 — TODO: candidate = pev.scale?
  }

  // 7. Special-case weapon id 29 (0x1d): override five pev fields.
  // TODO(asm-ambiguous): what weapon is id 29 in TS, and the meanings
  // of +0x14c / +0x150 / +0x154 / +0x158 / +0x15c in this entvars_t.
  if (weaponId === 29) {
    newEnt.pev.field_0x14c = 5.0;   // 0x40a00000
    newEnt.pev.field_0x15c = 19;    // 0x13 (dword, not float)
    newEnt.pev.field_0x150 = 200.0; // 0x43480000
    newEnt.pev.field_0x154 = 200.0; // 0x43480000
    newEnt.pev.field_0x158 = 200.0; // 0x43480000
  }

  return newEnt;
}
