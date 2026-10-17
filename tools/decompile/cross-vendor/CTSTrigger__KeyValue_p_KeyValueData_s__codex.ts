```typescript
/**
 * CTSTrigger::KeyValue — handle one key/value pair from the BSP entity
 * definition and dispatch it to the right CTSTrigger field.
 *
 * Recognized keys (resolved via the PIC GOT against .rodata offsets
 * `ebx-0x6eef8`, `ebx-0x6eeee`, `ebx-0x6eee1`):
 *   - key #1 (likely "wait"):  parsed as float         → m_flWait (offset 0x10c)
 *   - key #2 (likely "count"): parsed as float, trunc. → m_iCount (offset 0x108)
 *   - key #3 (name unknown):   parsed as float, trunc. → m_iCount,
 *                              with literal value 2 remapped to the -1 sentinel
 * Unrecognized keys leave fHandled = 0 so the base-class chain can try.
 *
 * @param this  The CTSTrigger entity instance (the C++ `this`).
 * @param pkvd  GoldSrc KeyValueData block (szKeyName, szValue, fHandled).
 */
export function KeyValue(this: any, pkvd: KeyValueData_s): void {
  // TODO: class CTSTrigger is defined elsewhere (D.4 task); field offsets
  // 0x10c / 0x108 correspond to m_flWait / m_iCount inherited from CBaseTrigger.
  // TODO(asm-ambiguous): the actual string literals were inferred from the
  // CTSTrigger / CTriggerMultiple family. Confirm against
  // tools/decompile/analysis/strings-n5.txt.
  const KEY_WAIT  = "wait";
  const KEY_COUNT = "count";
  const KEY_THIRD = "???"; // unknown — third PIC-resolved key name

  if (strcmp(pkvd.szKeyName, KEY_WAIT) === 0) {
    // __strtod_internal(szValue, NULL, 0) → fstp [edi+0x10c]
    this.m_flWait = __strtod_internal(pkvd.szValue, 0, 0);
    pkvd.fHandled = 1;
    return;
  }

  if (strcmp(pkvd.szKeyName, KEY_COUNT) === 0) {
    // strtod result is converted via fistp with the FPU control word set to
    // round-toward-zero (high byte 0x0c). `| 0` mirrors that and forces a
    // 32-bit signed int, matching the DWORD store at [edi+0x108].
    const v = __strtod_internal(pkvd.szValue, 0, 0) | 0;
    this.m_iCount = v;
    pkvd.fHandled = 1;
    return;
  }

  if (strcmp(pkvd.szKeyName, KEY_THIRD) === 0) {
    // TODO(asm-ambiguous): semantics of the literal-2 → -1 sentinel remap.
    const v = __strtod_internal(pkvd.szValue, 0, 0) | 0;
    this.m_iCount = v === 2 ? -1 : v;
    pkvd.fHandled = 1;
    return;
  }

  // Unhandled — let the base-class KeyValue chain try.
  pkvd.fHandled = 0;
}

// --- minimal forward declarations so this file compiles in isolation ---

// TODO: replace with the real struct once KeyValueData_s is defined elsewhere.
// Layout per HL1 SDK: char *pClassName at +0x0, char *szKeyName at +0x4,
// char *szValue at +0x8, int fHandled at +0xc.
interface KeyValueData_s {
  pClassName: any;   // +0x0, unused here
  szKeyName: string; // +0x4
  szValue: string;   // +0x8
  fHandled: number;  // +0xc
}

// TODO: replace with real declarations once the decompile runtime is wired up.
declare function strcmp(a: string, b: string): number;
declare function __strtod_internal(nptr: string, endptr: any, base: number): number;
```
