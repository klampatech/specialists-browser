The exec tool isn't returning output reliably in this sandbox. I have enough info from the disassembly to produce the TS. Here's my analysis:

**Key observations:**
- `[esp+0x10]` = `this` (CTSTeamEscape*), `[esp+0x14]` = `pKeyValueData`
- `__strtol_internal` takes 4 args: `__strtol_internal(nptr, endptr, base, group)` — cdecl right-to-left: `push 0x0` (group), `push 0xa` (base=10), `push 0x0` (endptr=NULL), `push [esi+0x8]` (nptr=szValue)
- The base-class call uses `sub esp, 0x8; push esi; push edi` — 16-byte arg-slot pattern common in MSVC thiscall shims (alignment pad + (this, pKeyValueData))
- `[edi+0xf4]` = some int field on CTSTeamEscape (likely `m_iPoints` / `m_iScore` / `m_iLimit` — common objective props)
- `[esi+0x4]` = szKeyName, `[esi+0x8]` = szValue, `[esi+0xc]` = fHandled → matches canonical GoldSrc `KeyValueData_s` layout

```typescript
/**
 * CTSTeamEscape::KeyValue — handles a single entity-string key/value pair for a
 * team-escape objective. If the key matches a hard-coded property name (looked
 * up against a string constant in the GOT-relative data segment), parse the
 * value as a decimal int and store it in this->field_0xf4. Otherwise delegate
 * to the parent CTSObjective::KeyValue.
 *
 * @param this             The CTSTeamEscape entity instance (this in C++)
 * @param pKeyValueData    Key-value pair being applied
 * @returns                void
 */
export function KeyValue(this: CTSTeamEscape, pKeyValueData: KeyValueData_s): void {
  // The string at GOT base - 0x6cd60 is the property key CTSTeamEscape owns  // (likely "points", "score", or "limit" — TODO: confirm via strings-n5.txt).
  const szTeamEscapeKey = readStringFromGot(GOT_BASE - 0x6cd60);

  if (strcmp(pKeyValueData.szKeyName, szTeamEscapeKey) === 0) {
    // __strtol_internal(szValue, NULL /*endptr*/, 10 /*base*/, 0 /*group*/)
    const value = __strtol_internal(pKeyValueData.szValue, null, 10, 0);
    // TODO: offset meaning unclear — 0xf4 is a class-specific int field.
    // Likely m_iPoints / m_iScore / m_iLimit based on "team escape" objective
    // semantics, but the exact name depends on CTSTeamEscape's field layout.
    this.m_iSomeProperty = value;
    pKeyValueData.fHandled = 1;
  } else {
    // Defer to parent class — CTSObjective::KeyValue(this, pKeyValueData)
    CTSObjective.prototype.KeyValue.call(this, pKeyValueData);
  }
}
```

```typescript
// TODO: forward declarations needed for this file to compile in isolation.
// These types belong in tools/decompile/output/ alongside this function.
declare const GOT_BASE: number;          // PIC global offset table base
declare function readStringFromGot(offset: number): string;
declare function __strtol_internal(
  nptr: string, endptr: any, base: number, group: number
): number;

declare class CTSTeamEscape {
  m_iSomeProperty: number; // TODO: rename once class layout is known (offset 0xf4)
}
declare class CTSObjective {
  KeyValue(this: CTSObjective, pKeyValueData: KeyValueData_s): void;
}
declare interface KeyValueData_s {
  szClassName: string; // offset 0x0
  szKeyName: string;   // offset 0x4
  szValue: string;     // offset 0x8
  fHandled: number;    // offset 0xc
}
```
