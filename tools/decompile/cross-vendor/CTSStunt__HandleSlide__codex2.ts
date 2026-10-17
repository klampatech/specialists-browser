/**
 * CTSStunt::HandleSlide
 *
 * Per-frame slide-stunt state machine. Bails if not grounded; otherwise
 * dispatches into one of three directional branches keyed on input
 * flags, each rate-limited by the cvar at [ebx-0x6f3f0]. Branch A
 * injects a forward+side velocity into [pev+0x174] and toggles two bits
 * in [pev+0x250]; Branches B & C copy a view-aligned Vector (from the
 * gpGlobals-internal table populated by UTIL_MakeVectors) into
 * [this+0x20]. Fallthrough plays the default idle animation (index 0x3).
 */

// Engine callbacks (declared ambient so this file compiles standalone).
declare function Animate(animPtr: any, player: any, index: number): void;
declare function UTIL_MakeVectors(angles: any): void;

// Runtime lookups for the PC-relative data symbols the asm references.
// Identities to be confirmed against strings-n5.txt / disassembly.
declare function readFloatFromPCRel(slot: number): number;  // [ebx-0x6f408], [ebx-0x6de6c], [ebx-0x6f3f0]
declare function readGPGlobalsInternal(): any;               // [ebx+0x1600]

export function HandleSlide(this: CTSStunt): void {
  const t = this as any;
  const player = t.m_pPlayer;        // [this+0x40]: CBasePlayer*
  const pev = (player as any).pev;   // entvars_t* (asm does two derefs)

  // ---- Bail if not on ground ----
  // asm: test BYTE PTR [eax+0x1a5], 0x2  (FL_ONGROUND bit)
  if (!(pev.byte_0x1a5 & 0x2)) {
    return;
  }

  // ---- Frozen-state guard: force framerate to 1.0 ----
  // asm: test BYTE PTR [eax+0x180], 0x10 → mov [eax+0x120], 0x3f800000
  if (pev.byte_0x180 & 0x10) {
    pev.field_0x120 = 1.0;            // TODO(asm-ambiguous): likely pev.framerate
  }

  // ---- Branch A: forward+side slide (DWORD [pev+0x180] = 0x4006) ----
  // asm: test DWORD PTR [edx+0x180], 0x4006
  //      fld [ebp+0x30]; fcomp [ebx-0x6f3f0]; jae skip
  const cvarSlideRepeat = readFloatFromPCRel(/* slot: -0x6f3f0 */ 0) ?? Number.POSITIVE_INFINITY;
  const inBranchA = (pev.dword_0x180 & 0x4006) === 0x4006;
  if (inBranchA && t.m_flSlideTimer < cvarSlideRepeat) {
    // asm: or [edx+0x250], 0x1 ; and [edx+0x250], 0xffffffdf
    pev.dword_0x250 = ((pev.dword_0x250 | 0x1) & ~0x20) >>> 0;

    // asm: 3-dword memcpy {cvar1, cvar1, cvar2} → [pev+0x174]
    const cv1 = readFloatFromPCRel(/* slot: -0x6f408 */ 0);
    const cv2 = readFloatFromPCRel(/* slot: -0x6de6c */ 0);
    pev.field_0x174 = { x: cv1, y: cv1, z: cv2 };   // TODO(asm-ambiguous): cvars

    t.m_flSlideMult = 0.75;            // [this+0x04] = 0x3f400000
    player.field_0x78 = 1;             // [player+0x78]
    Animate((player as any) + 0x28c, player, 0x29);
    pev.field_0x120 = 1.0;
    return;
  }

  // ---- Branch B: directional slide (BYTE [pev+0x181] bit 1) ----
  if ((pev.byte_0x181 & 0x2) && t.m_flSlideTimer < cvarSlideRepeat) {
    Animate((player as any) + 0x28c, player, 0x2a);
    UTIL_MakeVectors(pev.v_angle as any);
    // asm: 12-byte copy from *(gpGlobals_internal) + 0x28 → [this+0x20]
    const gp = readGPGlobalsInternal();
    t.m_vecSlideDir = { ...gp.field_0x28 };   // TODO(asm-ambiguous): likely vecRight

    pev.field_0x120 = 1.0;
    t.m_bSlideState = 0;              // [this+0x2c] single byte clear
    player.field_0x2a0 = 2;
    return;
  }

  // ---- Branch C: directional slide (BYTE [pev+0x181] bit 2) ----
  if ((pev.byte_0x181 & 0x4) && t.m_flSlideTimer < cvarSlideRepeat) {
    Animate((player as any) + 0x28c, player, 0x2b);
    UTIL_MakeVectors(pev.v_angle as any);
    const gp = readGPGlobalsInternal();
    t.m_vecSlideDir = { ...gp.field_0x28 };

    pev.field_0x120 = 1.0;
    t.m_bSlideState = 0;
    player.field_0x2a0 = 2;
    return;
  }

  // ---- Default: no slide input; play standard idle ----
  Animate((player as any) + 0x28c, player, 0x03);
}
