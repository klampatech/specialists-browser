/**
 * CTSWinGiver::KeyValue — designer-key dispatch into four int32 fields on
 * this entity. Sets `pKeyValueData.fHandled = 1` on match (engine stops
 * walking the class hierarchy), or `fHandled = 0` if no known key matched
 * (engine keeps dispatching to the parent class).
 *
 * Disassembly notes (addr 0x0007bdfc, 259 B):
 *   - Prologue: `push edi/esi/ebx; call $+5; pop ebx; add ebx, 0xea00c`
 *     computes PIC GOT base in EBX. After that, `[ebx + offset]` reaches
 *     globals; `[edi+0x6c..0x78]` reaches `this` fields; `[esi+0x4..0xc]`
 *     reaches KeyValueData_s fields.
 *   - 4 strcmp/strtol_internal pairs, one per known key, writing to
 *     offsets 0x6c / 0x70 / 0x74 / 0x78 on `this`.
 *   - Two `mov esi, esi` instructions are alignment NOPs (no behavior).
 *   - Fall-through `mov [esi+0xc], 0x0` sets fHandled = 0 when no key matches.
 *
 * Faithfulness notes:
 *   - The asm uses `__strtol_internal(str, NULL, 10, 0)` (base-10 long).
 *     TS uses `parseInt(str, 10)`. For these fields (wins, team, radius,
 *     delay) values are well under 2^31, so the divergence is benign.
 *   - Key strings live at GOT-relative offsets and must be extracted from
 *     the .so before this function is wired up. They are NOT ambiguous —
 *     they're concrete data at known addresses.
 *   - Field names below are provisional and should be replaced once the
 *     CTSWinGiver class layout is reconstructed in D.4.
 */

interface KeyValueData_s {
    szClassName: string;   // +0x00 — unused by this function (HLSDK convention)
    szKeyName:   string;   // +0x04
    szValue:     string;   // +0x08
    fHandled:    number;   // +0x0c — 0 = not handled, 1 = handled
}

export function KeyValue(this: any, pKeyValueData: KeyValueData_s): void {
    // Key strings live at GOT-relative offsets in the .so:
    //   ebx - 0x6ce6c  →  this.field_0x6c
    //   ebx - 0x6ce60  →  this.field_0x70
    //   ebx - 0x6ce84  →  this.field_0x74
    //   ebx - 0x6ce55  →  this.field_0x78
    // Extract from `ts/dlls/ts_i386.so` strings before merging.
    const KEY_FIELD_0x6c = "<extract:ebx-0x6ce6c>"; // TODO(extract-strings)
    const KEY_FIELD_0x70 = "<extract:ebx-0x6ce60>"; // TODO(extract-strings)
    const KEY_FIELD_0x74 = "<extract:ebx-0x6ce84>"; // TODO(extract-strings)
    const KEY_FIELD_0x78 = "<extract:ebx-0x6ce55>"; // TODO(extract-strings)

    const key = pKeyValueData.szKeyName;

    if (key === KEY_FIELD_0x6c) {
        this.field_0x6c = parseInt(pKeyValueData.szValue, 10);
        pKeyValueData.fHandled = 1;
    } else if (key === KEY_FIELD_0x70) {
        this.field_0x70 = parseInt(pKeyValueData.szValue, 10);
        pKeyValueData.fHandled = 1;
    } else if (key === KEY_FIELD_0x74) {
        this.field_0x74 = parseInt(pKeyValueData.szValue, 10);
        pKeyValueData.fHandled = 1;
    } else if (key === KEY_FIELD_0x78) {
        this.field_0x78 = parseInt(pKeyValueData.szValue, 10);
        pKeyValueData.fHandled = 1;
    } else {
        // No known key matched — leave fHandled = 0 so the engine keeps
        // dispatching up the class hierarchy. Matches asm at0x7bef4.
        pKeyValueData.fHandled = 0;
    }
}
