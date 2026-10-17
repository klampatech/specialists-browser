/**
 * CTSGun::SwitchItems — Cycle which primary / secondary item the player
 * is currently "drawing" (primary → secondary → akimbo → off when both
 * slots are loaded), then play a switch-click sound with a slightly
 * randomized pitch. With one slot loaded, toggle that one. With none
 * loaded, silently clear and exit (no sound).
 *
 * Disassembly:  SwitchItems__6CTSGun @ 0x0007155c (319 B)
 *   logic section:  71576..71637
 *   sound section:  71638..71694
 *
 * NOTE: this is a TS-specific gameplay method, not one of the four
 * mod↔engine entry points. The HLSDK reference does not apply; the
 * `GetEntityAPI*` / `GetNewDLLFunctions` checks are N/A here.
 */
export function SwitchItems(this: any): void {
  const player = this.m_pPlayer; // [this+0xcc]
  if (!player) return;

  // [player+0x10] = slots-with-weapon bitmask
  // [player+0x14] = slots-currently-drawn bitmask
  // Bits 1 (0x2) and 2 (0x4) encode primary / secondary.
  // TODO(D.4): confirm field names against the TS / HLSDK entity layout
  //   (likely m_iWeapons / m_iActiveItems, or TS-specific flags).
  const slotMask   = (player.m_iSlotFlags   as number) & 0x6;
  const activeMask = (player.m_iActiveFlags as number) & 0x6;

  if (slotMask === 0x6) {
    // Both primary and secondary slots hold a weapon — cycle through
    // (none → primary → secondary → akimbo → none).
    if (activeMask === 0x6) {
      // A1: akimbo → drop back to nothing drawn.
      player.m_iActiveFlags = 0;
    } else if (player.m_iActiveFlags & 0x2) {
      // A2: primary active → swap to secondary (clear 0x2, set 0x4).
      player.m_iActiveFlags =
        (player.m_iActiveFlags | 0x4) & ~0x2;
    } else if (activeMask & 0x4) {
      // A3: secondary active → escalate to akimbo (or 0x2; bit 2 stays).
      player.m_iActiveFlags = (player.m_iActiveFlags as number) | 0x2;
    } else {
      // A4: nothing currently active → default to primary.
      player.m_iActiveFlags = (player.m_iActiveFlags as number) | 0x2;
    }
  } else if (slotMask & 0x2) {
    // B: only primary loaded — toggle primary-active.
    player.m_iActiveFlags =
      (player.m_iActiveFlags as number) & 0x2
        ? 0
        : (player.m_iActiveFlags as number) | 0x2;
  } else if (slotMask & 0x4) {
    // C: only secondary loaded — toggle secondary-active.
    player.m_iActiveFlags =
      (player.m_iActiveFlags as number) & 0x4
        ? 0
        : (player.m_iActiveFlags as number) | 0x4;
  } else {
    // D: nothing loaded — silent clear, no sound.
    player.m_iActiveFlags = 0;
    return;
  }

  // ---- Play the switch-click sound (disassembly 71638..71694) ----
  //
  // Operand map:
  //   edict = (*(*this->[+0x80])) [+0x208]    (almost certainly
  //           this->m_pOwner->...->containing_edict or a pev offset
  //           that aliases the edict pointer)
  //   pitch = engine.RandomFloat(0.92, 1.0)   (vtable +0x16c)
  //   vol   = 1.25
  //   atten = 0.0
  //   flags = 0x62 | engine.RandomLong(0, 3) (range [98..101];
  //           0x62 = bits 1,5,6 — some SND flag combo + variation bits)
  //   sample = LEA [ebx-0x6dcda]             (GOT-relative, TBD)
  //
  //   call EMIT_SOUND_DYN   (7-arg PLT entry; see TODO about arg order)
  //   add esp, 0x20
  //
  // TODO(asm-ambiguous): exact sample name string. Resolve from
  //   tools/decompile/analysis/strings-n5.txt once GOT is loaded.
  // TODO(asm-ambiguous): confirm [this+0x80] is m_pOwner and [+0x208]
  //   is the edict slot inside that object — cross-reference other
  //   CTSGun methods that pull an edict (e.g., PrimaryAttack).
  // TODO(asm-ambiguous): HLSDK's EMIT_SOUND_DYN signature is
  //   (edict_t*, int, const char*, float vol, float atten, float pitch,
  //   int flags), but the disassembly's stack layout here puts the
  //   RANDOM_FLOAT result in [esp+12] (= HLSDK slot arg 4, "volume")
  //   and 1.25 / 0.0 in slots arg 5 / arg 6 — which only makes sense
  //   if TS passes (edict, channel, sample, pitch, vol, atten, flags).
  //   Verify against TS source before wiring g_engfuncs.pfnEmitSound.

  const edict = ((this.m_pOwner as any)[0] as any)[0x208 / 4];
  const pitch = tsRandomFloat(0.92, 1.0);
  const flags = 0x62 | tsRandomLong(0, 3);

  tsEmitSoundDyn(
    edict,                            // arg 1: edict
    3,                                // arg 2: channel = CHAN_ITEM
    /* sample = */ "TODO-sample",     // arg 3: GOT-relative (TBD)
    /* per TODO above, the float ordering is unusual: */
    /* arg 4: */ pitch,               // per HLSDK would be vol, per TS call appears to be pitch
    /* arg 5: */ 1.25,                // per HLSDK would be atten, per TS call appears to be vol
    /* arg 6: */ 0.0,                 // per HLSDK would be pitch, per TS call appears to be atten
    /* arg 7: */ flags,               // SND flags (per HLSDK order)
  );
}

// --- Stubs to keep this file self-contained -----------------------------
// Wire these to g_engfuncs in D.5.
declare function tsRandomFloat(min: number, max: number): number;
declare function tsRandomLong(min: number, max: number): number;
declare function tsEmitSoundDyn(
  edict: any,
  channel: number,
  sample: string,
  pitch_or_vol: number,
  vol_or_atten: number,
  atten_or_pitch: number,
  flags: number,
): void;
