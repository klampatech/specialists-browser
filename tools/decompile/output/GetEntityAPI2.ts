/**
 * GetEntityAPI2 — modern DLL export. The GoldSrc engine calls this
 * once on load to discover the gameplay functions (Spawn, Think,
 * Touch, ...) the TS DLL implements.
 *
 * Validates the engine's interface version (must equal
 * INTERFACE_VERSION = 140). On success, copies the static
 * gFunctionTable function-pointer table (50 entries, 200 bytes)
 * into the engine-provided buffer and returns 1. Returns 0 if
 * the buffer is null or the version doesn't match.
 *
 * Modern variant: interfaceVersion is passed by POINTER (vs. the
 * legacy GetEntityAPI which is by-value). On the failure path we
 * overwrite *interfaceVersion with the version we support so the
 * engine knows what to ask for next time.
 *
 * NOTE: The 50-entry source table is the static `gFunctionTable`
 * symbol in ts_i386.so. Its contents are populated from the .so in
 * a later D-step; this stub emits the correct loop structure but
 * the per-slot values are placeholders.
 */
export function GetEntityAPI2(
  pFunctionTable: any, // TODO: DLL_FUNCTIONS* once engine types land
  interfaceVersion: any, // TODO: int* once engine types land
): number {
  // Disassembly:
  //   mov eax, [esp+0x14]     ; interfaceVersionPtr
  //   cmp [esp+0x10], 0x0     ; pFunctionTable
  //   je fail
  //   cmp [eax], 0x8c         ; *interfaceVersion vs INTERFACE_VERSION
  //   je  copy
  // fail:
  //   mov [eax], 0x8c         ; *interfaceVersion = INTERFACE_VERSION
  //   mov eax, 0x0            ; return FALSE
  if (pFunctionTable == null || interfaceVersion[0] !== INTERFACE_VERSION) {
    interfaceVersion[0] = INTERFACE_VERSION;
    return 0;
  }

  // Disassembly:
  //   lea esi, [ebx-0x5fd30]  ; gFunctionTable (GOT-relative)
  //   cld
  //   mov ecx, 0x32           ; 50 dwords = 200 bytes
  //   mov edi, [esp+0x10]     ; pFunctionTable
  //   rep movsd               ; memcpy
  //   mov eax, 0x1            ; return TRUE
  // 50 dwords = 200 bytes = DLL_FUNCTIONS size for INTERFACE_VERSION 140.
  // TODO(D.5): replace placeholder source with the real gFunctionTable
  // contents extracted from ts_i386.so.
  const gFunctionTable: any = undefined;
  for (let i = 0; i < 0x32; i++) {
    (pFunctionTable as any)[i] = gFunctionTable[i];
  }

  return 1;
}
