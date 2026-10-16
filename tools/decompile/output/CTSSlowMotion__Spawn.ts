/**
 * CTSSlowMotion::Spawn — initialize a slow-motion trigger entity.
 *
 * Sets the class identifier, model string, bounding box, origin,
 * collision and movement flags, initial state, and schedules the
 * first think. Reads spawn flags for behavior options and
 * optionally calls ActivateSlow if the "Start On" flag (0x1) is
 * set.
 *
 * Field offsets follow the TS mod's non-standard entvars_t layout.
 * Names marked TODO must be verified against the actual class
 * definition (D.4 cross-references).
 *
 * @param this  The CTSSlowMotion entity instance
 * @returns     void
 */
export function Spawn(this: any /* TODO: CTSSlowMotion */): void {
  // PIC / GOT base established by the prologue. Globals via [ebx + offset]:
  //   [ebx+0x1600] → pointer to engine globals struct (gpGlobals-like)
  //   [ebx+0x1aa8] → engine function table
  //   [ebx+0x1540] → render-mode constant
  //   [ebx-0x6f010] → NEXT_THINK_DELAY (double, value unverified)
  //   [ebx-0x6eeb5] → used in the classname computation

  // TODO: import / declare from project sources; any-stubs for isolation.
  const ENGINE_GLOBALS_PTR: any = null;       // [ebx+0x1600] deref
  const ENGINE_FUNCTIONS: any[] = [];         // [ebx+0x1aa8]
  const NEXT_THINK_DELAY: number = 0;         // [ebx-0x6f010] — TODO: verify
  const RENDER_MODE: number = 0;             // [ebx+0x1540]
  const CLASS_ID_SLOWMOTION: number = 0;      // computed from [ebx-0x6eeb5]

  const pev: any = this.pev;

  // 1. Set class identifier. Value = (GOT-relative code addr)
  //    - (*gpGlobals_struct)[0x98].
  //    TODO(asm-ambiguous): encoding is opaque without engine source.
  pev.classname = CLASS_ID_SLOWMOTION;

  // 2. Call ENGINE_FUNCTIONS[2] (offset 0x8 / 4-byte-fn-ptr = index 2).
  //    Args: (pev+0x208 aux string, pev->model + engine_state_offset).
  //    engine_state_offset = (*gpGlobals)[0x98].
  //    pev->model = pev+0xb8 in this build.
  //    TODO(asm-ambiguous): pev+0x208 is most likely pev->noise2 or  //      another aux string field; the engine_state_offset's purpose
  //      is unclear; the called function's signature isn't a standard
  //      HLSDK enginefuncs_t entry.
  const engineStateOffset =
    ((ENGINE_GLOBALS_PTR as any)[0x98] as number) | 0;
  ENGINE_FUNCTIONS[2](
    /* pev+0x208 */ null,                    // TODO: aux string field
    (pev.model as number) + engineStateOffset
  );

  // 3. Set bounding box. UTIL_SetSize(pev, mins, maxs).
  //    mins/maxs are at pev+0xdc and pev+0xe8 in this build.
  //    TODO(asm-ambiguous): these offsets don't match standard HLSDK
  //      entvars_t; they're likely vuser3/vuser4 or TS-specific.
  UTIL_SetSize(pev, /* pev+0xdc */ null, /* pev+0xe8 */ null);

  // 4. Snap origin to pev->origin (offset 0x8).
  UTIL_SetOrigin(pev, pev.origin);

  // 5. Set collision and movement flags.
  //    TODO(asm-ambiguous): offsets don't match standard HLSDK entvars_t.
  pev.flags |= 0x80;        // FL_PARTIALGROUND or similar; offset 0x118
  pev.solid = 1;            // SOLID_BSP; offset 0x10c
  pev.movetype = 5;         // MOVETYPE_FLY; offset 0x108

  // 6. Initialize instance fields.
  //    TODO: verify names against CTSSlowMotion class definition.
  this.m_iWaitCount = 0;          // offset 0x14 (int)
  this.m_iPlayerCount = 0;        // offset 0x18 (int)
  this.m_color = 0xffff0000;      // offset 0x0c (RGBA packed: B=0xff, A=0xff)
  this.m_renderMode = RENDER_MODE;// offset 0x10
  this.m_iState = 0;              // offset 0x68 (int)
  this.m_bActive = false;         // offset 0x64 (byte)

  // 7. Schedule next think. Both pev->nextthink and m_flActivateTime
  //    are set to gpGlobals->time + NEXT_THINK_DELAY.
  //    TODO(asm-ambiguous): pev->nextthink offset (0x104) doesn't match
  //      standard HLSDK entvars_t; verify.
  const thinkTime = ENGINE_GLOBALS_PTR.time + NEXT_THINK_DELAY;
  pev.nextthink = thinkTime;        // offset 0x104
  this.m_flActivateTime = thinkTime; // offset 0x6c

  // 8. Zero the player tracking array (33 dwords at offset 0x70).
  //    TODO: verify size; likely MAX_PLAYERS (32) + 1 sentinel.
  for (let i = 0; i < 33; i++) {
    (this.m_pTrackedPlayers as any[])[i] = null;
  }

  // 9. Compute distance between two vectors at pev+0xc4 and pev+0xd0.
  //    Store as int (truncated) in m_iMaxDistance (offset 0xf4).
  //    ⚠️ TODO(asm-ambiguous): the disassembly emits `fmulp st(1), st`
  //      after the sqrt that multiplies the distance by a leftover
  //      FPU value from the next_think setup (NEXT_THINK_DELAY).
  //      The value actually stored is (int)(distance * NEXT_THINK_DELAY),
  //      not just (int)distance. Codex1 assumed "the slot holds 1.0
  //      in the normal case" but this isn't justified. The next_think
  //      delay constant is plausibly 1.0 (TS-specific for this entity)
  //      but more commonly 0.1 (10Hz think rate) — needs verification.
  //    TODO(asm-ambiguous): pev+0xc4 / pev+0xd0 are likely vuser1 / vuser2.
  const dx = (pev.v2x as number) - (pev.v1x as number);
  const dy = (pev.v2y as number) - (pev.v1y as number);
  const dz = (pev.v2z as number) - (pev.v1z as number);
  this.m_iMaxDistance = Math.trunc(
    Math.sqrt(dx * dx + dy * dy + dz * dz)
  );

  // 10. Read spawn flags into option fields.
  //     TODO(asm-ambiguous): pev->spawnflags offset (0x1a0) doesn't match
  //       standard HLSDK entvars_t; verify.
  this.m_bOption1 = (pev.spawnflags & 0x2) ? true : false; // offset 0x100 (int)
  this.m_bOption2 = (pev.spawnflags & 0x4) ? true : false; // offset 0x104 (byte)

  // 11. Spawnflag 0x1 = "Start On" — fire ActivateSlow immediately.
  if (pev.spawnflags & 0x1) {
    ActivateSlow(this);
  }
}

// Stubs — replace with actual definitions or import from the project.
declare const ENGINE_GLOBALS_PTR: any;
declare const ENGINE_FUNCTIONS: any[];
declare const NEXT_THINK_DELAY: number;
declare const RENDER_MODE: number;
declare const CLASS_ID_SLOWMOTION: number;
declare function UTIL_SetSize(pev: any, mins: any, maxs: any): void;
declare function UTIL_SetOrigin(pev: any, origin: any): void;
declare function ActivateSlow(self: any): void;
