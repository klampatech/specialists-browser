/**
 * CTSGameRules::IsCTB — returns whether the level contains at least
 * one CTB-mode entity. Gated on the gameplay-mode byte at offset 0
 * being CTB (1); inside the CTB branch the answer is computed lazily
 * by scanning the entity list for the CTB classname (via
 * UTIL_FindEntityByClassname) and then cached on the rules object, so
 * later calls reuse the cached byte instead of re-scanning.
 *
 * @param this  The CTSGameRules rules entity instance (`this` in C++)
 * @returns     boolean — true if a CTB entity is present, false otherwise
 */

// Minimal stub so the export compiles in isolation. The full
// CTSGameRules interface is rebuilt in the D.4 task; field names
// will be updated then (likely `m_iGameMode`, `m_bCTBCached`,
// `m_bCTBCacheValid` based on GoldSrc CGameRules conventions).
interface CTSGameRules {
  /** mode discriminator byte at offset 0 (1 == CTB) */
  field_0: number;
  /** cached "exists" byte at offset 0x5890 (set after the first scan) */
  ctbCacheResult: number;
  /** cache-validity byte at offset 0x5891 (1 once the scan has run) */
  ctbCacheValid: number;
}

// External engine helper; real signature in the Half-Life SDK.
declare function UTIL_FindEntityByClassname(
  pStartEntity: any,
  classname: string
): any;

/**
 * PLACEHOLDER. The disassembly loads this from rodata via
 * `lea eax, [ebx-0x6e70d]` (GOT_base - 0x6e70d = 0x0F9703). Pull the
 * actual string from the .rodata section before this ships to a
 * real engine integration — the placeholder will silently miss
 * every entity at runtime.
 */
const TS_CTB_CLASSNAME_PLACEHOLDER = "ts_ctb_*";

export function IsCTB(this: CTSGameRules): boolean {
  // Gate: mode discriminator byte at offset 0 must equal CTB (1).
  // asm: `cmp BYTE PTR [esi], 0x1` + `jne 67f57`
  // (al is preloaded to 0 from `mov al, 0x0` at 67f1d, so the
  // fall-through returns false.)
  if (this.field_0 !== 1) {
    return false;
  }

  // Cache hit: validity byte at offset 0x5891 is set → reuse the
  // cached answer from offset 0x5890 instead of re-scanning.
  // asm: `cmp BYTE PTR [esi+0x5891], 0x0` + `jne 67f51`,
  // where `67f51` loads `al = [esi+0x5890]` and returns it.
  if (this.ctbCacheValid !== 0) {
    return this.ctbCacheResult !== 0;
  }

  // First evaluation: scan the entity list. cdecl arg order is
  // (pStartEntity, classname); disassembly pushes them right-to-left:
  //   sub esp, 0x8          ; stack alignment for the call
  //   lea eax, [ebx-0x6e70d]; classname pointer (rodata)
  //   push eax              ; arg2: classname
  //   push 0x0              ; arg1: NULL pStartEntity (start from head)
  //   call UTIL_FindEntityByClassname@plt
  //   add esp, 0x10         ; clean up alignment + 2 args
  // TODO(asm-ambiguous): resolve the classname literal from rodata
  // before this lands in a real engine integration.
  const found = UTIL_FindEntityByClassname(
    /* pStartEntity */ null,
    /* classname    */ TS_CTB_CLASSNAME_PLACEHOLDER
  );

  // `setne` semantics: store (found != 0) ? 1 : 0 into the cache byte.
  this.ctbCacheResult = found != null ? 1 : 0;
  // Mark the cache valid so subsequent calls skip the scan.
  this.ctbCacheValid = 1;
  return this.ctbCacheResult !== 0;
}
