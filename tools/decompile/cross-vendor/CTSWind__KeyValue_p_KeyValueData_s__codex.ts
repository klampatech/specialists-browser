```typescript
/**
 * CTSWind::KeyValue — consumes "windx" / "windy" / "windz" entity key-value pairs.
 *
 * Compares `pkvd.szKeyName` case-insensitively against the three wind
 * component keys. On a match, parses `pkvd.szValue` as a float (the asm
 * routes through glibc's `__strtod_internal(nptr, NULL, 0)` — equivalent
 * to `parseFloat` with no locale grouping) and writes it into the matching
 * wind component on the entity. Sets `pkvd.fHandled = 1` when a key is
 * consumed; otherwise sets it to 0 so the engine falls through to the
 * next handler in the chain.
 *
 * Field map inferred from disassembly:
 *   this.windx @ +0x64, this.windy @ +0x68, this.windz @ +0x6c (floats)
 *   pkvd.szKeyName @ +0x4, pkvd.szValue @ +0x8, pkvd.fHandled @ +0xc
 *
 * @param this  The CTSWind entity instance (edi in asm)
 * @param pkvd  The KeyValueData_s the engine is asking us to consume (esi in asm)
 * @returns     void
 */
export function KeyValue(
  // TODO(D.4): type these as `CTSWind` and `KeyValueData_s` once the class is defined
  this: any,
  pkvd: any,
): void {
  const key = pkvd.szKeyName;

  if (strcasecmp(key, "windx") === 0) {
    this.windx = parseFloat(pkvd.szValue);
    pkvd.fHandled = 1;
    return;
  }

  if (strcasecmp(key, "windy") === 0) {
    this.windy = parseFloat(pkvd.szValue);
    pkvd.fHandled = 1;
    return;
  }

  if (strcasecmp(key, "windz") === 0) {
    this.windz = parseFloat(pkvd.szValue);
    pkvd.fHandled = 1;
    return;
  }

  pkvd.fHandled = 0;
}
```
