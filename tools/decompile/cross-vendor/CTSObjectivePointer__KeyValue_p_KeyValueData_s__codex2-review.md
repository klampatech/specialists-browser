```
VERDICT: PASS-WITH-NOTES

Note on checklist scope: the supplied HLSDK reference and checklist items
1–8 are tuned for the 4 engine-interface exports (GiveFnptrsToDll,
GetEntityAPI[2], GetNewDLLFunctions). The function under review is an
entity KeyValue method, so items #2 (version check) and #3
(interfaceVersion assignment-back) are N/A. The rest adapt cleanly.

Checklist:
1. Signature — ✅ — `(this: any, pkvd: any): void` matches the disassembly's
   implicit `thiscall` (one `this` arg via PIC-loaded register + `pkvd` via
   stack at `[esp+0x14]`). Return type `void` matches the absence of any
   `eax` write-back. Function name `KeyValue` matches the demangled symbol
   `KeyValue__19CTSObjectivePointerP14KeyValueData_s` exactly.

2. Version check — N/A — entity KeyValue handler, not an engine interface
   function. No version constant is involved.

3. interfaceVersion assignment-back — N/A — same reason.

4. Success path — ✅ — All five match branches correctly:
     • compare `pkvd->szKeyName` (offset0x04) against the key constant,
     • on match, call the alloc-string helper with `pkvd->szValue`
       (offset 0x08),
     • store the returned pointer at the expected `this` offsets (0x64,
       0x68, 0x6c, 0x70, 0x74) — four bytes apart, consistent with five sequential `int` fields or a small array,
     • set `pkvd->fHandled = 1` (offset 0x0c).
   The fallback correctly writes `pkvd->fHandled = 0`, mirroring the
   disassembly's `mov DWORD PTR [esi+0xc], 0x0` at 0x7bb38. Offsets
   line up 1:1 with the assembly.

5. No fabricated paths — ✅ — Exactly five `strcmp` branches + one fallback,
   matching the disassembly. PIC base setup (`call 7ba24; pop ebx; add
   ebx,0xea3ec`) is correctly abstracted away. Each match path uses
   `return`, which is functionally equivalent to the disassembly's
   jump-to-`0x7bb2a` epilogue (nothing follows `fHandled=1` set in the
   original). No invented logic.

6. No TODO body — ✅ — Body is fully expressed in code. Only the five key
   constants (`KEY_0..KEY_4`) and field names (`m_iszField_0x64..0x74`) are
   TODOs, and the offsets are preserved so the structure remains reviewable.
   This matches the conversion guidance ("Add `// TODO(asm-ambiguous):`
   comments where the assembly is ambiguous").

7. Field names — ⚠️ — `m_iszField_0x64` etc. are explicit offset
   placeholders, not invented names. The `m_isz` prefix correctly follows
   HLSDK convention for engine-allocated string handles (int-string). Once
   the key constants are resolved in D.4 against strings-n5.txt, these
   should be renamed to semantically meaningful names (`m_iszSprite`,
   `m_iszTarget`, etc.). Acceptable per conversion guidance but flagged
   for follow-up.

8. Compiles in isolation — ⚠️ — Two real concerns:
     a. `strcmp` is referenced but not imported or declared. The
        disassembly calls `strcmp@plt` from libc; the TS needs a
        `declare function strcmp(...)` or equivalent.
     b. `(globalThis as any).g_engfuncs.pfnAllocString(pkvd.szValue)`
        abstracts the disassembly's
        `mov eax, [ebx+0x1aa8]; call [eax+0x10c]`. If `[ebx+0x1aa8]` is
        `g_engfuncs`, the slot at `0x10c/4 = 67` is *not* the typical
        position of `pfnAllocString` in HLSDK `enginefuncs_t` (~11).
        This is worth verifying in
        `tools/decompile/references/hlsdk-goldsrc-interface.md` before
        committing the name. Could be a TS-added slot, a vtable method,
        or an engine function with a different name than `pfnAllocString`.

Issues to fix:
  • Declare `strcmp` so the file compiles standalone (one-liner:
 `declare function strcmp(a: string, b: string): number;`).
  • Verify `[ebx+0x1aa8]` is `g_engfuncs` and that index 67 is the right
    slot. If not, rename the helper accordingly and/or expose the
    double-indirection in the abstraction.
  • Extract the alloc-string call into a named helper so the indirection
    shape is documented in one place.
  • Otherwise: structure is faithful and ready for D.4 to fill in the
    key names and field semantics.

Suggested rewrite (full TS function):

```typescript
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
```

Summary:
- Structure: faithful to the disassembly — five `strcmp` branches + fallback,
  correct offsets (0x64/0x68/0x6c/0x70/0x74), correct field assignments,
  correct fHandled handling, no invented control flow.
- Open items are explicit TODOs (key strings, field semantics) and a
  compile-time nit (missing `strcmp` declaration), plus a verification
  step on the `pfnAllocString` slot index. None of these block the
  D.3 structural decompile; they roll into the D.4 class  reconstruction task.
```
