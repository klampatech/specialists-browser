```typescript
/**
 * CTSDMHill::KeyValue — parses engine-provided entity properties for the
 * DM "hill" entity. Three .ent keys are recognised; their literal names
 * live at the three GOT-relative string addresses noted below (resolve in
 * D.4). On a match, the corresponding field on `this` is populated and
 * `pKeyValueData.fHandled` is set to 1. If no key matches, `fHandled` is
 * cleared to 0 so the engine / base class can fall through.
 *
 * key1 -> float  -> this+0x78 (via __strtod_internal)
 *   key2 -> int    -> this+0x70 (via __strtol_internal, base 10)
 *   key3 -> int    -> this+0x74 (via __strtol_internal, base 10)
 *
 * @param this            The CTSDMHill entity instance (this in original C++)
 * @param pKeyValueData   Engine-supplied key/value record
 * @returns               void
 */
export function KeyValue(this: CTSDMHill, pKeyValueData: KeyValueData_s): void {
  const szKey = pKeyValueData.szKeyName;          // KeyValueData_s +0x4
  const szValue = pKeyValueData.szValue;          // KeyValueData_s +0x8

  // Property 1 — float (strtod) -> this+0x78
  if (strcmp(szKey, KEY_NAME_1) === 0) {
    // __strtod_internal(szValue, NULL, 0)
    this.field_0x78 = __strtod_internal(szValue, null, 0);
    pKeyValueData.fHandled = 1;
    return;
  }

  // Property 2 — int (strtol, base 10) -> this+0x70
  if (strcmp(szKey, KEY_NAME_2) === 0) {
    // __strtol_internal(szValue, NULL, 10, 0)
    this.field_0x70 = __strtol_internal(szValue, null, 10, 0);
    pKeyValueData.fHandled = 1;
    return;
  }

  // Property 3 — int (strtol, base 10) -> this+0x74
  if (strcmp(szKey, KEY_NAME_3) === 0) {
    // __strtol_internal(szValue, NULL, 10, 0)
    this.field_0x74 = __strtol_internal(szValue, null, 10, 0);
    pKeyValueData.fHandled = 1;
    return;
  }

  // No recognised key — leave fHandled at 0 so the engine can fall through.
  pKeyValueData.fHandled = 0;
}

// ---------------------------------------------------------------------------
// Minimal stubs so this file compiles in isolation. D.4 will fill these in.
// ---------------------------------------------------------------------------

// TODO(D.4): replace with the full class layout; the three offsets below are
//            the only fields written by this function.
interface CTSDMHill {
  field_0x70: number; // +0x70 — int property, base-10-parsed
  field_0x74: number; // +0x74 — int property, base-10-parsed
  field_0x78: number; // +0x78 — float property, strtod-parsed
}

// TODO(asm-ambiguous): the +0x0 slot is unused here; in HL1 KeyValueData_s
//                      variants it typically carries an owning pEntity
//                      pointer. The remaining layout (key +0x4, value +0x8,
//                      fHandled +0xc) is fixed by the disassembly.
interface KeyValueData_s {
  pEntity?: unknown;  // +0x0 — unused by this function
  szKeyName: string;  // +0x4 — key being parsed
  szValue: string;    // +0x8 — string value to parse
  fHandled: number;   // +0xc — 1 if consumed, 0 if not
}

// Runtime helpers — signatures mirror the PLT entries in the disassembly.
declare function strcmp(a: string, b: string): number;
declare function __strtod_internal(nptr: string, endptr: null, group: number): number;
declare function __strtol_internal(nptr: string, endptr: null, base: number, group: number): number;

// Key-name literals — recovered from three GOT-relative string addresses:
//   lea eax, [ebx - 0x6eef8]   ; GOT base 0x165e10  -> 0x0F6F18
//   lea eax, [ebx - 0x6ee70]   ; GOT base 0x165e10  -> 0x0F6FA0
//   lea eax, [ebx - 0x6ee68]   ; GOT base 0x165e10  -> 0x0F6FA8
// (EBX = 0x619c3 + 0x10444d = 0x165e10)
// TODO(D.4): look these up in tools/decompile/analysis/strings-n5.txt.
declare const KEY_NAME_1: string;
declare const KEY_NAME_2: string;
declare const KEY_NAME_3: string;
```
