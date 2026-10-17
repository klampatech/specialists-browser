// Ambient engine globals — values loaded via PIC/GOT from the original DLL.
// TODO(D.5/D.6): replace with CVAR_GET_FLOAT("sv_gravity") and
//       gpGlobals->frametime accessors once the engine-callback layer
//       is wired up.
declare const frameTimeGlobal: number; // static double at [ebx-0x6ecd8] — meaning unverified
declare const sv_gravity: number;      // cvar float at [*[ebx+0x1600]]
declare function UTIL_Remove(ent: CTSAmmoPack): void;

/**
 * CTSAmmoPack::Fall — per-tick physics for the ammo pack entity.
 *
 * 1. Initialize pev->flFallVel from a static double plus sv_gravity.
 * 2. If the partial-ground flag is set, clear modelindex + frame and
 *    dispatch OnGround.
 * 3. If an internal class counter falls below sv_gravity, remove the
 *    entity.
 *
 * @param this  CTSAmmoPack instance (`this` passed implicitly per C++ thiscall).
 * @returns     void
 */
export function Fall(this: CTSAmmoPack): void {
  const pev = this.pev;

  // pev->flFallVel = (double)<static> + (float)sv_gravity->value
  // ASM: fld  QWORD [ebx-0x6ecd8]
  //      fadd DWORD [eax]            ; eax = *(*[ebx+0x1600]) = sv_gravity
  //      fstp DWORD [edx+0x104]      ; edx = this->pev
  // TODO(asm-ambiguous): confirm [ebx-0x6ecd8] is gpGlobals->frametime
  //       (widened to double) vs. some other integration constant.
  pev.flFallVel = frameTimeGlobal + sv_gravity;

  // If the partial-ground flag is set, zero modelindex + frame and
  // dispatch OnGround.
  //
  // ASM:
  //   mov   eax, [esi]              ; eax = this->pev
  //   test  BYTE [eax+0x1a5], 0x2
  //   je    skip
  //   mov   DWORD [eax+0x50], 0     ; *** was misinterpreted as velocity.x ***
  //   mov   eax, [esi]
  //   mov   DWORD [eax+0x58], 0     ; *** was misinterpreted as velocity.z ***
  //   call  OnGround__11CTSAmmoPack@plt
  //
  // The asm writes to pev+0x50 and pev+0x58. In standard HL entvars_t,
  // those are `modelindex` (0x50) and `frame` (0x58), NOT velocity
  // components (velocity is 0x20-0x2b). Confirmed against the
  // community HLSDK offsets and the class context table.
  //
  // TODO(asm-ambiguous): the `test BYTE` + mask 0x2 is unusual for
  //   4-byte flags. If pev->flags is at 0x1a4 (standard layout), the
  //   byte-at-+1 + mask-0x2 test is the compiler's encoding of
  //   `flags & 0x200` (FL_PARTIALGROUND, bit 9). Update the mask once
  //   the TS mod's flag field offset is confirmed; if the TS mod has
  //   a 1-byte custom flag at 0x1a5 with bit 1 = "partial ground",
  //   leave it as & 0x2 and adjust the comment.
  if ((pev.flags as number & 0x200) !== 0) {
    pev.modelindex = 0;   // asm: [pev+0x50] = 0
    pev.frame      = 0;   // asm: [pev+0x58] = 0
    this.OnGround();
  }

  // If a CTSAmmoPack member at class+0xa4 drops below sv_gravity,
  // remove the entity.
  //
  // ASM:
  //   fld   DWORD [esi+0xa4]
  //   fcomp DWORD [*sv_gravity]
  //   jae   skip
  //   call  UTIL_Remove
  //
  // Note: esi is `this`, not `pev`; the offset 0xa4 is in the class
  // layout, NOT in pev. Naming this `m_fFallVel` would collide with
  // the standard pev->flFallVel symbol above. Keep TODO until
  // CreateAmmoPack/Spawn disassembly reveals the field's role
  // (airtime? bounce count? fall-start timestamp?).
  // TODO(asm-ambiguous): confirm field purpose; rename `m_flAirTime`
  //       or similar once known.
  if ((this as any).m_fUnknown_a4 < sv_gravity) {
    UTIL_Remove(this);
  }
}
