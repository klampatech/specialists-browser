/**
 * CTSPlayerAmount::KeyValue — entity key/value dispatch for CTSPlayerAmount.
 *
 * Compares pkvd.szKeyName against three baked-in key strings:
 *  • two route pkvd.szValue to char-array fields on `this` (via strcpy)
 *    at offsets 0x74 and 0xd8;
 *  • the third parses pkvd.szValue as a base-10 integer (strtol) into
 *    the int field at this+0x70. For a class named CTSPlayerAmount,
 *    0x70 is almost certainly m_iAmount / m_iPlayerAmount.
 *
 * On any recognized key, pkvd.fHandled is set to 1 and the function
 * returns. Otherwise it sets pkvd.fHandled = 0 (the engine expects
 * this so it can pass the kv pair to a base class next).
 *
 * Disassembly: 0x000629c0, 183 bytes, three GOT-relative key strings
 * at -0x6edde, -0x6ede1, -0x6edd0 from the build's GOT base. The
 * string contents must come from `.rodata` (see D.4).
 */
export function KeyValue(
  this: CTSPlayerAmount,
  pkvd: KeyValueData,
): void {
  if (strcmp(pkvd.szKeyName, KEY_A) === 0) {
    // strcpy(this+0x74, pkvd.szValue) — char buffer at offset 0x74.
    strcpy(this.m_szField_0x74, pkvd.szValue);
    pkvd.fHandled = 1;
    return;
  }

  if (strcmp(pkvd.szKeyName, KEY_B) === 0) {
    // strcpy(this+0xd8, pkvd.szValue) — second char buffer.
    strcpy(this.m_szField_0xd8, pkvd.szValue);
    pkvd.fHandled = 1;
    return;
  }

  if (strcmp(pkvd.szKeyName, KEY_C) === 0) {
    // strtol(pkvd.szValue, NULL, 10) → this+0x70.
    // The binary calls glibc's __strtol_internal(.., 10, 0); the 4th
    // arg (thousands-grouping flag) has no TS equivalent and is
    // dropped here.
    this.m_iAmount_0x70 = strtol(pkvd.szValue, 0, 10);
    pkvd.fHandled = 1;
    return;
  }

  pkvd.fHandled = 0;
}

// --- Forward declarations (hoisted by TS; order kept below the
// function body for readability).

declare const KEY_A: string; // TODO: GOT - 0x6edde (build-dependent)
declare const KEY_B: string; // TODO: GOT - 0x6ede1 (build-dependent)
declare const KEY_C: string; // TODO: GOT - 0x6edd0 (build-dependent)

declare function strcmp(a: string, b: string): number;
declare function strcpy(dst: any, src: string): void;
declare function strtol(s: string, endptr: any, base: number): number;

// Types we don't have yet — see D.4 (full class reconstruction).
type CTSPlayerAmount = any;
type KeyValueData = any;
