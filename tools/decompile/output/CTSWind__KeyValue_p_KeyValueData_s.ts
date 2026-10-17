// TODO(asm-ambiguous): the three key string literals below// ("windx" / "windy" / "windz") are inferred from the field
// layout (x/y/z floats at +0x64/+0x68/+0x6c) and the PIC
// .rodata offsets [ebx-0x6ec87] / [ebx-0x6ec82] / [ebx-0x69117]
// shown in the disassembly. Verify against the binary's
// .rodata before treating them as authoritative.

declare function strcasecmp(s1: string, s2: string): number;

/**
 * CTSWind::KeyValue — consumes "windx" / "windy" / "windz" entity
 * key-value pairs.
 *
 * Compares `pkvd.szKeyName` case-insensitively against the three
 * wind component keys. On a match, parses `pkvd.szValue` as a float
 * (the asm routes through glibc's `__strtod_internal(nptr, NULL, 0)`
 * — equivalent to `parseFloat` with no locale grouping) and writes
 * it into the matching wind component on the entity. Sets
 * `pkvd.fHandled = 1` when a key is consumed; otherwise sets it to 0
 * so the engine falls through to the next handler in the chain.
 *
 * Field map inferred from disassembly:
 *   this.windx @ +0x64, this.windy @ +0x68, this.windz @ +0x6c (floats)
 *   pkvd.szKeyName @ +0x4, pkvd.szValue @ +0x8, pkvd.fHandled @ +0xc
 *
 * NOTE: The KeyValueData_s offsets above (@+0x4/+0x8/+0xc) differ
 * from HLSDK's canonical layout (szKeyName @ +0x0, szValue @ +0x4,
 * fHandled @ +0x8). This binary appears to add a 4-byte prefix
 * field before szKeyName — track this in HANDOFF.md for D.4.
 *
 * @param this  The CTSWind entity instance (edi in asm)
 * @param pkvd  The KeyValueData_s the engine is asking us to
 *              consume (esi in asm)
 * @returns     void
 */
export function KeyValue(
  // TODO(D.4): type these as `CTSWind` and `KeyValueData_s` once
  // the class is defined
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
