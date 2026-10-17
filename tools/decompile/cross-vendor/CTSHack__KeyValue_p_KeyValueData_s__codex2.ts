/**
 * CTSHack::KeyValue — parse a single key/value pair for the CTSHack entity.
 *
 * Decompiled from `ts/dlls/ts_i386.so` @ VA 0x0007d1c8 (97 B).
 *
 * Behaviour (per the disassembly):
 *   1. PIC setup via `call $+5; pop ebx; add ebx, 0xe8c40`
 *      → ebx = 0x0165e10 (GOT base).
 *   2. `edi = this`, `esi = pKeyValueData` (saved across calls).
 *   3. Compare `pKeyValueData->szKeyName` against a `.rodata` literal
 *      at VA `0xF9070` (computed: `0x7d1d0 + 0xe8c40 - 0x6cda0`).
 *      NOTE: chunk text claims `0xF4070` — likely a transcription error.
 *   4. On match: `strtol(pKeyValueData->szValue, NULL, 10, 0)` → stored
 *      at `this + 0x7c` (dword); then `pKeyValueData->fHandled = 1`.
 *   5. On mismatch: tail-call `CTSObjective::KeyValue(this, pKeyValueData)`.
 *
 * The exact literal string and the `this + 0x7c` field name are not in
 * this chunk and are flagged as `TODO(asm-ambiguous)`.
 *
 * NOTE on KeyValueData_s layout: the standard HLSDK 5-field layout
 * (szClassName@0, szTarget@4, szKeyName@8, szValue@c, fHandled@10) does
 * NOT fit the disasm accesses at [esi+4]/[esi+8]/[esi+c]. TS most likely
 * uses a custom 4-field layout with an int prefix at +0x0
 * (szKeyName@4, szValue@8, fHandled@c), or the 3-field variant. Resolve
 * when D.4 reconstructs the entity-side header.
 *
 * Compiles in isolation (external symbols are `declare`-stubbed or `any`).
 */
export function KeyValue(
  this: any,
  pKeyValueData: any,
): void {
  // The single key this override handles lives in .rodata. The literal is
  // referenced via `[ebx - 0x6cda0]` (GOT-relative) after PIC setup.
  // TODO(asm-ambiguous): pull the literal from strings-n5.txt /
  //   .rodata @ VA 0xF9070 (chunk text says 0xF4070, which is wrong).
  //   Plausible candidates for a single-int CTSHack key: "delay",
  //   "wait", "hack_mode", "hack_count", "respawn_delay", etc.
  const HANDLED_KEY = "<see TODO>";

  if (pKeyValueData.szKeyName === HANDLED_KEY) {
    // Disasm calls `__strtol_internal(szValue, NULL, 10, 0)`. The result
    // is a 32-bit `long` in eax, stored as a dword at `[edi + 0x7c]`.
    // `parseInt(..., 10) | 0` is the closest JS equivalent for ASCII
    // digit strings: `| 0` coerces to int32 to match the dword store,
    // and `NaN | 0 === 0` matches the C++ behaviour of returning 0 on
    // parse failure.
    const parsed = parseInt(pKeyValueData.szValue, 10) | 0;

    // Field at this+0x7c is a dword int. The full CTSHack class layout is
    // not in this chunk (D.4 task), so the field name is a placeholder.
    // TODO(asm-ambiguous): resolve once CTSHack class layout is known.
    (this as any).m_field_0x7c = parsed;

    // Mark the key as handled so the engine stops propagating it.
    // Per the disasm: `mov DWORD PTR [esi+0xc], 0x1`.
    pKeyValueData.fHandled = 1;
  } else {
    // Fall through to the base class. CTSObjective::KeyValue is at PLT
    // 0x56bf0 (demangled: `KeyValue__12CTSObjectiveP14KeyValueData_s`).
    // TODO: replace with the real decompiled function once its own chunk
    //   is processed; the `declare` stub below keeps this file standalone.
    CTSObjective_KeyValue(this, pKeyValueData);
  }
}

// Standalone stub so the file compiles without the CTSObjective chunk.
// Replace with the real signature once CTSObjective::KeyValue is decompiled.
declare function CTSObjective_KeyValue(this: any, pKeyValueData: any): void;
