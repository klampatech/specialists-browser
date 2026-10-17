```
VERDICT: PASS

Note: this function (`CTSObjectiveManager::Restore`) is not one of
the 4 engine↔mod interface entry points covered by the inline
HLSDK reference — those are `GiveFnptrsToDll`, `GetEntityAPI*`,
and `GetNewDLLFunctions`. The applicable spec for this function
is the demangled name + the disassembly itself, not the
APIFUNCTION/APIFUNCTION2 reference. Items 2 and 3 in the
checklist are therefore N/A; I grade them as such rather than
as failures.

Checklist:
1. Signature — ✅ — Demangled name `Restore__19CTSObjectiveManagerR8CRestore`
   ⇒ `CTSObjectiveManager::Restore(CRestore&)` (instance method,
   one `CRestore&` param, implicit `this`). The TS declares
   `(this: CTSObjectiveManager, restore: CRestore) => number`,
   which is a faithful TypeScript rendering. Return type `number`
   matches the disassembly convention: `eax = 0` on the failure
   path at `0x7b444`; otherwise `eax` comes from `ReadFields`.

2. Version check — ⚠️ N/A — Function is not an engine↔mod
   interface entry point, so the `*interfaceVersion` pattern
   does not apply. (`GetEntityAPI2` / `GetNewDLLFunctions`
   pattern is correctly absent.)

3. interfaceVersion assignment — ⚠️ N/A — Same reason.

4. Success path — ✅ — Calls `restore.ReadFields(pClassName,
   pData, pTypeDesc, numFields)` with exactly the four args the
   demangled name `ReadFields__8CRestorePCcPvP15TYPEDESCRIPTIONi`
   specifies, in the right order:
     - pClassName: string literal `"CTSObjectiveManager"`
       (matches `lea eax, [ebx-0x6cd33]` GOT-resolved string)
     - pData: `this` (matches `push esi` after `esi = [esp+0x10]`
       = `this` of `Restore`)
     - pTypeDesc: `g_CTSObjectiveManager_TypeDescriptions`
       (matches `push DWORD PTR [ebx+0x20ac]`, the GOT-resident
       static TYPEDESCRIPTION array)
     - numFields: `13` (matches `push 0xd`)
   `edi = restore` is the implicit `this` of the `ReadFields`
   member call, which TS supplies via `restore.ReadFields(...)`.
   Argument order, count, and types all reconcile with the
   demangled signature.

5. No fabricated paths — ✅ — Control flow mirrors the
   disassembly exactly:
     1. `CBaseEntity.Restore(this, restore)` ←
        `call   59380 <Restore__11CBaseEntity...@plt>`
     2. `test eax,eax; jne 7b44c` →
        `if (status === 0) return 0`
     3. ReadFields with 4 args →
        `restore.ReadFields("CTSObjectiveManager", this,
        g_CTSObjectiveManager_TypeDescriptions, 13)`
     4. Single shared epilogue → both `return` statements
        inside one TS function exit through the same frame
        (matches `0x7b468` shared epilogue in the disassembly
        for both paths).
   No invented branches, no extra logging, no error swallowing.
   The PIC/GOT prologue (`call`/`pop ebx`/`add ebx,0xea9ec`)
   is correctly elided in the TS — it is a calling-convention
   detail, not behavior, and the conversion guidance explicitly
   forbids literal line-for-line translation.

6. No TODO body — ✅ — The function body is fully expressed in
   code; the two `TODO(...)` declarations are external-dependency
   stubs (`any` type aliases for `CTSObjectiveManager`,
   `CRestore`, `CBaseEntity`, and `declare const` for
   `g_CTSObjectiveManager_TypeDescriptions`), which is exactly
   what the conversion guidance asks for: "compile in
   isolation (no external type references we don't define
   here; use `any` for unknowns)". These are not TODO
   placeholders for missing logic; D.4 will replace them.

7. Field names — ✅ — All three class names map cleanly to the
   demangled C++ names. The synthetic global
   `g_CTSObjectiveManager_TypeDescriptions` follows the
   project's existing convention for static function-table
   / descriptor-array globals (compare `g_engfuncs`,
   `gFunctionTable`, `gNewDLLFunctions` from the HLSDK
   reference). Doc comments correctly cite the GOT offsets
   (`[ebx-0x6cd33]`, `[ebx+0x20ac]`) the array/string pointer
   resolves through.

8. Compiles in isolation — ✅ — `any`-typed type aliases for
   the engine-side classes and a `declare const` for the
   global allow the file to compile standalone. No dangling
   imports, no missing symbols.

Cross-check vs. the disassembly (additional notes):

- The `test eax, eax; jne 0x7b44c` zero-test reads slightly
  differently from a typical "0 == failure, 1 == success"
  return-value idiom — it actually means "any non-zero is
  success". The TS captures this with `=== 0` rather than
  `!status`, which is the safer spelling and still correct.

- Stack math: 4 dwords (return + 2 args + alignment) cleaned
  with `add esp, 0x10` after the base-class call, then
  `sub esp,0xc` + 5 dwords + `add esp,0x20` for ReadFields,
  then a 3-register epilogue (`pop ebx/esi/edi; ret`) — both
  paths share the epilogue at `0x7b468`. The TS collapses
  this to a single function with two `return` sites; behavior
  is identical.

- `0x7b458: lea eax, [ebx-0x6cd33]` is a string-pool pointer,
  not an actual structure — passing the string literal
  directly is the right simplification and matches the
  stated simplification rule in the conversion guidance.

Issues to fix: None.

Suggested rewrite: Not required — no changes needed.
```

A couple of small observations to consider for future decompiles (not issues with this one):

- The `[ebx-0x6cd33]` and `[ebx+0x20ac]` GOT-relative offsets will recur across many `CRestore`-driven save/restore methods in the mod. When D.4 starts mapping the static `TYPEDESCRIPTION` arrays for `CBaseEntity` / `CBaseAnimating` / `CBasePlayer` etc., it's worth a one-line entry in `docs/cheats/ts-got-offsets.md` so future reviews don't have to recompute the PIC base each time.
- The `numFields = 0xd = 13` claim is consistent here, but if a future class is *not* `CTSObjectiveManager` and the disassembly shows a different `push` literal, double-check whether the literal is really the count (could be a flag bitmask depending on the call) before mirroring it. In this case the demangled signature with trailing `i` confirms it's the int arg, so we're safe.
