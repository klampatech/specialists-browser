// --- D.3 local stubs (real wiring in D.5) -----------------------------
type NewDLLFunctions = any; // 3 dwords in this binary (rep movsd, ecx=0x3)
type Int32Ptr = { value: number };
const NEW_DLL_FUNCTIONS_VERSION = 1;
declare const gNewDLLFunctions: NewDLLFunctions;

/** Memcpy a fixed dword count. The binary does `rep movs` of ecx dwords. */
export function memcpy32(dst: NewDLLFunctions, src: NewDLLFunctions, dwords: number): void {
  // D.3 stub — assumes identical layout, real impl lands in D.5
  // alongside the typed NewDLLFunctions struct.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (dst as any) = src;
}
// ------------------------------------------------------------------------

/**
 * (unknown)::GetNewDLLFunctions — GoldSrc NEW_DLL_FUNCTIONS handshake.
 *
 * Engine calls this to negotiate the extended DLL-function interface
 * version and copy the static table of post-2001 server-DLL function
 * pointers this mod implements (3 of the canonical 5:
 * pfnOnFreeEntPrivateData, pfnGameShutdown, pfnShouldCollide —
 * per the `rep movsd; ecx=0x3` count in the asm).
 *
 * @param pFunctionTable   Engine-allocated buffer we fill with our table.
 * @param interfaceVersion [in/out] engine's version on entry; we
 *                          overwrite with our version on mismatch.
 * @returns                1 (TRUE) on version match, 0 (FALSE) on
 *                          NULL table or version mismatch.
 */
export function GetNewDLLFunctions(
  pFunctionTable: NewDLLFunctions | null,
  interfaceVersion: Int32Ptr | null,
): number {
  // Asm: `cmp [esp+0x10],0x0; jne <mismatch-or-success>`
  if (pFunctionTable === null) {
    // TODO(asm-ambiguous): asm issues `call [edx+0xf4]` here from a
    // vtable at [ebx+0x1aa8] before returning 0. HLSDK reference omits
    // the call (just returns FALSE). D.4 should confirm whether the
    // TS binary's helper is reachable; if not, drop it.
    return 0;
  }

  // Asm: `cmp [esi],0x1; je <success>`
  if (interfaceVersion!.value === NEW_DLL_FUNCTIONS_VERSION) {
    // Asm: `rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]` with ecx=0x3
    memcpy32(pFunctionTable, gNewDLLFunctions, 3); // 12 bytes
    return 1;
  }

  // Asm: writes 1 to *interfaceVersion AFTER the engine vtable call.
  interfaceVersion!.value = NEW_DLL_FUNCTIONS_VERSION;
  return 0;
}
