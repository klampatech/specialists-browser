/**
 * CTSTrigger::KeyValue — handle one key/value pair from the BSP entity
 * definition and dispatch it to the right CTSTrigger field.
 *
 * The function loads three key-string literals via PIC-relative offsets
 * from the GOT base (ebx):
 *   - [ebx-0x6eef8]  →  inferred "wait"   (5-char name + null? rodata gap
 *                       of 10 bytes total — verify against strings-n5.txt)
 *   - [ebx-0x6eeee]  →  inferred "count"  (6-char name + null? gap 13 bytes
 *                       total — verify against strings-n5.txt)
 *   - [ebx-0x6eee1]  →  UNKNOWN — third key name still TBD
 *
 * Operations per match:
 *   - key #1: parse szValue as float,        store as float  at this+0x10c
 *   - key #2: parse szValue as float + trunc-to-int32, store int at this+0x108
 *   - key #3: parse + trunc, store int at this+0x108, remap literal 2 → -1
 *   - otherwise: leave fHandled = 0 so the base class chain can try
 *
 * @param this  The CTSTrigger entity instance (the C++ `this`).
 * @param pkvd  GoldSrc KeyValueData block (szKeyName, szValue, fHandled).
 */
export function KeyValue(this: any, pkvd: KeyValueData_s): void {
  // TODO(decompile): resolve all three key names against
  //   tools/decompile/analysis/strings-n5.txt before relying on this dispatch.
  // TODO(decompile): confirm offsets 0x10c / 0x108 actually map to
  //   m_flWait / m_iCount (likely, but they could be TS-specific fields
  //   with the same semantics at different names).
  const KEY_WAIT  = "wait";
  const KEY_COUNT = "count";
  // TODO(decompile): unknown — third PIC key at [ebx-0x6eee1].
  const KEY_THIRD = "???";

  if (strcmp(pkvd.szKeyName, KEY_WAIT) === 0) {
    // __strtod_internal(szValue, NULL, 0) → fstp DWORD [edi+0x10c]
    this.m_flWait = __strtod_internal(pkvd.szValue, null as any, 0);
    pkvd.fHandled = 1;
    return;
  }

  if (strcmp(pkvd.szKeyName, KEY_COUNT) === 0) {
    // asm sets FPU control word to round-toward-zero (low byte 0x0c) before
    // fistp DWORD; in JS, `| 0` produces the same int32 truncation.
    const v = __strtod_internal(pkvd.szValue, null as any, 0) | 0;
    this.m_iCount = v;
    pkvd.fHandled = 1;
    return;
  }

  if (strcmp(pkvd.szKeyName, KEY_THIRD) === 0) {
    // asm: store fistp result to [edi+0x108]; if value == 2, overwrite with
    // 0xffffffff (-1) — matches "store, conditionally remap to -1".
    const v = __strtod_internal(pkvd.szValue, null as any, 0) | 0;
    this.m_iCount = v === 2 ? -1 : v;
    pkvd.fHandled = 1;
    return;
  }

  // Unhandled — let the base-class KeyValue chain try.
  pkvd.fHandled = 0;
}

// --- minimal forward declarations so this file compiles in isolation ---

// Layout per HL1 SDK: char *pClassName at +0x0, char *szKeyName at +0x4,
//                     char *szValue at +0x8, int fHandled at +0xc.
interface KeyValueData_s {
  pClassName: any;   // +0x0, unused here
  szKeyName: string; // +0x4
  szValue: string;   // +0x8
  fHandled: number;  // +0xc
}

declare function strcmp(a: string, b: string): number;
declare function __strtod_internal(nptr: string, endptr: any, base: number): number;
