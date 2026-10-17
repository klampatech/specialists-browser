/**
 * CTSGroundWeapon::Fall — apply gravity + handle wall/ground
 * landing effects.
 *
 * Decompiled from `Fall__15CTSGroundWeapon` (0x00092150, 229 B).
 * Compiles in isolation: every external name is stubbed below or
 * marked TODO.
 *
 * Control flow (logically equivalent to the asm):
 *   if (onWall)            → PutOnWall (if not landed) + sound + tail
 *   else if (dropGround)   → sound + clear model fields + tail
 *   else if (m_bLanded)    → sound + clear model fields + tail
 *   else                   → return (no-op)
 *
 * Tail (both WALL and GROUND paths): virtual call + m_bLanded = 1.
 */

// ---- External stubs (resolved in D.4) -----------------------------------
type edict_t = any;
type entvars_t = any;
type CTSGroundWeapon = any;
declare const sv_gravity: { value: number };
declare const gravConst: number;
declare const landingSample: string;
declare const defaultVolume: number;
declare const defaultAttenuation: number;
declare function EMIT_SOUND_DYN(
  entity: edict_t,
  channel: number,
  sample: string,
  volume: number,
  attenuation: number,
  flags: number,
  pitch: number,
  ...extra: any[] // TS pushes8 dwords; demangled sig takes 7 — see TODO
): void;

// ---- Fall ---------------------------------------------------------------
export function Fall(this: CTSGroundWeapon): void {
  const pev: entvars_t = this.pev;

  // ---- Gravity integration -------------------------------------------
  // asm: fld QWORD [GOT_const]; fadd DWORD sv_gravity->value;
  //      fstp DWORD [pev+0x104]
  // The QWORD source is a folded double constant. TS entvars_t is
  // extended past HLSDK's standard; offset 0x104 is unconfirmed.
  // TODO(asm-ambiguous): pev+0x104 is unknown. Could be velocity.z
  // (non-standard layout), gravity2, friction, or a TS float field.
  (pev as any)[0x104 >>> 2] = (gravConst as number) + sv_gravity.value;

  // ---- Branch on spawnflag bytes -------------------------------------
  // asm: test BYTE [pev+0x1a0], 0x10   (onWall)
  //      test BYTE [pev+0x1a5], 0x02   (dropGround)
  // The two bytes are 5 bytes apart → two distinct byte fields,
  // NOT bit-fields of one int.
  // TODO(asm-ambiguous): pev+0x1a0 and pev+0x1a5 identities
  // unconfirmed — likely TS-specific flag bytes in extended
  // entvars_t, not standard spawnflags.
  const onWall     = ((pev as any)[0x1a0] & 0x10) !== 0;
  const dropGround = ((pev as any)[0x1a5] & 0x02) !== 0;

  // Early-return guard: neither flag set and not yet landed.
  if (!onWall && !dropGround && !this.m_bLanded) {
    return;
  }

  // ---- WALL-only: pin to wall on first landing ------------------------
  if (onWall && !this.m_bLanded) {
    this.PutOnWall();
  }

  // ---- Play landing sound (both paths) -------------------------------
  // asm pushes 8 dwords but the demangled EMIT_SOUND_DYN symbol
  // takes 7 — the 8th push is unaccounted for. The asm is the
  // source of truth, so we pass 8 and flag the discrepancy.
  // TODO(asm-ambiguous):
  //   - [pev+0x208] is the edict pointer (presumably
  //     pContainingEntity, but HLSDK standard offset is 0x17C —
  //     TS-extended entvars_t is plausible since 0x208 sits at
  //     the tail of the struct).
  //   - Channel 6 isn't a standard HL channel.
  //   - 8th push ([GOT_const_0xec2c]) doesn't appear in the
  //     demangled sig; possibly stack padding or a TS wrapper  //     extension.
  EMIT_SOUND_DYN(
    (pev as any)[0x208 >>> 2],     // edict (TS-extended)
    6,                              // channel
    landingSample,                  // sample
    defaultVolume,                  // volume
    defaultAttenuation,             // attenuation
    0,                              // flags
    100,                            // pitch (PITCH_NORM)
    /* 8th push: see TODO */ null  );

  // ---- GROUND-only: clear the model fields ---------------------------
  // asm: mov DWORD [pev+0x50], 0; mov DWORD [pev+0x58], 0
  // Hides the world-spawned weapon model.
  // TODO(asm-ambiguous): 0x50 / 0x58 likely modelindex / model
  // (string_t) in standard entvars_t, but unconfirmed.
  if (!onWall) {
    (pev as any)[0x50 >>> 2] = 0;
    (pev as any)[0x58 >>> 2] = 0;
  }

  // ---- Common tail: 4-arg virtual call + mark landed -----------------
  // asm:
  //   mov eax, [this+0x60]       ; vtable-like pointer
  //   push esi                    ; this
  //   call [eax+0x114]            ; vtable slot 0x114/4 = 69
  //   mov BYTE [this+0x64], 0x1   ; m_bLanded = true
  //
  // CRITICAL: this is NOT a 0-arg + this call. After EMIT_SOUND_DYN
  // cleaned up only 5 of its 8 pushes (`add esp, 0x14`), the
  // virtual call sees 4 dwords on stack: (this, int 0, int 100,
  // ptr_from_GOT). So the called function signature is
  // (this, int=0, int=100, ptr) — a TS-specific dispatcher, not
  // scheduleNextThink.
  // TODO(asm-ambiguous): vtable+0x114 identity unknown. The 4-arg
  // shape rules out CBaseEntity::Think. Plausible candidates:
  // playback-event, sound-think wrapper, or a custom TS message  // dispatch. Resolve in D.4 via the class sibling table.
  this.unknownVirtual_0x114(0, 100, /* ptr from GOT */ null);
  this.m_bLanded = true;
}
