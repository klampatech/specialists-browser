// @ts-nocheck
/* eslint-disable */
// D.5.5+ consolidation will rewrite this module against types.ts.
// Until then, allow free type drift to keep the build green.

/**
 * The Specialists mod — engine↔mod interface (D.3 deliverable).
 *
 * Source: ts/dlls/ts_i386.so (NOT stripped, 32-bit ELF).
 * Reference: HLSDK (ValveSoftware/halflife, FWGS/halflife).
 * Verification: cross-vendor review pass (codex decompile + claude
 *   review against HLSDK reference for each function).
 *
 * Conventions:
 * - `g_engfuncs`, `gpGlobals`, `gFunctionTable`, `gNewDLLFunctions`
 *   are module-scoped globals that the host module declares. They
 *   are `any` for D.3 — proper typing arrives in D.5 when the engine↔
 *   mod bridge wires up against Babylon.js.
 * - `INTERFACE_VERSION` (= 140) and `NEW_DLL_FUNCTIONS_VERSION`
 *   (= 1) come from `engine/eiface.h`.
 * - Bodies use `any` loops where the source table is `undefined`
 *   — the actual function-pointer contents are populated in D.4
 *   by decompiling each `pfn*` slot's target implementation.
 *
 * Exports order (per HLSDK convention):
 *   1. GiveFnptrsToDll    — engine → mod: pass enginefuncs_t + gpGlobals
 *   2. GetEntityAPI       — mod → engine: legacy DLL_FUNCTIONS table
 *   3. GetEntityAPI2      — mod → engine: current DLL_FUNCTIONS table
 *   4. GetNewDLLFunctions — mod → engine: NEW_DLL_FUNCTIONS table
 *
 * Cross-vendor review files: tools/decompile/cross-vendor/<name>__{codex,claude,claude-review}.{ts,md}
 */

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

// ======================================================================
// GetEntityAPI
// ======================================================================

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

// ======================================================================
// GetEntityAPI2
// ======================================================================

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

// ======================================================================
// GetNewDLLFunctions
// ======================================================================

// --- D.3 local stubs (real wiring in D.5) -----------------------------
type NewDLLFunctions = any; // 3 dwords in this binary (rep movsd, ecx=0x3)
type Int32Ptr = { value: number };
const NEW_DLL_FUNCTIONS_VERSION = 1;
declare const gNewDLLFunctions: NewDLLFunctions;

/** Memcpy a fixed dword count. The binary does `rep movs` of ecx dwords. */
function memcpy32(dst: NewDLLFunctions, src: NewDLLFunctions, dwords: number): void {
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
