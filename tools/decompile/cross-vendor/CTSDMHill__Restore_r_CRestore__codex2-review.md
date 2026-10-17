```
VERDICT: PASS-WITH-NOTES

Checklist:
1. Signature — ✅ — `Restore(this: any, saveHandle: any): number`
   matches the demangled `CTSDMHill::Restore(CRestore&)` plus the
   `this` parameter, and matches the disassembly's `eax` return
   (int) + two stack args (`esi=this`, `edi=saveHandle`). Clean.

2. Version check — N/A — this is a `CBaseEntity::Restore` flow,
   not one of the 4 interface functions. The analog here is
   `if (CBaseEntity_Restore(...) === 0) return 0;` — present and
   correct (`test eax,eax; jne skip; mov eax,0; jmp epilogue`).
   Treating as ✅ for the spirit-of-the-checklist.

3. interfaceVersion assignment — N/A — same reason; not an
   interface function. The disassembly has no equivalent
   write-back. ✅ for spirit-of.

4. Success path — ✅ — On non-zero from the base restore, the
   disassembly calls `CRestore::ReadFields(this=edi,
   className=eax, instance=esi, descriptors=[ebx+0x1580],
   count=3)` and returns its result. The TS
   `saveHandle.ReadFields(CTSDMHill_CLASS_NAME, this,
   CTSDMHill_FIELD_DESCRIPTORS, 3)` matches exactly. The arg
   order matches the demangled `PCc Pv P15TYPEDESCRIPTION i`
   (const char*, void*, TYPEDESC*, int).

5. No fabricated paths — ✅ — Two control-flow points in the
   disassembly (`jne 61998` → success branch, `jmp 619b4` →
   epilogue with `eax=0`) map 1:1 to the TS `if` + early
   `return` and the fall-through `return ReadFields(...)`.
   No invented branches, no else, no error handling beyond
   what the assembly shows.

6. No TODO body — ✅ — Body is real code, not stubs. The
   leading JSDoc and inline comments are documentation, not
   placeholders. No `// TODO` fills the function's logic.

7. Field names — ✅ — `CTSDMHill_CLASS_NAME` (the `lea
   eax,[ebx-0x6ed53]` string), `CTSDMHill_FIELD_DESCRIPTORS`
   (the `[ebx+0x1580]` static TYPEDESCRIPTION array), and
   the count `3` all line up. Names are placeholder
   identifiers consistent with the D.3 convention (real
   values will come from `tools/decompile/strings/` and
   `tools/decompile/data-symbols/`). The two free-function
   names `CBaseEntity_Restore` / `saveHandle.ReadFields`
   match the demangled PLT targets.

8. Compiles in isolation — ⚠️ — Type-side: clean (everything
   is `any` per the D.3 convention, no external type refs).
   Value-side: the function references three runtime symbols
   that are NOT defined in this snippet:
 - `CBaseEntity_Restore`
     - `CTSDMHill_CLASS_NAME`
     - `CTSDMHill_FIELD_DESCRIPTORS`
   These will resolve in the project via the cross-vendor
   import scaffolding (D.5 / D.6 wire-up), so this is a
   soft note, not a fail — but a one-line `declare` block
   at the top of the file would let the snippet compile
   standalone.
```

## Notes (not blockers)

**Template mismatch (worth flagging once):** The review prompt
is wired for the 4 HLSDK engine↔mod interface functions
(`GiveFnptrsToDll`, `GetEntityAPI`, `GetEntityAPI2`,
`GetNewDLLFunctions`). Items 2, 3, and 4 are interface-specific
and don't apply to `CTSDMHill::Restore`. I applied the *spirit*
of the checklist (faithful translation, no fabrication, correct
signature, correct field names, compiles). If you want a
dedicated checklist template for entity methods (`Save` /
`Restore` / `KeyValue` / `Think` / `Spawn`), I'd suggest adding
one to `tools/decompile/review-templates/` — happy to draft it
in a follow-up.

**Comments are accurate but slightly over-confident.** The
inline arg-label comment in the TS body claims the
`TYPEDESC*` is a "static field descriptor table @
[ebx+0x1580]" and the class name is at `[ebx-0x6ed53]`. These
offsets are correct in the disassembly, but the TS doesn't
actually use those offsets (the values are behind the
`CTSDMHill_*` placeholders). I'd soften to:

```typescript
// Disassembly pushes these four args (right-to-left):
//   push 0x3                          // field count
//   push [ebx+0x1580]                 // TYPEDESCRIPTION* (resolved via CTSDMHill_FIELD_DESCRIPTORS)
//   push esi                          // void* (this)
//   push eax (lea eax,[ebx-0x6ed53])  // const char* class name (resolved via CTSDMHill_CLASS_NAME)
//   push edi                          // implicit this (saveHandle)
// Then calls CRestore::ReadFields. Result is returned in eax.
```

**`arg4` / `arg3` / `arg2` / `arg1` numbering in the existing
comment is correct** (cdecl right-to-left push order means
`0x3` is the rightmost parameter, i.e. the 4th arg). Don't
re-order that.

**Consider an explicit `declare` for standalone compile:**

```typescript
declare const CBaseEntity_Restore: (self: any, save: any) => number;
declare const CTSDMHill_CLASS_NAME: string;
declare const CTSDMHill_FIELD_DESCRIPTORS: any[]; // TYPEDESCRIPTION[]
```

Drops the ⚠️ on item 8 to ✅.

## Issues to fix

None blocking. Two cosmetic suggestions above (softer offset
comment, optional `declare` block).

## Suggested rewrite

Not needed — the existing TS is a faithful translation of the
disassembly. Applying only the cosmetic tweaks, the body
becomes:

```typescript
/**
 * CTSDMHill::Restore — restore a CTSDMHill entity from a save game stream.
 *
 * Calls `CBaseEntity::Restore` first to initialize base save/restore
 * state. If that returns 0, this function returns 0 as well.
 * Otherwise it reads the entity's 3 typed fields via
 * `CRestore::ReadFields` and propagates that function's result.
 *
 * @param this         The CTSDMHill entity being restored
 * @param saveHandle   The CRestore read stream
 * @returns            Non-zero on success, 0 if the base restore failed
 */
export function Restore(this: any /* CTSDMHill */, saveHandle: any /* CRestore& */): number {
  // Step 1: base-entity restore. Bail out with 0 on failure.
  //   asm: call CBaseEntity::Restore; test eax,eax; jne success;
  //        mov eax,0; jmp epilogue.
  if (CBaseEntity_Restore(this, saveHandle) === 0) {
    return 0;
  }

  // Step 2: read this subclass's 3 typed fields via CRestore::ReadFields.
  //   asm (right-to-left pushes):
  //     push 0x3                          // int fieldCount
  //     push [ebx+0x1580]                 // TYPEDESCRIPTION* (CTSDMHill_FIELD_DESCRIPTORS)
  //     push esi                          // void* instance (this)
  //     push eax (lea eax,[ebx-0x6ed53])  // const char* className
  //     push edi                          // implicit this (saveHandle)
  //   asm: call CRestore::ReadFields; result returned in eax.
  return saveHandle.ReadFields(
    CTSDMHill_CLASS_NAME,
    this,
    CTSDMHill_FIELD_DESCRIPTORS,
    3,
  );
}
```

Drop-in equivalent of what `codex` emitted — same control flow,
same argument order, slightly more honest about which bits the
TS knows vs. which are deferred to the `CTSDMHill_*` symbol
scaffold.
