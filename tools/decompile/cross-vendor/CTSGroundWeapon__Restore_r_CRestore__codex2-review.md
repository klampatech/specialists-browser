```
VERDICT: PASS-WITH-NOTES
```

**Note on the inputs.** The HLSDK reference covers the engine↔mod
interface entry points (`GiveFnptrsToDll`, `GetEntityAPI*`,
`GetNewDLLFunctions`), but the function under review is
`CTSGroundWeapon::Restore` — a `CBaseEntity` save/restore method, not an
interface entry point. Checklist items 2 and 3 apply *only* to the API
entry points and are **N/A** here. I've evaluated the rest against the
disassembly and class context rather than the HLSDK reference.

```
Checklist:
1. Signature — ✅ — matches demangled
   `Restore__15CTSGroundWeaponR8CRestore` =
   `CTSGroundWeapon::Restore(CRestore&)`. TS renders the C++
   reference as a plain `CRestore` parameter (no qualifier) —
   acceptable. Return `number` matches the C++ `int`/BOOL convention.
   `this: CTSGroundWeapon` correctly represents the implicit
   instance pointer the asm carries in `esi`.

2. Version check — N/A — not an API entry point.

3. *interfaceVersion assignment — N/A — not an API entry point.

4. Success path — ✅ — the disassembly's
   `CRestore::ReadFields(className, this, typedDesc, 3)` is preserved
   exactly:
     push  0x3              ↔  fieldCount = 3
     push  [ebx+0x1b78]     ↔  typedDesc (TYPEDESCRIPTION[3])
     push  esi  (entity)    ↔  this
     lea+push [ebx-0x6b6ac] ↔  className
     push  edi              ↔  restore (CRestore::this)
     call  ReadFields
   Reads as `restore.ReadFields(className, this, typedDesc, 3)`.

5. No fabricated paths — ✅ — disassembly control flow is:
   (a) call `CBaseEntity::Restore`, (b) short-circuit on `eax==0`,
   (c) otherwise call `ReadFields`, (d) `ret`. The TS has exactly
   these four. No invented branches, no reordered fallthroughs.

6. No TODO body — ⚠️ — the *control flow* is in real TS code, but
   the data fed to ReadFields is placeholder:
     const className: any = "CTSGroundWeapon" as any;
     const typedDesc: any = null as any;
   The asm's `lea eax, [ebx-0x6b6ac]` and `[ebx+0x1b78]` resolve
   to in-binary static data (class-name string + TYPEDESCRIPTION[3]
   array) that the conversion guidance explicitly defers to D.4.
   So the TODOs are *appropriate scaffolding*, not a body of empty
   comments — but the two `TODO(asm-ambiguous):` flags and the
   inline `as any` casts suggest more uncertainty than the asm
   actually carries. Roll into a single block comment.

7. Field names — ✅ — `CTSGroundWeapon`, `CRestore`,
   `CBaseEntity::Restore`, `CRestore::ReadFields` all map to known
   demangled symbols. The two PIC-relative offsets
   (`[ebx-0x6b6ac]`, `[ebx+0x1b78]`) are correctly characterized
   as the class-name string and the TYPEDESCRIPTION table
   respectively — only their *contents* are deferred, which is fine.

8. Compiles in isolation — ⚠️ — references the types
   `CTSGroundWeapon` and `CRestore` and the value
   `CBaseEntity_Restore` without defining any of them in this file.
   Per the conversion guidance ("no external type references we
   don't define here; use `any` for unknowns"), these need stubs
   or `any`-casts so the file is standalone.
```

**Issues to fix**

- Add stubs (or `any` casts) for `CTSGroundWeapon`, `CRestore`,
  and `CBaseEntity_Restore` so the file compiles in isolation.
- Collapse the two `TODO(asm-ambiguous)` lines into one block
  comment above the data declarations. The schema is *deferred*,
  not unknown — saying so clearly tells the next reader to look in
  D.4 (TS-specific gameplay) rather than re-reading the asm.

**Suggested rewrite**

```typescript
// Standalone stubs so this file compiles in isolation.
// The full class lives elsewhere; declared `any` per the
// conversion guidance ("use `any` for unknowns").
type CTSGroundWeapon = any;
type CRestore        = any;
declare function CBaseEntity_Restore(
  self: CTSGroundWeapon,
  restore: CRestore,
): number;

// ---------------------------------------------------------------------------
// CTSGroundWeapon::Restore(CRestore&)
//
// Faithfully restored from:
//   tools/decompile/chunks/Restore__15CTSGroundWeaponR8CRestore.chunk.md
// Demangled: `CTSGroundWeapon::Restore(r CRestore)`
// ---------------------------------------------------------------------------

/**
 * Restore this CTSGroundWeapon's saved state.
 *
 *  1. Defer to CBaseEntity::Restore for base-entity fields.
 *  2. If that succeeded, read the 3 CTSGroundWeapon-specific typed
 *     fields via CRestore::ReadFields, returning its result verbatim.
 *
 * @param this    The CTSGroundWeapon instance being restored.
 *                The asm carries this in `esi`, as expected for a
 *                non-static instance method.
 * @param restore The engine's CRestore helper for this save/restore pass.
 * @returns       0 if CBaseEntity::Restore failed; otherwise the value
 *                CRestore::ReadFields returned (0 = fail, non-0 = ok).
 */
export function Restore(
  this: CTSGroundWeapon,
  restore: CRestore,
): number {
  // (1) Parent (base-entity) restore must succeed before we proceed.
  if (CBaseEntity_Restore(this, restore) === 0) {
    return 0;
  }

  // (2) CTSGroundWeapon-specific typed fields.
  //
  // The class-name string and the TYPEDESCRIPTION[3] array below
  // correspond to the asm's PIC-relative references:
  //     lea  eax, [ebx-0x6b6ac]   ->  class-name string
  //          [ebx+0x1b78]        ->  TYPEDESCRIPTION[3] table
  // They are static data symbols emitted next to
  // CTSGroundWeapon::Save. Their *contents* are deferred to D.4
  // (TS-specific gameplay); the asm is unambiguous about the call
  // shape (ReadFields(className, entity, typedDesc, 3)).
  const className:  string = "CTSGroundWeapon";
  const typedDesc:  any    = null; // TYPEDESCRIPTION[3] — D.4
  const fieldCount: number = 3;

  return (restore.ReadFields(
    className,
    this,
    typedDesc,
    fieldCount,
  ) as unknown) as number;
}
```
