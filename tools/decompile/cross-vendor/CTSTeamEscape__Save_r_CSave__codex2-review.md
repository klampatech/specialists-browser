**Rubric mismatch up front** — the function under review is `CTSTeamEscape::Save`, a C++ class method on a gameplay entity. It is not one of the 4 engine↔mod entry points covered by the HLSDK reference (`GiveFnptrsToDll`, `GetEntityAPI`, `GetEntityAPI2`, `GetNewDLLFunctions`). Checklist items 2 and 3 (version check, `*interfaceVersion` assignment) are categorically not part of `Save`'s contract — they belong to the two `Get*API*` exports. I'm marking those N/A and applying the rest of the rubric against the disassembly.

```
VERDICT: PASS-WITH-NOTES

Checklist:
1. Signature — ⚠️ — Doesn't match a referenced export (there is no
   referenced Save function), but matches the demangled symbol
   `Save__13CTSTeamEscapeR5CSave` → (CTSTeamEscape*, CSave&) → int.
   TS shape `(this: CTSTeamEscape, save: CSave): number` is faithful.

2. Version check — ⚠️ — N/A. `Save` doesn't negotiate an interface
   version. The disassembly's `test eax,eax / jne` is a parent-call
   success gate, not a version check. TS reads it correctly.

3. interfaceVersion assignment — ⚠️ — N/A. Same reason. No pointer
   to write back to here.

4. Success path — ✅ — Calls `save.WriteFields(name, this, fields, 1)`.
   Right-to-left cdecl arg order matches the assembly's 5-push
   sequence (edi save, eax name, esi data, [ebx+0x1ac4] fields, 1).

5. No fabricated paths — ✅ — Both branches (parent fail → return 0;
   parent success → WriteFields + fall through epilogue) map 1:1 to
   the disassembly. No invented control flow.

6. No TODO body — ⚠️ — TODOs are scoped to TYPEDESCRIPTION layout
   and the GOT-relative string literal, not used to dodge the actual
   logic (parent call, conditional return, WriteFields call). Body
   isn't a stub.

7. Field names — ✅ — `CTSTeamEscape`, `CTSObjective`, `CSave`,
   `WriteFields` are all HLSDK / TS-known names. No invented fields.
   The hardcoded "CTSTeamEscape" string needs confirmation against
   the literal at GOT-0x6ccbb, but the TODO flags it.

8. Compiles in isolation — ❌ — depends on `CTSTeamEscape`,
   `CTSObjective`, `CSave`, and the `save.WriteFields(...)` method
   shape — none defined here. Rubric allows `any` for unknowns but
   not for missing methods/types we call into. Fine as a decompile
   artifact; not fine as a standalone unit.
```

**Issues to fix:**

- **`return save.WriteFields(...)` is wrong.** In HLSDK, `CSave::WriteFields` is `void`. In TS that means `undefined`, not whatever the C `eax` happens to contain. The disassembly deliberately does *not* capture a return value (the call site is `call → add esp,0x20 → epilogue`), and the leading TS comment "On the success path, returns whatever CSave::WriteFields returns" is incorrect — `WriteFields` doesn't return anything; the binary just lets `eax` flow out undefined. The HL Save/Restore convention is `1 = success`, so the TS should explicitly `return 1` on the success path.
- **GOT-relative string literal** at `[ebx-0x6ccbb]` is asserted as `"CTSTeamEscape"`. The TODO is in the right place; just double-check against `strings-n5.txt` before this lands. If it ends up being a *field name* (e.g. `"m_iSomething"`) rather than a class name, the call shape is still correct, just the literal changes.
- **TYPEDESCRIPTION\*** at GOT+0x1ac4 placeholder `undefined as any` is fine for D.3 but must be replaced in D.4 when `CTSTeamEscape`'s field table gets emitted. Suggest at minimum a `// TODO(D.4): ...` anchor with a code-review-targetable note.

**Suggested rewrite:**

```typescript
/**
 * CTSTeamEscape::Save — persist a CTSTeamEscape entity to the
 * GoldSrc save buffer.
 *
 *   1. Run CTSObjective::Save on this instance, propagating its
 *      success/failure (1/0) back to the caller.
 *   2. On success, write CTSTeamEscape-specific fields via
 *      CSave::WriteFields.
 *
 * The HL Save/Restore convention is int return, 1 = success.
 * CSave::WriteFields is `void` in HLSDK, so we do not propagate
 * its (non-existent) return value — the disassembly leaves eax
 * to flow out whatever-it-was on the success path, which is the
 * C ABI equivalent of "no defined return"; we pick the convention
 * value (1) explicitly.
 */
export function Save(this: CTSTeamEscape, save: CSave): number {
  // 1. Parent save. Disassembly: `test eax,eax / jne` — non-zero
  //    (success) skips the explicit `mov eax, 0` and falls through
  //    to WriteFields.
  if ((this as unknown as CTSObjective).Save(save) === 0) {
    return 0;
  }

  // 2. CTSTeamEscape-specific field table.
  //    Disassembly pushes (right-to-left cdecl):
  //      edi                       CSave& save            (implicit this)
  //      lea eax,[ebx - 0x6ccbb]   const char* className
  //      esi                       void* data == this
  //      [ebx + 0x1ac4]            TYPEDESCRIPTION* fields
  //      1                         int numFields
  save.WriteFields(
    /* name      */ "CTSTeamEscape", // TODO(verify-D.4): confirm against GOT-0x6ccbb literal
    /* data      */ this,
    /* fields    */ undefined as any, // TODO(D.4): TYPEDESCRIPTION layout from CTSTeamEscape's table
    /* numFields */ 1,
  );

  return 1;
}
```

If the next task in `HANDOFF.md` is D.3 (interface exports) rather than D.4 (TS-specific entity classes), please flag the rubric mismatch to Kyle before this review lands — the review rubric above is auto-generated for the interface exports and won't usefully grade any of the gameplay-class `Save`/`Restore` pairs we have coming.
