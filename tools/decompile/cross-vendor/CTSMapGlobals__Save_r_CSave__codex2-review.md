VERDICT: PASS-WITH-NOTES

```
Checklist:
1. Signature — ✅ pass —
   The TS signature `Save(this: CTSMapGlobals, save: CSave): number`
   matches the demangled symbol `Save__13CTSMapGlobalsR5CSave`
   (i.e., `CTSMapGlobals::Save(CSave&)`) with `this` + reference
   arg and an `int`-shaped return (HLSDK save methods return 1/0).
   Name and arity are faithful.

2. Version check pattern — ⚠️ N/A —
   This is not one of the engine interface functions
   (`GetEntityAPI*` / `GetNewDLLFunctions`) the checklist was
   designed for, so the "interface version" item doesn't apply.
   The closest analog in this function — the
   `test eax,eax ; jne 624b8` validation of
   `CBaseEntity::Save`'s return — IS correctly captured by the
   `if (CBaseEntity.Save(...) === 0) return 0;` early-out.

3. *interfaceVersion assignment-back — ⚠️ N/A —
   There is no `*interfaceVersion` parameter on this function.
   The failure path correctly returns 0 without touching any
   caller-visible out-param, which matches the disassembly.

4. Success path — ⚠️ needs review —
   On success, the TS calls
     save.WriteFields(
       "CTSMapGlobals",
       this,
       CTSMapGlobals_TypeDescriptors,
       2
     )
   Argument order, count, and literal values match the
   disassembly:
     - "CTSMapGlobals" ↔ `lea eax, [ebx-0x6ed6f]` (rodata class-name)
     - this              ↔ `push esi`
     - type-descriptors  ↔ `push DWORD PTR [ebx+0x1d8c]`
     - 2                 ↔ `push 0x2`
     - save              ↔ `push edi`
   However, the EARLIER success-path branch that forwards to the
   base class (item 5 below) is wrong, so this item is downgraded.

5. No fabricated code paths — ❌ fail —
   The disassembly at 624a2-624a4 does:
       push edi          ; save  (2nd arg)
       push esi          ; this  (1st arg)
       call  Save__11CBaseEntityR5CSave@plt
   which passes TWO stack args to `CBaseEntity::Save`. The TS
   decompiled it as:
       if (CBaseEntity.Save(save) === 0) { return 0; }
   which is ONE stack arg. The `this` push is missing. That
   call as written is either undefined behavior at runtime (if
   `Save` is a class method) or a type error (if `Save` is typed
   as `(this, save) => number`). Either way, the disassembly's
   two-arg call form has been collapsed to a one-arg form — a
   fabrication of a call shape that doesn't exist in the binary.

6. No TODO body — ✅ pass —
   The two `// TODO` / `// TODO(asm-ambiguous)` blocks are inline
   clarifications of the forward-declared types and the
   GOT-relative descriptor table; the actual logic
   (forward → CBaseEntity::Save → CSave::WriteFields) is
   expressed in real code.

7. Field names — ✅ pass —
   `CTSMapGlobals`, `CSave`, `CBaseEntity`, `WriteFields`,
   `Save`, and the proposed `CTSMapGlobals_TypeDescriptors` all
   map to known HLSDK / TS C++ identifiers. Nothing invented.

8. Compiles in isolation — ⚠️ needs review —
   Will not type-check as written: `CBaseEntity.Save(save)` has
   the wrong arity. With the fix from item 5 plus forward `any`
   declarations / casts for `CSave`, `CBaseEntity`, `CTSMapGlobals`,
   and `CTSMapGlobals_TypeDescriptors` (already noted in the doc
   comment), it will compile.
```

Issues to fix:
- **Bug (item 5):** the `CBaseEntity.Save(save)` call is missing its `this` argument. Per the disassembly, the base-class save is dispatched with *two* stack args: `(this, save)`. Fix to either `CBaseEntity.Save(this, save)` (free-function style — faithful to the demangled `Save__11CBaseEntityR5CSave` PLT call) or `super.Save(save)` (instance-method style). I'd prefer the former since the rest of the file treats methods this way.
- **Minor:** magic literal `2` for `fieldCount`. For a 1:1 decompile matching `push 0x2`, the literal is correct and reads cleanly against the assembly. A `// TSMapGlobals_TypeDescriptors.length` follow-up would be a D.4 task, not a D.3 fix.
- **Minor:** the doc comment already correctly flags the forward declarations of `CSave` / `CBaseEntity` / `CTSMapGlobals_TypeDescriptors` as TODOs — keep that, but pin down the exact shape: `CTSMapGlobals_TypeDescriptors: any[]` of length 2, with one float + one `CBaseEntity*` slot (the typical pattern for a `BEGIN_TYPEDESCRIPTION` block on a subclass that adds one scalar and one entity-handle field). That's a D.4 discovery; for D.3 the placeholder name is fine.

Suggested rewrite:
```typescript
/**
 * CTSMapGlobals::Save(CSave&) — serialize the CTSMapGlobals entity
 * state by first delegating to CBaseEntity::Save, then writing the
 * typed fields declared on this class via CSave::WriteFields.
 *
 * Address: 0x00062488  Size: 80 bytes
 * Demangled symbol: Save__13CTSMapGlobalsR5CSave
 *   → "Save(CTSMapGlobals&, CSave&)" — i.e., an instance method
 *     emitted in this binary with the (this, save) two-arg form.
 *
 * @param this  The CTSMapGlobals entity instance (C++ `this`)
 * @param save  The CSave destination (passed by reference)
 * @returns     CSave::WriteFields' return value on success;
 *              0 if the base CBaseEntity::Save chain failed.
 */

// TODO(asm-ambiguous): CSave / CBaseEntity / CTSMapGlobals are
//   engine / mod types not yet stubbed in our TS model — treat
//   them as forward `any` declarations for D.3.
// TODO(asm-ambiguous): [ebx+0x1d8c] is a GOT-relative global
//   referencing the typed-save descriptor table (2 entries) for
//   CTSMapGlobals. Forward-declare
//     const CTSMapGlobals_TypeDescriptors: any[] = [/* 2 entries */];
//   Real shape (one float, one CBaseEntity*) is a D.4 task.

export function Save(this: CTSMapGlobals, save: CSave): number {
  // First call into the base class. The disassembly at 624a2-624a4
  // pushes both `esi` (this) and `edi` (save) before the PLT call
  // to Save__11CBaseEntityR5CSave — i.e., the base-class save is
  // dispatched in the same two-arg (this, save) shape as ours.
  if (CBaseEntity.Save(this as CBaseEntity, save) === 0) {
    return 0; // 624b0: mov eax, 0x0 ; jmp 624d4
  }

  // CSave::WriteFields(CSave&, char const*, void*, TYPEDESCRIPTION*, int)
  // Pushed right-to-left at 624bb-624cc; order on the wire is
  // (save, "CTSMapGlobals", this, descriptors, 2). The string literal
  // is the GOT-relative rodata at ebx-0x6ed6f; the descriptor table
  // pointer is at ebx+0x1d8c; the count is the literal `push 0x2`.
  return save.WriteFields(
    "CTSMapGlobals",                // classname (rodata via GOT)
    this,                          // entity state base
    CTSMapGlobals_TypeDescriptors, // typed-description table
    2                              // field count
  );
}
```

Notes for the dispatcher (you, picking this up next):

- The fix above is the only behavioral change needed for D.3 fidelity. Once `CBaseEntity` is wired up (D.5), the `as CBaseEntity` cast becomes either unnecessary or a typed upcast.
- The actual fields in `CTSMapGlobals_TypeDescriptors` are out of scope for D.3 but should be derived from a `BEGIN_TYPEDESCRIPTION(CTSMapGlobals) / END_TYPEDESCRIPTION` macro dump (D.4) — typically the HLSDK pattern is one typed entry per `DEFINE_FIELD` line in the body, with one being a `DEFINE_FIELD_FLOAT` style scalar and one being a `DEFINE_FIELD` style entity-handle field. The count being exactly 2 is the strongest hint, and matches the assembly's `push 0x2`.
- No AGENTS.md / HANDOFF.md updates needed from this review — the file under review is in-progress decompilation, not committed code.
