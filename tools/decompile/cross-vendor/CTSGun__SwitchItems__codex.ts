```typescript
/**
 * CTSGun::SwitchItems — Cycle which primary/secondary item the player is
 * currently "drawing" (e.g., primary → secondary → akimbo → off) based on
 * which inventory slots actually contain a weapon, then play a switch sound
 * with a slight randomized pitch.
 *
 * @param this  The CTSGun entity instance
 * @returns     void
 */
export function SwitchItems(this: CTSGun): void {
  const player = this.m_pPlayer; // [this+0xcc]
  if (!player) return;

  // Bits 1 (0x2) and 2 (0x4) on the player encode primary / secondary slots:
  //   [player+0x10] = which slots hold a weapon
  //   [player+0x14] = which slots are currently "active" (drawn)
  // TODO: confirm field names against the HL SDK / TS layout — likely
  //   something like m_iWeapons / m_iActiveItems or TS-specific flags.
  const slotMask = player.m_iSlotFlags & 0x6;
  const activeMask = player.m_iActiveFlags & 0x6;

  if (slotMask === 0x6) {
    // Both primary and secondary slots hold a weapon
    if (activeMask === 0x6) {
      // Both already active (e.g., akimbo) → drop back to nothing drawn
      player.m_iActiveFlags = 0;
    } else if (player.m_iActiveFlags & 0x2) {
      // Primary currently active → switch to secondary
      // (preserve other bits; set bit 2, clear bit 1)
      player.m_iActiveFlags = (player.m_iActiveFlags | 0x4) & ~0x2;
    } else if (player.m_iActiveFlags & 0x4) {
      // Secondary currently active → switch to primary (preserve other bits)
      player.m_iActiveFlags |= 0x2;
    } else {
      // Nothing currently active → default to primary (preserve other bits)
      player.m_iActiveFlags |= 0x2;
    }
  } else if (slotMask & 0x2) {
    // Only primary slot has a weapon: toggle primary-active on/off
    if (player.m_iActiveFlags & 0x2) {
      player.m_iActiveFlags = 0; // toggle off (full clear)
    } else {
      player.m_iActiveFlags |= 0x2; // toggle on, preserve other bits
    }
  } else if (slotMask & 0x4) {
    // Only secondary slot has a weapon: toggle secondary-active on/off
    if (player.m_iActiveFlags & 0x4) {
      player.m_iActiveFlags = 0; // toggle off (full clear)
    } else {
      player.m_iActiveFlags |= 0x4; // toggle on, preserve other bits
    }
  } else {
    // Neither slot has a weapon — clear active mask and bail silently
    // (no switch sound is played in this case).
    player.m_iActiveFlags = 0;
    return;
  }

  // Play the switch sound. The edict is fetched via double-deref:
  //   edict = *(this.m_pOwner + 0x208)   // [this+0x80] then deref
  // Sample string lives at GOT-relative address 0x98136 (look up the
  // exact path in tools/decompile/analysis/strings-n5.txt).
  // The float pitch comes from engine RANDOM_FLOAT(0.92, 1.0) via the
  // engine vtable at [ebx+0x1aa8] + 0x16c.
  // TODO(asm-ambiguous): exact sample name string.
  // TODO(asm-ambiguous): RANDOM_LONG(0, 3) + 0x62 (=> 98..101) is computed
  //   and pushed before the float call; its role in the final
  //   EMIT_SOUND_DYN(edict, CHAN_ITEM, sample, vol, atten, pitch, flags)
  //   call is unclear — likely either the int pitch or a leftover slot.
  // TODO: confirm offset meaning for [this+0x80] (likely m_pOwner) and
  //   [+0x208] (likely pContainingEdict or similar end-of-struct field).
  // TODO: implement via g_engfuncs / engine vtable:
  //   EMIT_SOUND_DYN(<edict>, 3 /*CHAN_ITEM*/, <sample>,
  //                  1.25 /*vol*/, ??? /*atten*/, RANDOM_FLOAT(0.92, 1.0) /*pitch*/,
  //                  0 /*flags*/)
}
```
