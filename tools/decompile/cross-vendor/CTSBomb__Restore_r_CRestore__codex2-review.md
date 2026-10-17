```
VERDICT: PASS-WITH-NOTES

Checklist (function is a GoldSrc save/restore method, not an engine API
entry point — items 2 & 3 marked N/A since they don't apply):

1. Signature — ✅ — Matches the demangled symbol
   `CTSBomb::Restore(CRestore &)`. The TS uses the prescribed
   "free function with `this`-parameter" form:
   `Restore(this: any, restore: any): number`. (`this: any` is valid
   TypeScript; the parameter is erased at compile time.)

2. Version check pattern — ⚠️ N/A — `Restore` is a per-entity member
   function, not `GetEntityAPI*` or `GetNewDLLFunctions`. No version
   pinning applies.

3. `*interfaceVersion` assignment-back — ⚠️ N/A — Same reason.

4. Success path — ✅ — Two real calls in correct order with correct
   arity:
     (a) `CTSObjective::Restore(this, restore)` → check return
     (b) `CRestore::ReadFields(restore, name, this, pTypeDesc, 2)`
         → return its result
   The cdecl argument-push order at the `ReadFields` call site
   (count, pTypeDesc, data, name, receiver) is correctly preserved.

5. No fabricated paths — ✅ — All three branches from the disassembly
   are present and only those:
     - parent returns non-zero → fall through to `ReadFields`
     - parent returns zero     → `mov eax,0; ret` (modeled as `return 0`)
     - tail                     → `ReadFields` return flows through
   The self-referential `call 7c428` is correctly identified as PIC
   base setup, not a real recursive call.

6. No TODO body — ⚠️ — The body is real control flow (not comment-only),
   but TWO of the four `ReadFields` args are TODO placeholders:
     - `name = 'CTSBomb'` is an unverified guess.
     - `pTypeDesc = undefined as any` is a placeholder; the global
       pointer is dropped rather than retained as a TODO hint.
   These are acceptable under "mark unknowns TODO" but should carry
   their offset context forward to D.4.

7. Field names — ✅ — `this`, `restore`, `CTSObjective.Restore`,
   `CRestore.ReadFields`, `TYPEDESCRIPTION` are all canonical. No
   fabricated names; no invented member fields like `[esi+0xf8]`.

8. Compiles in isolation — ✅ — All external symbols are behind
   `as any` casts or `any` parameter types. No type imports needed.

Issues to fix:

- **A. Hex math is wrong.** The comment claims
  `0x7c428 + 0xe99e8 = 0xf5e10`. Correct sum is `0x165e10`
  (1,465,872 decimal; the decompiler dropped the 0x1_ carry on
  column 5). This is a comment-only error, but it's an auditable
  trace and the kind of slop we don't want accumulating — fix it
  and double-check the per-byte addition going forward.

- **B. `'CTSBomb'` is a guess.** The string at
  `[ebx-0x6ccdb] = image_base - 0x6ccdb` is unidentified. The
  demangler convention and GoldSrc class-name sentinel pattern
  make `'CTSBomb'` *very* likely, but it should be a
  `// TODO(asm)` until either strings-n5.txt is searched or D.4
  re-derives it from the static TYPEDESCRIPTION array.

- **C. `pTypeDesc = undefined as any` drops the offset.**
  The disassembly loads a pointer from
  `DWORD PTR [ebx + 0x1334]`; that global is almost certainly the
  static `CTSBomb::m_TypeDesc[]` array (GoldSrc pattern). The
  offset + count (`2`) should be retained as a comment so D.4 can
  rebuild the array without re-decoding the binary.

- **D. "PIC / GOT base" is the wrong term.** `EBX` is the module
  *image base* (the .so's load address, used as a static base for
  PIC data accesses). `_GLOBAL_OFFSET_TABLE_` is a separate concept
  reserved for PLT call relocations, which are not involved here.
  Rename to "image base" or "static base".

- **E. Minor: stack-cleanup comment is off.** The decompiled TS says
  "MSVC x86 ABI pushes args right-to-left (restore last, this
  first)" — that's the cdecl convention but imprecise wording.
  MSVC's `__thiscall` for `CTSObjective::Restore` actually passes
  `this` in `ECX` and pushes `restore` as the lone stack arg.
  Doesn't affect the TS (which doesn't model calling convention),
  but the comment narrates the wrong ABI.

Suggested rewrite:

```typescript
/**
 * CTSBomb::Restore — restore a CTSBomb entity from a save-game buffer.
 *
 * Demangled:  CTSBomb::Restore(CRestore &restore)
 * Sequence:   1) call CTSObjective::Restore(this, restore)
 *             2) if ok, call CRestore::ReadFields(name, this, pTypeDesc, 2)
 *             3) return ReadFields' result; on parent-fail return 0.
 */
export function Restore(this: any, restore: any): number {
  // [asm head] call-next; pop ebx; add 0xe99e8
  //   ebx <- 0x7c428 (return address of self-call)
  //   ebx <- 0x7c428 + 0xe99e8 = 0x165e10  (module image base for PIC)
  // Subsequent "[ebx ± k]" reads are globals in .data/.rodata:
  //   - [ebx - 0x6ccdb] : rodata string   → ReadFields `name` arg
  //   - [[ebx + 0x1334]] : static TYPEDESCRIPTION[] → ReadFields `pTypeDesc` arg
  //                       (almost certainly CTSBomb::m_TypeDesc in C++;
  //                        rebuild in D.4 with count = 2)

  // 7c43a-7c441: __thiscall CTSObjective::Restore(this=esi, restore=edi)
  //   sub esp, 0x8; push edi; push esi; call; add esp, 0x10
  const parentOk: number = (CTSObjective.Restore as any)(this, restore);
  if (parentOk === 0) {
    // 7c444 test/jne + 7c448 mov eax,0 + 7c44d jmp epilogue
    return 0;
  }

  // 7c450-7c469: __thiscall CRestore::ReadFields(restore, name, this, pTypeDesc, 2)
  //   arg-push order (right-to-left): 2, pTypeDesc, this, name, restore
  //   call ReadFields; add esp, 0x20
  return (restore as any).ReadFields(
    /* name      */ undefined as any, // TODO(asm): string at [ebx - 0x6ccdb];
                                     // likely 'CTSBomb' (GoldSrc class-name
                                     // sentinel convention) — verify
                                     // against strings-n5.txt in D.4.
    /* data      */ this,
    /* pTypeDesc */ undefined as any, // TODO(asm): static TYPEDESCRIPTION[]
                                     // pointed to by [ebx + 0x1334];
                                     // count = 2. Reconstruct in D.4
                                     // from CTSBomb's serializable fields.
    /* count     */ 2,
  );
}
```

Net assessment: structure is correct, the two TODO placeholders are the
right escalation pattern for D.4, and the only thing that should
genuinely be corrected in D.3 itself is the `0xf5e10` → `0x165e10`
math error and the "GOT" terminology. Everything else can wait for D.4
(class+field-table reconstruction) to firm up the unknowns.
