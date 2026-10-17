```typescript
/**
 * CTSGameRules::IsCTB — returns whether the level contains at least
 * one CTB-mode entity. Gated on the gameplay-mode byte at offset 0
 * being CTB (1); inside the CTB branch the answer is computed lazily
 * by scanning the entity list for the CTB classname (via
 * UTIL_FindEntityByClassname) and then cached on the rules object, so
 * later calls reuse the cached byte instead of re-scanning.
 *
 * @param this  The CTSGameRules rules entity instance (this in the original C++)
 * @returns     boolean — true if a CTB entity is present, false otherwise
 */

// Minimal stub so the export compiles in isolation. The full
// CTSGameRules interface is rebuilt in the D.4 task.
// TODO: replace this stub with the real CTSGameRules interface.
interface CTSGameRules {
  /** mode discriminator byte at offset 0 (1 == CTB) */
  field_0: number;
  /** cached "exists" byte at offset 0x5890 (set after the first scan) */
  ctbCacheResult: number;
  /** cache-validity byte at offset 0x5891 (1 once the scan has run) */
  ctbCacheValid: number;
}

// External engine helper; real signature lives in the Half-Life SDK.
declare function UTIL_FindEntityByClassname(
  pStartEntity: any,
  classname: string
): any;

export function IsCTB(this: CTSGameRules): boolean {
  // Gate: the mode discriminator byte at offset 0 must equal CTB (1).
  if (this.field_0 !== 1) {
    return false;
  }

  // Cache hit: if the validity byte at offset 0x5891 is set, reuse the
  // cached answer from offset 0x5890 instead of re-scanning the list.
  if (this.ctbCacheValid !== 0) {
    return this.ctbCacheResult !== 0;
  }

  // First evaluation: scan the entity list. Args are pushed in
  // right-to-left cdecl order — classname first, then pStart = 0
  // (NULL, meaning "start from the head of the entity list"). The
  // classname pointer is loaded from rodata via the GOT base:
  //   lea eax, [ebx - 0x6e70d]
  // TODO(asm-ambiguous): the literal classname string the GOT base
  //       resolves to is not included in this chunk.
  const found = UTIL_FindEntityByClassname(
    /* pStartEntity */ null,
    /* classname */ "ts_ctb_*"
  );

  // setne semantics: store (found != null ? 1 : 0) into the cache byte.
  this.ctbCacheResult = found != null ? 1 : 0;
  // Mark the cache valid so subsequent calls skip the scan.
  this.ctbCacheValid = 1;
  return this.ctbCacheResult !== 0;
}
```
