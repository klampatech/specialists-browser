```
VERDICT: PASS-WITH-NOTES
```

**Note on scope:** This function is `CTSObjective::Save` (a per-entity Save/Restore method), **not** one of the 4 engine↔mod interface entry points listed in the HLSDK reference. So checklist items 2 (version check) and 3 (`*interfaceVersion` assignment) are **N/A** for this function — the protocol they're designed for doesn't apply. I'm only grading the 6 items that are actually relevant.

```
Checklist:
1. Signature — ✅ — `Save(this: CTSObjective, save: CSave): number` matches
   the demangled `CTSObjective::Save(CSave&)` once you make the implicit
   `this` explicit. Return is `int` → `number`. Args (1 implicit + 1
   by-ref) match.

2. Version check — N/A — not an interface function.
3. interfaceVersion assignment — N/A — not an interface function.

4. Success path — ✅ — `CSave_WriteFields(save, sectionName, this,
   typedDescriptions, 1)` correctly mirrors the disassembly. The asm
   pushes in reverse-cdecl order: `0x1`, `[ebx+0x1fe8]`, `esi`,
   `lea eax,[ebx-0x6cce9]`, `edi` → reverse-popped = `(save, section,
   this, table, 1)`. Argument order and count match. The base-class
   short-circuit (`CBaseEntity::Save` returning 0 → return 0) is also
   faithful to the `test eax,eax / jne / mov eax,0x0 / jmp epilogue`
   pattern at 0x7c234–0x7c23d.

5. No fabricated paths — ✅ — two-branch control flow only:
   (a) base save returns 0 → return 0, or
   (b) base save returns non-zero → call WriteFields, return its result.
   That is the entirety of the disassembly's control flow. No invented
   paths, no extra conditionals, no error-handling the asm doesn't have.

6. No TODO body — ✅ — the function body is real logic; the TODO is a
   single `// TODO(asm-ambiguous):` comment annotating the
   GOT-relative data references, which the conversion guidance
   explicitly allows for D.3.

7. Field names — ✅ — `this` (esi) and `save` (edi) are the correct
   conceptual targets. The two placeholders `CTSObjective_SAVE_SECTION`
   (= `[ebx-0x6cce9]` in .rodata) and `CTSObjective_TYPEDESCRIPTION_TABLE`
   (= the pointer at `[ebx+0x1fe8]` in .data) match the disassembly
   offsets exactly. ⚠️ Their *contents* (actual string + actual table
   layout) are not pinned down — that's the D.4 data-section mapping
   work the conversion guidance flags.

8. Compiles in isolation — ❌ — `CTSObjective` and `CSave` are referenced
   as TypeScript types but never defined in this snippet, and `any` is
   not used. The same applies to `CBaseEntity_Save`, `CSave_WriteFields`,
   `CTSObjective_SAVE_SECTION`, and `CTSObjective_TYPEDESCRIPTION_TABLE`
   (no `declare` / no stubs). The function will not compile in
   isolation as written. (One could argue the function/constant
   references are forward decls to be wired up later — that's
   conventional for this kind of staged decompile. But the **type
   references** are not, and the checklist explicitly says use `any`
   for unknowns.)
```

```
Issues to fix:
- Function name `Save` is too generic as a top-level export. The
  demangled name is `Save__12CTSObjectiveR5CSave` and sibling
  decompilations use the `ClassName_MethodName` form (e.g.,
  `CBaseEntity_Save` appears as a called function in this very file).
  Rename to `CTSObjective_Save` so the export doesn't collide with
  every other entity's `Save` method in the mod and so the cross-
  reference from `Restore` (0x0007c260) reads cleanly.

- `this: CTSObjective` and `save: CSave` will not compile in isolation.
  Either use `any` (per the checklist's instruction) or add minimal
  `CTSObjective` / `CSave` type stubs in this file. (The forward-
  decl pattern `declare class CTSObjective {}` and similar for CSave
  is the cleanest fix; `any` is the checklist-preferred fallback.)

- The placeholder names `CTSObjective_SAVE_SECTION` and
  `CTSObjective_TYPEDESCRIPTION_TABLE` are fine as forward references,
  but they should be explicitly marked as unresolved — either via
  `declare const` (if you want the file to compile) or via a clear
  `// D.4: data-section mapping required` note. Right now they look
  like they'll be defined elsewhere but the file gives no signal.
```

```
Suggested rewrite:

```typescript
/**
 * CTSObjective::Save — Serialize this CTSObjective entity into a
 * save buffer.
 *
 * First delegates the base-class portion to CBaseEntity::Save, then
 * writes one CTSObjective-specific typed-field block via
 * CSave::WriteFields. In the original 32-bit MSVC build, `this` is
 * the entity pointer, `save` is the engine's CSave helper, and the
 * return is an int (0 = failure / "stop saving this entity",
 * non-zero = success).
 *
 * Demangled: Save__12CTSObjectiveR5CSave
 * Address:   0x0007c210, 80 bytes
 * Class:     CTSObjective (TS gameplay entity)
 * Sibling:   Restore__12CTSObjectiveR8CRestore at 0x0007c260
 */

// Minimal type stubs so this file compiles in isolation. These get
// fleshed out in D.4 (CTSObjective) and D.5 (CSave / CBaseEntity).
declare class CTSObjective {}
declare class CSave {}
declare function CBaseEntity_Save(this: any, save: CSave): number;
declare function CSave_WriteFields(
  save: CSave,
  sectionName: string,
  baseData: any,
  typedDescriptions: any,
  fieldCount: number,
): number;

// D.4 follow-up: pin down the actual section name + TYPEDESCRIPTION
// table by mapping [ebx-0x6cce9] and [ebx+0x1fe8] into the mod's
// .rodata / .data. For now, declare the symbols so the file
// compiles.
declare const CTSObjective_SAVE_SECTION: string;
declare const CTSObjective_TYPEDESCRIPTION_TABLE: any;

export function CTSObjective_Save(this: CTSObjective, save: CSave): number {
  // 1) Let the base class save its fields first. If CBaseEntity::Save
  //    returns 0, the engine treats the save as failed for this entity
  //    — bail out before writing any subclass-specific fields.
  if (CBaseEntity_Save(this, save) === 0) {
    return 0;
  }

  // 2) Write the single CTSObjective-specific typed field block.
  //    CSave::WriteFields(save, sectionName, this, typedDescriptions, 1)
  //
  //    Argument order comes from the asm's push sequence (reverse-cdecl):
  //      push 0x1                        ; fieldCount
  //      push [ebx+0x1fe8]              ; TYPEDESCRIPTION table
  //      push esi                        ; this
  //      lea eax, [ebx-0x6cce9]          ; section name string
  //      push eax                        ; section name
  //      push edi                        ; save (this for WriteFields)
  //      call CSave::WriteFields
  //
  // TODO(asm-ambiguous): the section-name string ([ebx-0x6cce9]) and
  //    the TYPEDESCRIPTION table pointer ([ebx+0x1fe8]) live in
  //    .rodata / .data and need a data-section mapping (D.4 work) to
  //    pin down their actual values. They are referenced here via
  //    named constants matching the GOT-relative addresses.
  return CSave_WriteFields(
    save,
    CTSObjective_SAVE_SECTION,         // [ebx-0x6cce9]
    this,
    CTSObjective_TYPEDESCRIPTION_TABLE, // [ebx+0x1fe8]
    1,
  );
}
```

Bottom line: the logic is correct and faithful to the disassembly, the control flow and argument order are both right, and the `TODO(asm-ambiguous)` placement is appropriate. The only real defects are surface-level — the generic export name and the missing `declare` stubs — both trivial to fix. The deeper D.4 work (mapping the GOT-relative data references to actual `.rodata` / `.data` contents) is correctly flagged as out of scope for D.3.
