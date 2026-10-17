```typescript
/**
 * CTSStunt::HandleSlide — Per-frame slide-stunt state machine. Bails if the
 * player isn't grounded, otherwise dispatches into one of three directional
 * branches keyed on player input flags, each rate-limited by a cvar window.
 * Each branch fires a slide animation and applies a velocity/direction
 * Vector; the fallthrough plays the default idle animation.
 *
 * @param this  The CTSStunt entity instance
 * @returns     void
 */

// Engine callbacks (declared ambient so this file compiles in isolation;
// real implementations live in the engine wrapper layer — see D.4).
declare function Animate(animPtr: any, player: any, index: number): void;
declare function UTIL_MakeVectors(angles: any): void;

export function HandleSlide(this: CTSStunt): void {
  const t = this as any;                       // CTSStunt fields TBD — see D.4
  const player = t.m_pPlayer;                  // [this+0x40]: CBasePlayer*
  const pev = player.pev;                      // CBasePlayer::pev (entvars_t*)

  // ---- Ground check ----
  // [pev+0x1a5] holds FL_ONGROUND (0x2) in this build's pev layout.
  if (!(pev.flags & 0x2)) {
    return;
  }

  // ---- Frozen-state guard ----
  // If the "frozen" flag at [pev+0x180] bit 4 is set, force animation framerate.
  if (pev.flags & 0x10 /* [pev+0x180] bit 4 */) {
    pev.framerate = 1.0;                       // [pev+0x120]
  }

  // ---- Branch A: full forward+side slide ----
  //   Input bits: 0x4006 (DWORD at [pev+0x180]).
  //   Animation: 0x29.  Velocity: (cv1, cv1, cv2) → pev field 0x174.
  if (pev.flags & 0x4006) {
    // TODO(asm-ambiguous): cvar at [ebx-0x6f3f0] is unnamed here; likely
    // ts_slide_repeat or similar. `jae` jumps out when t.m_flSlideTimer is
    // above-or-equal, so we fire only while still inside the window.
    const cvarSlideRepeat = 0;
    if (t.m_flSlideTimer < cvarSlideRepeat) {
      // Toggle movement flags at [pev+0x250].
      pev.flags = (pev.flags | 0x1) & ~0x20;

      // Apply slide velocity: 12-byte memcpy from {cv1, cv1, cv2} into pev+0x174.
      // TODO(asm-ambiguous): cvars at [ebx-0x6f408] and [ebx-0x6de6c] — x==y
      // is intentional here, but their identities are unclear.
      // TODO: offset 0x174 in pev is unclear — likely not the standard velocity slot.
      const cv1 = 0;
      const cv2 = 0;
      // memcpy12(pev + 0x174, &{ cv1, cv1, cv2 });
      pev.field_0x174 = { x: cv1, y: cv1, z: cv2 };

      t.m_flSlideMult = 0.75;                  // [this+0x04] = 0x3f400000
      player.field_0x78 = 1;                   // [player+0x78]

      Animate(player + 0x28c /* CTSAnimation* */, player, 0x29);
      pev.framerate = 1.0;
      return;
    }
    // else: fall through to the directional branches below
  }

  // ---- Branch B: directional slide, input bit 0x2 in BYTE at [pev+0x181] ----
  if (pev.flags & 0x2 /* at [pev+0x181] */) {
    const cvarSlideRepeat = 0;
    if (t.m_flSlideTimer < cvarSlideRepeat) {
      Animate(player + 0x28c, player, 0x2a);

      // Recompute view-aligned direction vectors from the player's view angles.
      // TODO(asm-ambiguous): offset 0x74 in pev is presumed to be v_angle.
      UTIL_MakeVectors(pev.v_angle);

      // Copy a 12-byte direction Vector from a global table into t.m_vecSlideDir.
      // Source: *(ebx + 0x1600) → first field pointer → +0x28.
      // TODO(asm-ambiguous): global identity and +0x28 meaning are inferred —
      // likely v_right after UTIL_MakeVectors populates engine globals.
      t.m_vecSlideDir = null;                  // 12 bytes from g_someDirTable + 0x28

      pev.framerate = 1.0;
      t.m_fSlideFlags = 0;                     // [this+0x2c]
      player.field_0x2a0 = 2;                  // [player+0x2a0]
      return;
    }
    // else: fall through
  }

  // ---- Branch C: directional slide, input bit 0x4 in BYTE at [pev+0x181] ----
  if (pev.flags & 0x4 /* at [pev+0x181] */) {
    const cvarSlideRepeat = 0;
    if (t.m_flSlideTimer < cvarSlideRepeat) {
      Animate(player + 0x28c, player, 0x2b);
      UTIL_MakeVectors(pev.v_angle);
      t.m_vecSlideDir = null;
      pev.framerate = 1.0;
      t.m_fSlideFlags = 0;
      player.field_0x2a0 = 2;
      return;
    }
    // else: fall through
  }

  // ---- Default: no slide input this frame; play the standard idle animation. ----
  Animate(player + 0x28c, player, 0x3);
}
```
