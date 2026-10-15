```typescript
/**
 * GiveFnptrsToDll — engine DLL entry function.
 *
 * Half-Life's engine calls this once at DLL load time to hand the DLL:
 *   (a) the engine function pointer table (enginefuncs_t* — 155 dwords
 *       = 620 bytes / 0x9b)
 *   (b) a pointer to the engine's globalvars_t
 *
 * Behavior:
 *   1. Copy 155 dwords from `pFunctionTable` into the DLL's local
 *      enginefuncs_t buffer. The destination address is held at
 *      GOT+0x1aa8 (a pointer-to-buffer indirection).
 *   2. Store `pGlobals` into the globalvars_t* slot reachable through
 *      GOT+0x1600. The asm emits a double dereference here
 *      (`mov eax, [GOT+0x1600]; mov [eax], edx`), so GOT+0x1600 holds
 *      the *address* of the slot, not the slot itself.
 *
 * asm:
 *   push edi; push esi; push ebx
 *   call $+5; pop ebx; add ebx, 0xad578          ; PIC: GOT base
 *   mov  esi, [esp+0x10]                        ; arg1 = pFunctionTable
 *   mov  edx, [esp+0x14]                        ; arg2 = pGlobals
 *   mov  edi, [ebx+0x1aa8]                      ; dst buffer address
 *   cld; mov ecx, 0x9b; rep movsd               ; copy 155 dwords
 *   mov  eax, [ebx+0x1600]                      ; slot address
 *   mov  [eax], edx                             ; *slot = pGlobals
 *   pop ebx; pop esi; pop edi; ret
 *
 * @param pFunctionTable  Source: enginefuncs_t* (155 dwords)
 * @param pGlobals        Source: globalvars_t*
 */
export function GiveFnptrsToDll(
  pFunctionTable: any, // enginefuncs_t* — 155 dwords of engine function pointers
  pGlobals: any        // globalvars_t*
): void {
  // 1) Copy 155 dwords of engine function pointers into the DLL's
  //    local enginefuncs_t buffer. The destination address is held
  //    at GOT+0x1aa8 (a pointer-to-buffer indirection).
  //
  //    C++ equivalent:
  //      memcpy(&g_engfuncs, pFunctionTable, sizeof(enginefuncs_t));
  //
  //    TODO(asm-ambiguous): enginefuncs_t struct layout is not yet
  //    known to TS; the buffer length is hard-coded as 0x9b dwords
  //    (= 620 bytes) here. Replace with a struct copy once the type
  //    is defined.
  //
  // const engineFuncsTable: Uint32Array = GOT[0x1aa8];   // dst ptr
  // for (let i = 0; i < 0x9b; i++) {
  //   engineFuncsTable[i] = (pFunctionTable as Uint32Array)[i];
  // }

  // 2) Store pGlobals into the globalvars_t* slot reachable through
  //    GOT+0x1600. Note the asm does a double dereference:
  //
  //      mov eax, [GOT+0x1600]   ; eax = address of slot
  //      mov [eax], edx          ; *eax = pGlobals
  //
  //    So GOT+0x1600 holds the *address* of the slot, not the slot  //    itself. C++ equivalent:
  //
  //      gpGlobals = pGlobals;
  //
  //    TODO(asm-ambiguous): confirm whether GOT+0x1600 is `&gpGlobals`
  //    (a direct pointer-to-pointer variable) or some other indirection.
  //    The asm clearly emits two dereferences, so the underlying intent
  //    is "store pGlobals at the slot whose address is at GOT+0x1600".
  //
  // const globalsSlotAddr: any = GOT[0x1600];   // address of slot
  // (globalsSlotAddr as any)[0] = pGlobals;

  // The actual memcpy + store are performed at the C++/CheerpX
  // boundary; this TS function exists as the typed entry point that
  // the engine calls into. No body needed in TS.
  void pFunctionTable;
  void pGlobals;
}
```
