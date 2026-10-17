// ---------------------------------------------------------------------------
// CTSGun::ScaleSpread — disassembly rebuild (`ScaleSpread__6CTSGunRffi`
// at 0x702a8, 364 bytes). Mirrors control-flow chunks 0x702a8..0x70413:
//
//   (1) if (flag)        pSpread *= SPECIAL_FIRE_SPREAD_MULT
//   (2) if (scale <= SCALE_CUTOFF) return
//   (3) recoilScale = BASE_RECOIL_SCALE
//                  * (DoubleFireRate(m_pPlayer) ? DOUBLE_FIRE_RECOIL_MULT : 1)
//                  * (flag ? SPECIAL_FIRE_RECOIL_MULT : 1)
//   (4) if (delta < SPREAD_FLAG_CLEAR_DELTA) { sf=0; ts=now; return }
//   (5) pSpread += m_pPlayer.recoilAccumulator
//   (6) stability = m_pPlayer.vtable[0x10](m_pPlayer)   // D.4: name slot 4
//       correctedDelta = stability * delta
//       if (correctedDelta >= RECOIL_DURATION) {
//         spreadFlag = 0;
//         correctedDelta = CD_RECOMPUTE_FACTOR * RECOIL_DURATION;
//       }
//   (7) if (correctedDelta < RECOIL_DURATION) {
//         accum = (rd - cd) * scale * recoilScale + recoilAccumulator;
//         accum = min(accum, RECOIL_ACCUM_MAX);
//         recoilAccumulator = accum;
//       }
//   (8) lastSpreadTime = now
//
// Cvar slots map 1:1 to disassembly GOT offsets and are deliberately `NaN` so a
// missing cvar blows up loudly rather than silently using 0x68 (= 104), which
// was corrupting every multiplier and clamp on the first frame.
// ---------------------------------------------------------------------------

// One cvar / constant per GOT slot.
const SPECIAL_FIRE_SPREAD_MULT: number = NaN; // GOT[-0x6df10]
const SCALE_CUTOFF:               number = NaN;// GOT[-0x6f408]
const BASE_RECOIL_SCALE:          number = NaN;// GOT[-0x6df4c]
const DOUBLE_FIRE_RECOIL_MULT:    number = NaN;// GOT[-0x6ec2c]
const SPECIAL_FIRE_RECOIL_MULT:   number = NaN;// GOT[-0x6df0c]
const RECOIL_DURATION:            number = NaN;// GOT[-0x6f3fc]
const SPREAD_FLAG_CLEAR_DELTA:    number = NaN;// GOT[-0x6f3f4]
const CD_RECOMPUTE_FACTOR:        number = NaN;// GOT[-0x6f010] (QWORD)
const RECOIL_ACCUM_MAX:           number = NaN;// GOT[-0x6ecd8] (QWORD)

// Compile-isolation stubs (D.5 will replace with real imports).
declare const gpGlobals: { time: number };
declare function DoubleFireRate(player: any): number;
type CBasePlayer = any; // [eax+0x60] vtable, [eax+0x778] recoilAccumulator
type CTSGun      = any; // [esi+0x80] m_pPlayer, [esi+0x9e8] lastSpreadTime, [esi+0x9ec] spreadFlag

/**
 * Per-shot spread + recoil accumulator.
 *
 * Demangled signature is `(r ?, float, float, int)` (4 args + implicit
 * `this`). The body only references 3 args; the 4th is kept here as
 * `_unused` so the TS signature matches the demangled symbol and the
 * ABI still lines up if the binary later grows a reference to it.
 */
export function ScaleSpread(
  this: CTSGun,
  pSpread: number, // float& — `[esp+0x34]`, in/out via `fld/fstp [edi]`
  scale:   number, // float   — `[esp+0x38]`
  _unused: number, // float   — demangler's 4th arg; body never reads it
  flag:    number, // int     — `[esp+0x3c]`
): void {
  // (1) Special-fire: pre-scale the spread.
  if (flag !== 0) {
    pSpread *= SPECIAL_FIRE_SPREAD_MULT;
  }

  // (2) Below the cutoff the original simply returns — no timestamp update.
  if (scale <= SCALE_CUTOFF) {
    return;
  }

  // (3) Compose the per-shot recoil factor.
  let recoilScale = BASE_RECOIL_SCALE;
  if (DoubleFireRate(this.m_pPlayer)) {
    recoilScale *= DOUBLE_FIRE_RECOIL_MULT;
  }
  if (flag !== 0) {
    recoilScale *= SPECIAL_FIRE_RECOIL_MULT;
  }

  // (4) Tiny inter-call delta: refresh timestamp + clear the flag.
  const currentTime = gpGlobals.time;                      // GOT[+0x1600]
  const delta       = currentTime - this.lastSpreadTime;   // [esi+0x9e8]
  if (delta < SPREAD_FLAG_CLEAR_DELTA) {
    this.spreadFlag     = 0;                               // [esi+0x9ec]
    this.lastSpreadTime = currentTime;
    return;
  }

  // (5) Fold the player's recoil accumulator into this shot's spread.
  pSpread += this.m_pPlayer.recoilAccumulator;             // [eax+0x778]

  // (6) Stability factor from vtable[4] of m_pPlayer, then correct delta by it.
  // TODO(asm-ambiguous): `call [edx+0x10]` at 0x7038d returns a float.
  // D.4 should map this vtable slot to a concrete method name on CBasePlayer+.
  const stability = (this.m_pPlayer as any).vtable[0x10]?.(this.m_pPlayer) ?? 0;
  let correctedDelta = stability * delta;

  // Rebound path: if we blew past the recoil window this frame, clear the
  // flag and recompute correctedDelta for the next iteration.
  if (correctedDelta >= RECOIL_DURATION) {
    this.spreadFlag = 0;
    correctedDelta  = CD_RECOMPUTE_FACTOR * RECOIL_DURATION;
  }

  // (7) Accumulate new recoil, clamped to the cap.
  if (correctedDelta < RECOIL_DURATION) {
    let accum = (RECOIL_DURATION - correctedDelta) * scale * recoilScale;
    accum    += this.m_pPlayer.recoilAccumulator;
    accum     = Math.min(accum, RECOIL_ACCUM_MAX);
    this.m_pPlayer.recoilAccumulator = accum;
  }

  // (8) Refresh timestamp for the next call.
  this.lastSpreadTime = currentTime;
}
