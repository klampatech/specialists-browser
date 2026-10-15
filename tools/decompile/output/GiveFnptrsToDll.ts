/**
 * GiveFnptrsToDll — engine DLL entry function.
 *
 * Half-Life's engine calls this once at DLL load time to hand the DLL:
 *   (a) the engine function pointer table (enginefuncs_t, ~155 dwords)
 *   (b) a pointer to the engine's globalvars_t
 *
 * Reference (HLSDK `dlls/h_export.cpp`):
 *   void GiveFnptrsToDll(enginefuncs_t *pengfuncsFromEngine,
 *                        globalvars_t  *pGlobals)
 *   {
 *       memcpy(&g_engfuncs, pengfuncsFromEngine, sizeof(enginefuncs_t));
 *       gpGlobals = pGlobals;
 *   }
 *
 * The asm (per tools/decompile/chunks/GiveFnptrsToDll.chunk.md)
 * implements the memcpy as `rep movsd` over 0x9b dwords and the
 * `gpGlobals` assignment as a store via a GOT-resident slot.
 */
export function GiveFnptrsToDll(
  pengfuncsFromEngine: any, // enginefuncs_t*
  pGlobals: any             // globalvars_t*
): void {
  // Copy the engine's function pointer table into our local buffer.
  // TODO(D.5): replace with a typed struct copy once enginefuncs_t
  // is defined; for D.3 a shallow copy via assignment captures the
  // rep-movsd data flow (0x9b dwords worth of function pointers).
  g_engfuncs = pengfuncsFromEngine;

  // Cache the engine's globalvars_t pointer for tick-frame access.
  gpGlobals = pGlobals;
}
