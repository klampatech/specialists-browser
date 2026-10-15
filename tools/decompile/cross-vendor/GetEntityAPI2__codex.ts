```typescript
/**
 * GetEntityAPI2 — TS server-DLL export that hands the GoldSrc engine
 * the entity API function table. Performs the standard HL1 interface
 * negotiation: if the engine requested INTERFACEVERSION (0x8c / 140),
 * copy the local function-pointer table over; otherwise report the
 * version we support and fail.
 *
 * @param pFunctionTable      Engine-provided buffer for the DLL function
 *                            pointer table. May be null; if so, only the
 *                            interface version is reported.
 * @param interfaceVersionPtr Pointer to the engine-supplied interface
 *                            version. Overwritten with INTERFACEVERSION
 *                            (0x8c) on any failure path so the engine
 *                            knows what version this DLL actually wants.
 * @returns                   1 if the function table was copied
 *                            successfully, 0 otherwise.
 */
export function GetEntityAPI2(
  pFunctionTable: Int32Array | null,
  interfaceVersionPtr: Int32Array | null,
): number {
  // GoldSrc INTERFACEVERSION this build was compiled against.
  const INTERFACEVERSION = 0x8c;

  // Size of the local DLL_FUNCTIONS table in dwords (200 bytes / 4).
  // The original binary stores the table as 0x32 dwords at a fixed
  // global address (GOT base - 0x5fd30) and bulk-copies it with
  // `rep movsd` of ecx = 0x32.
  const DLL_FUNCTIONS_DWORDS = 0x32;

  if (interfaceVersionPtr === null) {
    // Caller didn't even give us a version slot; nothing we can do.
    return 0;
  }

  // No destination buffer: tell the engine what version we want
  // and bail out.
  if (pFunctionTable === null) {
    interfaceVersionPtr[0] = INTERFACEVERSION;
    return 0;
  }

  // Version mismatch: report what we actually support and bail.
  if (interfaceVersionPtr[0] !== INTERFACEVERSION) {
    interfaceVersionPtr[0] = INTERFACEVERSION;
    return 0;
  }

  // Version matches — copy our 200-byte function-pointer table over.
  // TODO(decompile): swap this placeholder for the real reconstructed
  // DLL_FUNCTIONS table once D.4 (full class reconstruction) lands.
  // The original source lives at (GOT base - 0x5fd30) as 0x32 dwords.
  const source = new Int32Array(DLL_FUNCTIONS_DWORDS);
  pFunctionTable.set(source.subarray(0, DLL_FUNCTIONS_DWORDS));
  return 1;
}
```
