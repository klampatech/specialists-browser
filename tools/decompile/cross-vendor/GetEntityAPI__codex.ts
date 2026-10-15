```typescript
/**
 * GetEntityAPI — DLL export the GoldSrc engine calls once on load to
 * discover the gameplay functions (Spawn, Think, Touch, ...) the TS
 * DLL implements.
 *
 * Validates the engine's interface version (must equal
 * INTERFACE_VERSION, 0x8c / 140). On success, copies the static
 * dllfuncs_t function-pointer table (50 entries, 200 bytes) into the
 * engine-provided buffer and returns 1. Returns 0 if the buffer is
 * null or the version doesn't match.
 *
 * @param pFunctionTable  Engine-provided buffer to receive the
 *                        function-pointer table. Must be non-null.
 * @param interfaceVersion Must equal INTERFACE_VERSION (0x8c / 140).
 * @returns               1 on success, 0 on failure.
 */
export function GetEntityAPI(
  pFunctionTable: any, // TODO: DLL_FUNCTIONS* (dllfuncs_t*) once the engine types are defined
  interfaceVersion: number,
): number {
  if (pFunctionTable == null || interfaceVersion !== 0x8c /* INTERFACE_VERSION (140) */) {
    return 0;
  }

  // Source: static dllfuncs_t table at a GOT-relative address in the .so
  // (lea esi, [ebx - 0x5fd30] after the call/pop/add PIC setup).
  // Size: 0x32 dwords = 50 function pointers = 200 bytes — the size of
  // dllfuncs_t for INTERFACE_VERSION 140.
  // TODO(asm-ambiguous): the source buffer is the static
  // `gDllFunctionTable` symbol in the binary; the disassembly's
  // `rep movsd` is a dword-by-dword memcpy of the whole struct.
  const DLL_FUNCTION_TABLE: any = undefined; // TODO: dllfuncs_t[50] populated from the linked .so
  for (let i = 0; i < 0x32; i++) {
    (pFunctionTable as any)[i] = DLL_FUNCTION_TABLE[i];
  }

  return 1;
}
```
