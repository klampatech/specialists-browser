/**
 * GetEntityAPI — legacy DLL export. The GoldSrc engine calls this
 * once on load to discover the gameplay functions (Spawn, Think,
 * Touch, ...) the TS DLL implements.
 *
 * Validates the engine's interface version (must equal
 * INTERFACE_VERSION = 140). On success, copies the static
 * gFunctionTable function-pointer table (50 entries, 200 bytes)
 * into the engine-provided buffer and returns 1. Returns 0 if
 * the buffer is null or the version doesn't match.
 *
 * Legacy variant: interfaceVersion is passed by VALUE (not by
 * pointer), so there is no assignment-back on the failure path.
 * Use GetEntityAPI2 for the modern by-pointer contract.
 *
 * NOTE: The50-entry source table is the static `gFunctionTable`
 * symbol in ts_i386.so. Its contents are populated from the .so in
 * a later D-step; this stub emits the correct loop structure but
 * the per-slot values are placeholders.
 */
export function GetEntityAPI(
  pFunctionTable: any, // TODO: DLL_FUNCTIONS* once engine types land
  interfaceVersion: number,
): number {
  // Disassembly: cmp [esp+0x10],0x0 ; je fail ; cmp [esp+0x14],0x8c ; je copy
  if (pFunctionTable == null || interfaceVersion !== INTERFACE_VERSION) {
    return 0;
  }

  // Disassembly: lea esi,[ebx-0x5fd30] (gFunctionTable, GOT-relative)
  //              mov ecx,0x32          ; rep movsd               ; mov eax,0x1
  //50 dwords = 200 bytes = dllfuncs_t size for INTERFACE_VERSION 140.
  // TODO(D.5): replace placeholder source with the real gFunctionTable
  // contents extracted from ts_i386.so.
  const gFunctionTable: any = undefined;
  for (let i = 0; i < 0x32; i++) {
    (pFunctionTable as any)[i] = gFunctionTable[i];
  }

  return 1;
}
