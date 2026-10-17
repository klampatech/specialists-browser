```typescript
/**
 * CTSGun::SwitchItems — cycle the active item(s) on this weapon
 * (akimbo-style swap) and play the "weapons/switch.wav" cue.
 *
 * Reads two fields off `this->m_pActiveItem` (offset 0xcc):
 *   +0x10  bits_0x10 — which item slots exist on this weapon.
 *                    Bit 0x2 = primary slot, bit 0x4 = secondary.
 *   +0x14  m_iFlags  — which items are currently "active".
 *                    Same bit layout.
 *
 * State transitions (m_iFlags is mutated in place; asm follows each
 * branch faithfully — note the "both → none" transition also clears
 * every other bit of m_iFlags, not just 0x2 and 0x4):
 *
 *   When both slots exist (bits_0x10 & 0x6 == 0x6):
 *     0x6 (both)      → m_iFlags = 0            (clear all 32 bits)
 *     0x0 (none)      → m_iFlags |= 0x2         (primary only)
 *     0x2 (primary)   → (m_iFlags & ~0x2) | 0x4 (secondary only)
 *     0x4 (secondary) → m_iFlags |= 0x2         (both)
 *     … 4-state ring: 0 → 2 → 4 → 6 → 0 …
 *
 *   When only the primary slot exists (bits_0x10 & 0x6 == 0x2):
 *     if m_iFlags has bit 0x2 → m_iFlags = 0      (clear all)
 *     else                      → m_iFlags |= 0x2 (set primary)
 *
 *   When only the secondary slot exists (bits_0x10 & 0x6 == 0x4):
 *     if m_iFlags has bit 0x4 → m_iFlags = 0      (clear all)
 *     else                      → m_iFlags |= 0x4 (set secondary)
 *
 *   When neither slot exists (bits_0x10 & 0x6 == 0x0):
 *     m_iFlags = 0  and NO sound is played.
 *
 * Otherwise a "weapons/switch.wav" sample is emitted on the owning
 * player's edict with a small random pitch (≈ 98..101) and slightly
 * randomized attenuation.
 *
 * @param this  The CTSGun weapon entity (this in C++)
 * @returns     void
 */
export function SwitchItems(this: CTSGun): void {
  const self = this as any;

  // 1. Bail if there is no active item slot.
  const active = self.m_pActiveItem;
  if (active == null) {
    return;
  }

  // 2. Read the slot bits and current flags from the active item.
  const slotBits = (active.bits_0x10 | 0) & 0x6;   // [+0x10] & 0x6
  const flags    =  active.m_iFlags | 0;            // [+0x14]

  // 3. State machine.
  let playSound = true;
  switch (slotBits) {
    case 0x6: {
      // Both slots exist — cycle through the 4-state ring.
      switch (flags & 0x6) {
        case 0x6:
          // Both active → none. Clear ALL bits of m_iFlags.
          active.m_iFlags = 0;
          break;
        case 0x2:
          // Primary only → secondary only (clear 0x2, set 0x4).
          active.m_iFlags = (flags & ~0x2) | 0x4;
          break;
        case 0x4:
          // Secondary only → both (set 0x2, leave 0x4 alone).
        case 0x0:
        default:
          // None → primary only (set 0x2).
          active.m_iFlags = flags | 0x2;
          break;
      }
      break;
    }
    case 0x2:
      // Only primary slot — toggle bit 0x2 (or clear all if set).
      if ((flags & 0x2) !== 0) {
        active.m_iFlags = 0;            // asm: mov [eax+0x14], 0
      } else {
        active.m_iFlags = flags | 0x2;  // asm: or  [eax+0x14], 0x2
      }
      break;
    case 0x4:
      // Only secondary slot — toggle bit 0x4 (or clear all if set).
      if ((flags & 0x4) !== 0) {
        active.m_iFlags = 0;            // asm: mov [eax+0x14], 0
      } else {
        active.m_iFlags = flags | 0x4;  // asm: or  [eax+0x14], 0x4
      }
      break;
    default:
      // Neither slot — clear, but no sound.
      active.m_iFlags = 0;
      playSound = false;
      break;
  }

  if (!playSound) {
    return;
  }

  // 4. Emit the switch click.
  // Edict: edi = *( *(this.m_pPlayer_at_0x80) + 0x208 )
  const player: any = self.m_pPlayer;
  const edict: AnyPtr = player.pev.engineRef_0x208;

  // Engine singleton at [GOT+0x1aa8]. vfunc_0x168 returns an int
  // (≈ pitch offset in [0, 3]); vfunc_0x16c returns a float (≈ random
  // attenuation in [0.918, 1.0]). Full signatures TBD; both calls
  // also have stack-pad dwords (from `sub esp, 0x4` / `sub esp, 0x8`)
  // that aren't pushed by the asm and are not consumed here either.
  const engine = (self.__picBase + 0x1aa8) as AnyPtr;
  const pitchOffset: number = (engine as any)[0x168](0, 3, 0.5);
  const pitch: number = (pitchOffset | 0) + 0x62;     // ≈ 98..101
  const attnJitter: number = (engine as any)[0x16c](
    0.918, 1.0, /* pad: */ 1.25, 0, pitch,
  );

  // Sound sample path: [GOT - 0x6dcda] → "weapons/switch.wav"
  const sample: AnyPtr = (self.__picBase - 0x6dcda) as AnyPtr;

  // EMIT_SOUND_DYN(edict, channel, sample, vol, attn, flags, pitch)
  // — 7-arg HL SDK signature. The disassembly also has 4 extra bytes
  // of stack from a prior `sub esp, 0x4` alignment pad that gets
  // lumped into the `add esp, 0x20` cleanup; not consumed by the callee.
  EMIT_SOUND_DYN(
    edict,         // arg1: edict
    0x3,           // arg2: channel (CHAN_ITEM)
    sample,        // arg3: "weapons/switch.wav"
    1.25,          // arg4: vol (slightly boosted above 1.0)
    attnJitter,    // arg5: attn (random 0.918..1.0)
    0,             // arg6: flags
    pitch,         // arg7: pitch (≈ 98..101)
  );
}

// ── stubs for compile isolation ──────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPtr = any;

interface CTSGun {
  /** 0x80 — owning CBasePlayer (used to source the edict for the cue) */
  m_pPlayer: AnyPtr;
  /** 0xcc — active item slot data (or null if nothing is held) */
  m_pActiveItem: CTSGunActiveItem | null;
  /** PIC base for GOT-relative access (filled in by the loader) */
  __picBase: number;
}

interface CTSGunActiveItem {
  /** +0x10 — bitmask of which item slots the weapon has (0x2/0x4 used) */
  bits_0x10: number;
  /** +0x14 — bitmask of which items are currently active (0x2/0x4) */
  m_iFlags: number;
}

declare function EMIT_SOUND_DYN(
  edict: AnyPtr,
  channel: number,
  sample: AnyPtr,
  vol: number,
  attn: number,
  flags: number,
  pitch: number,
): void;
```
