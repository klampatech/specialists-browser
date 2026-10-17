// Local stubs so this file compiles in isolation. Real types come from
// engine/eiface.h (~150 fn pointers for `enginefuncs_t`); for D.3 we
// only need the precache slot, so `any` is fine.
type CTSPowerUp = any;
const g_engfuncs: any = {}; // GoldSrc engine dispatch table

/**
 * CTSPowerUp::Precache — precaches a hardcoded asset via the GoldSrc
 * engine function table.
 *
 * Disassembly (39 B at 0x88548):
 *   PIC thunk:        ebx = 0x106610              ; GOT base for ts_i386.so
 *   mov  edx,[ebx+0x1aa8]   ; engine fn ptr (one of pfnPrecache*)
 *   lea  eax,[ebx-0x6c681]  ; eax = 0x99F8F = asset path in .rodata
 *   call [edx]              ; enginePrecache(assetPath)
 *
 * No `this` fields are read.
 *
 * @param this  CTSPowerUp entity (unused by the body)
 */
export function Precache(this: CTSPowerUp): void {
  // TODO(asm-ambiguous): pin down (a) which g_engfuncs slot corresponds
  //   to [ebx+0x1aa8] (pfnPrecacheModel / pfnPrecacheSound /
  //   pfnPrecacheGeneric — all three are identical shape from the
  //   caller's perspective), and (b) the string at .rodata 0x99F8F.
  //   The C++ body is most likely a single PRECACHE_<KIND>("…"); macro.
  g_engfuncs.pfnPrecacheModel(/* TODO(asm): string at 0x99F8F */ '');
}
