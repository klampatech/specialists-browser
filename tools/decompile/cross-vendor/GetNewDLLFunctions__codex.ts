```typescript
/**
 * (unknown)::GetNewDLLFunctions — GoldSrc NEW_DLL_FUNCTIONS interface handshake.
 *
 * Standard HLSDK callback invoked by the engine to negotiate the
 * NEW_DLL_FUNCTIONS interface version and copy the static table of
 * post-SteamPipe server-DLL function pointers this mod implements
 * (e.g. pfnOnFreeEntPrivateData, pfnGameDLLInit, pfnSpawn — the v1
 * table holds exactly 3 entries, matching the `rep movsd` count).
 *
 * @param pFunctionTable   Engine-allocated buffer we fill with our function table
 * @param interfaceVersion [in/out] engine's version on entry, our version on mismatch
 * @returns                1 (TRUE) on version match, 0 (FALSE) on NULL table or mismatch
 */
export function GetNewDLLFunctions(
  pFunctionTable: NewDLLFunctions | null,
  interfaceVersion: Int32Ptr | null,
): number {
  // Engine handed us a NULL output buffer — log via the engine's
  // interface table (call goes through [edx+0xf4] on a vtable fetched
  // from [ebx+0x1aa8]) and bail.
  if (pFunctionTable === null) {
    engineLogInterfaceMissing(INTERFACE_ID_NEW_DLL_FUNCTIONS, NEW_DLL_FUNCTIONS_NAME);
    return 0;
  }

  // Version handshake: if the engine's supported interface version
  // matches what we built against, copy the static v1 table and report
  // success.
  if (interfaceVersion!.value === NEW_DLL_FUNCTIONS_VERSION) {
    memcpy32(pFunctionTable, gNewDLLFunctions, 3); // 3 dwords = 12 bytes
    return 1;
  }

  // Version mismatch: tell the engine we only support v1 by overwriting
  // *interfaceVersion, log the mismatch, and return FALSE so the
  // engine retries (or aborts) the handshake.
  engineLogInterfaceMismatch(
    INTERFACE_ID_NEW_DLL_FUNCTIONS,
    interfaceVersion!.value,
    NEW_DLL_FUNCTIONS_VERSION,
  );
  interfaceVersion!.value = NEW_DLL_FUNCTIONS_VERSION;
  return 0;
}
```
