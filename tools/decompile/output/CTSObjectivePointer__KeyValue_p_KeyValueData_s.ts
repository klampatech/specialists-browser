/**
 * CTSObjectivePointer::KeyValue — KeyValue handler for the objective-pointer
 * entity. Compares the incoming key against five hard-coded names. On a
 * match, copies the value through the engine's AllocString helper and
 * stores the resulting string pointer on the entity, then marks the
 * KeyValueData as handled (fHandled = 1). If no key matches, leaves
 * fHandled = 0 so the engine falls through to base CBaseEntity::KeyValue.
 *
 * Disassembly: 295 bytes at 0x0007ba1c in ts_i386.so.
 *   KeyValueData_s + 0x04 : szKeyName  (const char *)
 *   KeyValueData_s + 0x08 : szValue    (const char *)
 *   KeyValueData_s + 0x0C : fHandled   (int)
 *
 * Five match branches store the alloc'd string at offsets 0x64, 0x68,
 * 0x6c, 0x70, 0x74 of `this`. All five offsets are 4 bytes apart,
 * suggesting either a fixed array of 5 strings or five independent isz
 * fields.
 *
 * Field/key names are TODO placeholders; offsets are preserved per D.3
 * conversion guidance. Resolve in D.4 against strings-n5.txt + the
 * resolved class reconstruction.
 */

// libc strcmp — the disassembly calls strcmp@plt.
declare function strcmp(a: string, b: string): number;

// TODO(asm-ambiguous): the disassembly shows `[ebx+0x1aa8] -> [eax+0x10c]`,
// a double indirection. If `[ebx+0x1aa8]` is `g_engfuncs`, the slot at
// 0x10c/4 = index 67 is *not* the typical position of pfnAllocString in
// HLSDK eiface.h (~11). Verify against the enginefuncs_t table layout in
// tools/decompile/references/hlsdk-goldsrc-interface.md before locking
// the name.
function allocString(value: string): any {
  const table: any = (globalThis as any).g_engfuncs;
  return table.pfnAllocString(value);
}

// TODO(asm-ambiguous): replace with real key names. They live in .rodata
// at GOT_base - {0x6cef7, 0x6ceec, 0x6cee1, 0x6ced5, 0x6cec9} (~11-12 B
// apart, all 10-11 chars). Verify with strings-n5.txt.
const KEY_0 = "<TODO: key @ GOT-0x6cef7>";
const KEY_1 = "<TODO: key @ GOT-0x6ceec>";
const KEY_2 = "<TODO: key @ GOT-0x6cee1>";
const KEY_3 = "<TODO: key @ GOT-0x6ced5>";
const KEY_4 = "<TODO: key @ GOT-0x6cec9>";

export function KeyValue(this: any, pkvd: any): void {
  // TODO: replace `any` with CTSObjectivePointer and KeyValueData_s once
  // those types are defined (D.4 class reconstruction).
  const key = pkvd.szKeyName;

  if (strcmp(key, KEY_0) === 0) {
    this.m_iszField_0x64 = allocString(pkvd.szValue);
    pkvd.fHandled = 1;
    return;
  }

  if (strcmp(key, KEY_1) === 0) {
    this.m_iszField_0x68 = allocString(pkvd.szValue);
    pkvd.fHandled = 1;
    return;
  }

  if (strcmp(key, KEY_2) === 0) {
    this.m_iszField_0x6c = allocString(pkvd.szValue);
    pkvd.fHandled = 1;
    return;
  }

  if (strcmp(key, KEY_3) === 0) {
    this.m_iszField_0x70 = allocString(pkvd.szValue);
    pkvd.fHandled = 1;
    return;
  }

  if (strcmp(key, KEY_4) === 0) {
    this.m_iszField_0x74 = allocString(pkvd.szValue);
    pkvd.fHandled = 1;
    return;
  }

  // None of the five recognized keys matched; let the base class try.
  pkvd.fHandled = 0;
}
