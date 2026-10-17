// ----- minimal scaffolding so the snippet compiles in isolation -----
interface KeyValueData_s {
  szKeyName: string;
  szValue: string;
  fHandled: number;
}

interface CTSBriefcase {
  // TODO(actual name): +0x6c, 32-byte NUL-terminated buffer
  szModel: Uint8Array;
  // TODO(actual name): +0x68, dword
  someIndex: number;
}

declare const strcmp: (s1: string, s2: string) => number;
declare const strncpy: (dst: Uint8Array, src: string, n: number) => Uint8Array;
declare const strtol: (nptr: string, endptr: any, base: number) => number;
// ---------------------------------------------------------------------

/**
 * CTSBriefcase::KeyValue — handle one entity key/value pair from the BSP map.
 *
 * Recognized keys:
 *   "model"                       → strncpy szValue into this->szModel
 *                                   (32-byte buffer at +0x6c) and
 *                                   null-terminate at byte 31 (offset +0x8b).
 *   <unknown 8-char entity key>   → strtol(szValue) - 1, stored at this->+0x68.
 *                                   (1-indexed mapper input → 0-indexed
 *                                   internal value; almost certainly the
 *                                   body/submodel index, but exact name is
 *                                   TODO until strings-n5.txt is cross-ref'd.)
 *
 * Unrecognized keys leave keyvalue->fHandled = 0 so the engine can try the
 * next handler in the chain.
 *
 * @param this      The CTSBriefcase entity instance.
 * @param keyvalue  Engine-supplied KeyValueData_s; fHandled = 1 on consume,
 *                  0 on unrecognized.
 */
export function KeyValue(this: CTSBriefcase, keyvalue: KeyValueData_s): void {
  // -- "model" → copy into 32-byte szModel buffer at this+0x6c --
  if (strcmp(keyvalue.szKeyName, "model") === 0) {
    strncpy(this.szModel, keyvalue.szValue, 0x1f);
    this.szModel[0x1f] = 0; // null-terminate at offset +0x8b
  }
  // -- <unknown 8-char key> → strtol(szValue, base 10) - 1 → this+0x68 --
  // TODO(asm-ambiguous): the second comparison literal sits 9 bytes AFTER
  // "model" in .rodata ([ebx - 0x6cd46] vs [ebx - 0x6cd4f]). With
  // "model\0" being 6 bytes, that leaves 3 bytes of padding/gap before
  // the second string starts. Without strings-n5.txt we can't pin the
  // exact key name; common GoldSrc candidates at this size are "body",
  // "skin", "renderamt", or a custom briefcase-only key. The handler
  // itself is unambiguous: parse szValue as base-10 int (strtol w/
  // base=10, endptr=NULL), subtract 1 (mapper inputs are 1-indexed;
  // stored 0-indexed), write to a dword at this+0x68.
  else if (strcmp(keyvalue.szKeyName, /* TODO: unknown 8-char key name */) === 0) {
    const parsed = strtol(keyvalue.szValue, null, 10);
    this.someIndex /* +0x68, dword */ = parsed - 1;
  }
  // -- unrecognized: leave keyvalue->fHandled = 0 so the engine keeps looking --
  else {
    keyvalue.fHandled = 0;
    return;
  }

  // Both handled branches converge here with fHandled = 1.
  keyvalue.fHandled = 1;
}
