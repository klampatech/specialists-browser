/**
 * CTSEmitter::CheckValues — Validate this CTSEmitter's configuration
 * fields and the relevant global cvar value against acceptable ranges.
 * Emits an engine ALERT(at_warning, ...) for each validation failure.
 *
 * Original symbol: CheckValues__10CTSEmitter @ 0x000640ac (133 B)
 * Binary: ts/dlls/ts_i386.so (32-bit ELF, debug symbols intact)
 *
 * Disassembly summary:
 *   fld    [cvar]                  ; st(0) = global cvar float *   fcom   [this+0xe4]             ; cmp cvar, m_flField_0xe4 (no pop)
 *   jae    .alert1                 ; if cvar >= 0xe4, fire alert
 *   fcomp  [this+0xe8]             ; cmp cvar, m_flField_0xe8, pop
 *   test   ah, 0x1
 *   jne    .skip1                  ; if cvar < 0xe8, skip alert
 *   jmp    .alert1                 ; else fire alert
 * .alert1:
 *   pfnAlert(at_warning, msg1)     ; [ebx-0x6ec10]
 * .skip1:
 *   cmp    [this+0xec], 0
 *   jle    .alert2                 ; if field_0xec <= 0, fire alert
 *   cmp    [this+0xf0], 0
 *   jg     .done                   ; if field_0xf0 > 0, skip alert
 * .alert2:
 *   pfnAlert(at_warning, msg2)     ; [ebx-0x6ebd0]
 * .done:
 *   ret
 */

// Ambient placeholders so the function compiles in isolation.
// In the integrated build these map to:
//   CTSEmitter       — TS gameplay entity class (defined in D.4)
//   engine           — g_engfuncs (defined in D.5)
//   formatString1/2  — .rodata alert messages (defined in D.5)
//   globalCvarFloat  — GOT float, cvar-name TBD (see TODO below)
declare const CTSEmitter: any;
declare const engine: {
  pfnAlert: (atype: number, szFmt: string, ...args: any[]) => void;
};
declare const formatString1: string;
declare const formatString2: string;
declare const globalCvarFloat: number;

// HLSDK ALERT_TYPE (engine/eiface.h): at_notice=1, at_console=2,
// at_aiconsole=3, at_warning=4, at_error=5, at_logged=6.
// Both alert sites in the asm push 0x4 → at_warning.
const ALERT_WARNING = 4;

export function CheckValues(this: CTSEmitter): void {
  // Reads the global cvar float from [GOT-0x6f408]. The cvar's name
  // isn't visible in the disassembly; cross-reference
  // tools/decompile/analysis/strings-n5.txt (D.4 step) to identify it
  // (likely an emitter- or slowmotion-related cvar).
  // TODO(asm-ambiguous): identify the cvar name.
  const cvarValue: number = globalCvarFloat;

  // Floating-point fields at this+0xe4 and this+0xe8. Real names
  // unknown — the asm only exposes offsets. Treat as bounds until D.4.
  // TODO(asm-ambiguous): which is upper vs lower? The asm's two-`if`
  // structure suggests the original C++ had distinct thresholds (one
  // hard, one soft), but the OR-collapse below is behaviorally
  // equivalent in every ordering of the two fields.
  const field_0xe4: number = (this as any).m_flField_0xe4;
  const field_0xe8: number = (this as any).m_flField_0xe8;

  // Fire alert when cvarValue meets/exceeds either bound. Equivalent
  // to `cvarValue >= min(field_0xe4, field_0xe8)` regardless of which
  // bound is larger.
  if (cvarValue >= field_0xe4 || cvarValue >= field_0xe8) {
    engine.pfnAlert(ALERT_WARNING, formatString1);
  }

  // Integer fields at this+0xec and this+0xf0. Real names unknown.
  // TODO(asm-ambiguous): count, index, capacity, or something else?
  // Behavior is identical either way — alert when EITHER is
  // non-positive.
  const field_0xec: number = (this as any).m_iField_0xec;
  const field_0xf0: number = (this as any).m_iField_0xf0;

  if (field_0xec <= 0 || field_0xf0 <= 0) {
    engine.pfnAlert(ALERT_WARNING, formatString2);
  }
}
