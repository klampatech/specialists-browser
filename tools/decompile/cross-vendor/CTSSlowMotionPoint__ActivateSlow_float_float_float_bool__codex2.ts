// Ambient placeholder for the engine's globalvars_t singleton. The
// disassembly reaches it via a double-indirect GOT load
//   mov eax, [ebx + 0x1600]   ; GOT slot for the gpGlobals pointer
//   mov eax, [eax]            ; gpGlobals itself (already a pointer)
//   fadd [eax]                ; gpGlobals->time (offset 0 in globalvars_t)
// so D.5's engine bindings should drop in for this declaration unchanged.
// TODO(D.5): replace with the real binding once the engine interface is
// wired up (see hlsdk-goldsrc-interface.md § "globalvars_t").
declare const gpGlobals: { time: number; [k: string]: any };

/**
 * CTSSlowMotionPoint::ActivateSlow — arms this slow-motion point entity
 * with the given parameters. The disassembly performs:
 *
 *   fadd [gpGlobals.time] + flStartTime    -> this+0xe8 (m_flStartTime)
 *   flDuration                             -> this+0xec (m_flDuration)
 *   flSlowAmount                           -> this+0xf0 (m_flSlowAmount)
 *   bReset                                 -> this+0xf4 (m_bReset)
 *
 * Field names + offsets are inferred from the operations; D.4 (TS source
 * discovery) will confirm or rename `m_flStartTime` / `m_flDuration` /
 * `m_flSlowAmount` / `m_bReset`. Offsets are exact.
 *
 * Demangled signature: `CTSSlowMotionPoint::ActivateSlow(float, float, float, bool)`
 */
export function ActivateSlow(
  this: CTSSlowMotionPoint,
  flDuration: number,
  flStartTime: number,
  flSlowAmount: number,
  bReset: boolean,
): void {
  this.m_flStartTime = gpGlobals.time + flStartTime;
  this.m_flDuration = flDuration;
  this.m_flSlowAmount = flSlowAmount;
  this.m_bReset = bReset;
}
