// Ambient engine symbols loaded via i386 PIC into ebx. These reflect live
// engine state at *call time*, not compile-time constants — replace with
// `CVAR_GET_FLOAT` / `gpGlobals->*` / `cvar->value` lookups once the
// engine-callback layer is wired up.
//
// Identity caveats (the asm gives us addresses, not names):
//   - `[ebx+0x1600]` is a *pointer* that's derefed once before each use,
//     so the value is the first field of a struct reachable through that
//     pointer. Candidates:
//       * `gpGlobals->time`    (time is offset 0 of `globalvars_t`)
//       * `sv_gravity->value`  (would require a non-standard `cvar_t`
//                               layout where `value` is at offset 0 —
//                               standard HL1 puts `name` at offset 0).
//   - `[ebx-0x6ecd8]` is loaded with `fld QWORD`, so it's a true 8-byte
//     IEEE double, NOT a float pair and NOT a 4-byte float. Candidates:
//     a static double in .rodata, `sv_gravity` cached as `double`, or a
//     tick-rate constant stored as double.
declare const frameTime: number;        // `[ebx-0x6ecd8]` — true f64 (TODO)
declare const sv_gravity: number;       // `[ebx+0x1600][0]` — f32 chain-deref (TODO)
declare function UTIL_Remove(ent: CTSAmmoPack): void;

/**
 * `CTSAmmoPack::Fall` — per-tick physics step for the ammo pack entity.
 *
 * Disassembly at `0x00091544` (123 bytes) decomposes into three blocks:
 *   1. `pev->flFallVel = (f64)[ebx-0x6ecd8] + (f32)[[ebx+0x1600]]`
 *   2. If `pev->flags & 0x2`: zero `pev->velocity.x` and
 *      `pev->velocity.z`, leaving `pev->velocity.y` untouched, then
 *      dispatch `OnGround()`.
 *   3. If `[esi+0xa4] < (f32)[[ebx+0x1600]]` (same float as block 1):
 *      call `UTIL_Remove(this)`.
 */
export function Fall(this: CTSAmmoPack): void {
  const pev = this.pev;

  // Capture the chain-loaded float once — the asm loads it twice (block 1
  // and block 3), so the same expression must serve both call sites.
  const chainVal = sv_gravity;

  // ----- Block 1: fall-velocity update ----------------------------------
  // `fld QWORD [ebx-0x6ecd8]`  → double onto x87 stack
  // `fadd DWORD [eax]`         → add (eax = *(*[ebx+0x1600]))
  // `fstp DWORD [edx+0x104]`   → truncate back to float, store as flFallVel
  // pev.flFallVel = frameTime + chainVal
  pev.flFallVel = frameTime + chainVal;

  // ----- Block 2: landing handler ---------------------------------------
  // `test BYTE [eax+0x1a5], 0x2` / `je 91598`
  // Standard HL1 FL_ONGROUND = 1<<0 (mask 0x1). Mask 0x2 is FL_FLY (1<<1)
  // in vanilla HL1, or a TS-specific flag (e.g., a partially-grounded
  // state, an OpFor-style FL_PARTIALGROUND, or a CTSAmmoPack custom flag).
  // TODO(asm-ambiguous): confirm the 0x2 bit against the mod's flag map.
  if ((pev.flags & 0x2) !== 0) {
    // The asm zeros [pev+0x50] and [pev+0x58] but skips [pev+0x54] — i.e.,
    // velocity.x and velocity.z are cleared while velocity.y is left alone.
    // Odd for a "landed" handler (usually you'd clear all of velocity or
    // just z), but it's what's in the binary.
    pev.velocity.x = 0;
    pev.velocity.z = 0;
    this.OnGround();
  }

  // ----- Block 3: auto-despawn ------------------------------------------
  // `fcomp DWORD [edx]` / `fnstsw ax` / `sahf` / `jae 915b9`
  // → branch taken when ST(0) >= memory, i.e. when [esi+0xa4] < chainVal.
  // The field at +0xa4 is unknown. m_fDieTime is a placeholder; the
  // "compare and remove" idiom is much more naturally expressed as a die
  // timer, a think-threshold, or a fall-distance accumulator than as a
  // literal fall velocity.
  // TODO(asm-ambiguous): identify the field — candidates `m_flDieTime`,
  //       `m_flNextThink`, or a fall-distance accumulator.
  if (this.m_fDieTime < chainVal) {
    UTIL_Remove(this);
  }
}
