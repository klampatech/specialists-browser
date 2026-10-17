```typescript
/**
 * CTSWorldGun::CreateWeapon — factory for a CTSWorldGun entity.
 * Allocates a fresh worldgun, fills in its classname/weaponId/56-byte
 * weapon-definition block, runs its virtual init, and (when given an
 * anchor worldgun) wires ownership and a think-schedule derived from
 * the anchor's entvar chain. Special-cases weapon id 29 with five
 * pev field overrides.
 *
 * Note: the original C++ is a `static` member function; the prompt
 * skeleton's `this:` slot is occupied by `pExisting`, the optional
 * anchor worldgun passed as the first argument.
 *
 * @param pExisting  Anchor CTSWorldGun (or null). When non-null the
 *                   new entity inherits ownership from a 3-level
 *                   deref into its entvars at +0x208 and schedules a
 *                   think using its pev time at +0x180.
 * @param weaponId   tsweapon_t — weapon type id; stored at +0x88.
 *                   Compared to 29 for the special-case branch.
 * @param pStatus    s_weapon_status — 56-byte weapon definition
 *                   (passed via hidden pointer because the source
 *                   struct exceeds the 4-byte by-value limit).
 *                   Block-copied into the new entity at +0x8c..+0xc4.
 * @param pPlayer    CBasePlayer — used in the equal-time virtual chain.
 * @returns          The new CTSWorldGun, or null on allocation failure.
 */
export function CreateWeapon(
  pExisting: CTSWorldGun | null,
  weaponId: tsweapon_t,
  pStatus: s_weapon_status,
  pPlayer: CBasePlayer,
): CTSWorldGun | null {
  // 1. Allocate the new entity. GetClassPtr<CTSWorldGun>(NULL) is HL's
  //    templated factory: passing NULL forces a fresh edict slot.
  const newEnt: CTSWorldGun = (GetClassPtr as any)(CTSWorldGun);

  if (newEnt == null) {
    // TODO(asm-ambiguous): the localized error string at PIC-relative
    // GOT-0x6b7d0 is not in this chunk. Severity 3 = HUD_PRINTNOTIFY.
    UTIL_ClientPrintAll(3 /* HUD_PRINTNOTIFY */, /* ebx-0x6b7d0 */ 0, 0, 0, 0);
    return null;
  }

  // 2. pev->classname = MAKE_STRING(<classname literal>)
  //    where MAKE_STRING(s) = (int)(s) - gpGlobals->pStringBase.
  //    The literal lives at PIC-relative GOT-0x6b6c5; the string base
  //    is reached via [GOT+0x1600 -> +0 -> +0x98] (engine func table).
  // TODO(asm-ambiguous): literal text not in this chunk; likely
  // "weapon_worldgun" or similar.
  newEnt.pev.classname =
    ((GOT_LITERAL_AT_0x6b6c5 as any) - (GOT_FTABLE_0x1608_0x98 as any)) as any;

  // 3. newEnt->m_iWeaponId at +0x88 (dword).
  newEnt.m_iWeaponId = weaponId;

  // 4. memcpy 56 bytes (14 dwords) of weapon definition from pStatus
  //    into newEnt->m_weaponData at +0x8c..+0xc4. pStatus is passed
  //    via hidden pointer because the source struct > 4 bytes.
  memcpyStruct(newEnt.m_weaponData, pStatus, 56);

  // 5. Virtual init via vtable at newEnt+0x60, slot 0x24 (likely
  //    Spawn/Activate). No extra arguments beyond `newEnt`.
  // TODO(asm-ambiguous): confirm vtable slot semantics.
  (newEnt as any).__vtable[0x24 / 4]();

  if (pExisting != null) {
    // 6a. Inherit owner: 3-level deref reads pExisting[0][0x208] and
    //     stores it at newEnt->pev->owner (offset 0x198).
    // TODO: offset meaning — verify +0x198 (likely pev->owner) and
    // +0x208 (some entvar chain field) against this HL build's
    // entvars_t layout.
    newEnt.pev.owner = (pExisting as any)[0][0x208 / 4];

    // 6b. Time-think branching. Compare a global float at PIC-relative
    //     GOT-0x6f408 against pExisting[0][0x180] (a pev time field).
    //     MSVC's idiomatic `fcomp`+`fnstsw ax`+`test ah, 0x40; jne`
    //     pattern — note `jne` here actually jumps when the values
    //     are EQUAL (because ZF is set in the FPU status word).
    // TODO(asm-ambiguous): identify the global (likely a cvar or a
    // gpGlobals->time slot) and the +0x180 pev field.
    const refTime: number = (pExisting as any)[0][0x180 / 4];
    const globalTime: number = GLOBAL_FLOAT_AT_GOT_MINUS_0x6f408 as any;

    if (globalTime !== refTime) {
      // Different: vtable slot 0x14 (SetNextThink-like) with (0, refTime).
      (newEnt as any).__vtable[0x14 / 4](0, refTime);
    } else {
      // Equal: chain via pExisting[0][+0x60]->0x10 (a virtual that
      // returns a float) and call slot 0x14 with that as the time arg.
      const chained: number = (pExisting as any)[0][0x60 / 4][0x10 / 4](
        (pExisting as any)[0],
      );
      (newEnt as any).__vtable[0x14 / 4](0, chained);
    }
  } else {
    // 6c. No anchor: zero owner, set pev+0x254 = 1.0 (default state).
    newEnt.pev.owner = null;
    newEnt.pev.field_0x254 = 1.0; // 0x3f800000
  }

  // 7. Special-case weapon id 29 (0x1d): override five pev fields.
  // TODO(asm-ambiguous): what weapon is id 29 in TS (likely a
  // grenade/charge-style variant), and the meanings of +0x14c /
  // +0x150 / +0x154 / +0x158 / +0x15c in this entvars_t layout.
  if (weaponId === 29) {
    newEnt.pev.field_0x14c = 5.0;   // 0x40a00000
    newEnt.pev.field_0x15c = 19;    // 0x13 (dword, not float)
    newEnt.pev.field_0x150 = 200.0; // 0x43480000
    newEnt.pev.field_0x154 = 200.0; // 0x43480000
    newEnt.pev.field_0x158 = 200.0; // 0x43480000
  }

  return newEnt;
}
```
