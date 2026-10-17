/**
 * CTSGun::TakeWeapon — equip an instance of `weapon_id` for the
 * player. Picks an inventory slot for this weapon type, copies
 * state from `src_status` (or initialises from weapon-db defaults),
 * and updates the player's "owns this weapon" bitmask.
 *
 * Special handling is applied for akimbo (dual-wield) weapons
 * (which merge primary + sidearm ammo) and "only-akimbo" weapons
 * (which split their default ammo evenly between two magazines).
 *
 * @param this        The CTSGun entity managing this player's weapons.
 * @param weapon_id   Weapon type id. Must satisfy 0 <= id <= 0x25.
 * @param src_status  Pointer to a source s_weapon_status struct to
 *                    copy 0x38 bytes from. May be 0 to skip the
 *                    copy and initialise from defaults instead.
 * @param flags       Bit flags to OR into the new slot's bitmask word.
 * @returns           1 on success; 0 if weapon_id is out of range,
 *                    the weapon type isn't registered in the db, or
 *                    a non-stackable slot-already-active case.
 */
export function TakeWeapon(
  this: CTSGun,
  weapon_id: number,
  src_status: number,
  flags: number
): number {
  // ===== 1. Range check =========================================
  // asm 0x70a17..0x70a23:  cmp ecx, 0x25 ; ja fail
  if (weapon_id > 0x25) return 0;

  // ===== 2. weapon-db "valid" flag lookup ======================
  // The PIC setup at 0x70a0b..0x70a11 puts EBX = PIC_base + 0xf5400,
  // and the entire function then indexes off EBX+0x7d30, so the
  // effective weapon-db base is PIC_base + 0x102130.
  //
  // The shl/sub/shl/sub sequence at 0x70a29..0x70a35 is an MSVC
  // codegen quirk for ecx*247, then *4 ⇒ id*988, so
  // sizeof(s_weapon_db_entry) == 0x3dc (988 bytes).
  const weaponDbBase = (this as any).__picBase + 0x102130;
  if (loadU8(weaponDbBase + weapon_id * 988) === 0) return 0;

  // ===== 3. Slot resolution + "stackable reuse" branch =========
  // The slot array lives at `this+0x110` with stride 56; the
  // primary active flag is at slot[+0], secondary at slot+4
  // (i.e. `this + 0x114` for slot[0]).
  //
  // Asm 0x70aa4..0x70b9b does a small db-driven rewrite that can
  // swap in a different `targetWeaponId` — see the
  // `__resolveTakeSlot` TODO below.
  //
  // Asm 0x70bcf..0x70be7: stackable-reuse short-circuit.
  //   if (weapon_db[weaponId].flag_dc != 0 && slot[+0] != 0) {
  //     slot.stackCount += 1;
  //     return 1;
  //   }
  //
  // TODO(helper): __resolveTakeSlot must return both the slot
  // pointer AND the `flag_dc` gate so we don't lose it here.
  const resolved = this.__resolveTakeSlot(weapon_id);
  if (resolved.flag_dc !== 0 && resolved.slot.stackCountActive()) {
    resolved.slot.stackCount += 1;
    return 1;
  }
  const slot = resolved.slot;

  // ===== 4. Populate the slot =================================
  // Slot struct (s_weapon_status, 56 bytes / 0x38). Fields used by
  // this function:
  //
  //   +0x00  active       (byte)
  //   +0x01  displayByte  (byte, from db+0x08)
  //   +0x02  mode         (byte, derived from db flags — see §4b)
  //   +0x04  primaryAmmo  (dword)
  //   +0x08  clipAmmo     (dword, zeroed)
  //   +0x0c  unknownA     (dword, zeroed)
  //   +0x10  flagsWord    (dword, OR'd w/ db+0x120, AND'd w/ db+0xe0)
  //   +0x14  subFlags     (dword, OR'd w/ db+0x120, |= 0x2/0x4 late)
  //   +0x18  tickCounter  (dword, zeroed late)
  //   +0x1c  sidePrimary  (dword, akimbo only)
  //   +0x20  ownPrimary   (dword, akimbo only)
  //   +0x24  someByte     (byte,  zeroed late)
  //   +0x28  nextFreePtr  (dword, late)
  if (src_status !== 0) {
    // Path A — bulk copy 0x38 bytes from src_status, then force
    // active=1 and zero the two ammo-ish dwords at +0x08/+0x0c.
    // asm 0x70bf7..0x70c15.
    slot.copyFrom(src_status, 0x38);
    slot.active   = 1;
    slot.clipAmmo = 0;
    slot.unknownA = 0;
  } else {
    // Path B — set active + display, leave ammo for the akimbo /
    // normal branches. +0x0c is zeroed here; +0x08 will be cleared
    // later in §6. asm 0x70d4c..0x70d59.
    slot.active       = 1;
    slot.displayByte  = loadU8(weaponDbBase + weapon_id * 988 + 0x08);
    slot.unknownA     = 0;
  }

  // ===== 4b. Slot mode byte ===================================
  // asm 0x70cfd..0x70d34 (path A) and 0x70d60..0x70d98 (path B).
  // Three flag bits in weapon_db[weaponId].flags (+0x0c) drive
  // slot.mode:
  //
  //   bit 0x1 set                → mode = 0
  //   bit 0x8 set                → mode = 3
  //   bit 0x4 set (else branch)  → mode = 2   (NOT 1 — that was
  //                                              the previous bug)
  //   none of above              → mode = 1   (NOT 2)
  //
  // The 0x4 branch computes `al = 2 - sete` where sete reflects
  // the bit being clear, giving mode = 2 when set and 1 when clear.
  {
    const dbFlags = loadU32(weaponDbBase + weapon_id * 988 + 0x0c);
    if      (dbFlags & 0x1) slot.mode = 0;
    else if (dbFlags & 0x8) slot.mode = 3;
    else if (dbFlags & 0x4) slot.mode = 2;
    else                    slot.mode = 1;
  }

  // ===== 5. Ammo + akimbo handling =============================
  if (IsWeaponAkimbo(weapon_id)) {
    // Akimbo (dual-wield): pull sidearm_id from weapon_db+0xcc,
    // then merge sidearm.primaryAmmo into slot.primaryAmmo and
    // write the per-weapon flags mirror at weapon_db+0x120.
    //
    // asm 0x70c25..0x70cfe (path A)
    //      0x70da4..0x70e79 (path B)
    //
    // TODO(helper): ~25 lines of byte arithmetic; abstract into
    // `mergeAkimboAmmo(slot, weaponDbBase, weapon_id, flags)`.
    mergeAkimboAmmo(slot, weaponDbBase, weapon_id, flags);
  } else if (IsOnlyAkimbo(weapon_id)) {
    // Only-akimbo: split default ammo evenly between the two
    // magazines (sar 1 with round-up bias). asm 0x70e8d..0x70ecd.
    const fullAmmo = loadU32(weaponDbBase + weapon_id * 988 + 0x04);
    const halfAmmo = fullAmmo >>> 1;
    slot.primaryAmmo = halfAmmo;
    slot.sidePrimary = halfAmmo;
    slot.ownPrimary  = 0;
    slot.flagsWord   = flags | loadU32(weaponDbBase + weapon_id * 988 + 0xe4);
    slot.subFlags    = 0;
  } else {
    // Standard single-handed pickup. asm 0x70ed0..0x70ee7.
    slot.primaryAmmo = loadU32(weaponDbBase + weapon_id * 988 + 0x04);
    slot.flagsWord   = flags | loadU32(weaponDbBase + weapon_id * 988 + 0xe4);
    slot.subFlags    = 0;
  }

  // ===== 6. Final bookkeeping =================================
  // Zero per-tick counters and link this slot into the per-weapon
  // "next-free" cache head (head lives at weapon_db + id*988 + 0x252).
  // asm 0x70eee..0x70f0a.
  slot.tickCounter = 0;
  slot.someByte    = 0;
  slot.clipAmmo    = 0;
  slot.nextFreePtr = weaponDbBase + weapon_id * 988 + 0x252;

  // Apply the db's per-weapon owned-weapons mask to flagsWord.
  // asm 0x70f0d..0x70f16.
  slot.flagsWord &= loadU32(weaponDbBase + weapon_id * 988 + 0xe0);

  // Propagate the persist-on-pickup bits 0x2 and 0x4 into subFlags.
  // asm 0x70f19..0x70f2e.
  if (slot.flagsWord & 0x2) slot.subFlags |= 0x2;
  if (slot.flagsWord & 0x4) slot.subFlags |= 0x4;

  return 1;
}
