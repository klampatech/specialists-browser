```
VERDICT: PASS-WITH-NOTES

Notes on the review template: the HLSDK reference section describes the 4
engine↔mod interface functions (GiveFnptrsToDll, GetEntityAPI,
GetEntityAPI2, GetNewDLLFunctions), not gameplay entity methods like
CTSEmitter::Spawn. Items 1–3 of the checklist don't directly apply to a
class method — they describe the interface-function contract. I'm grading
them N/A below and evaluating items 4–8 against the disassembly +
conversion guidance instead.

Checklist:
1. Signature — ⚠️ — HLSDK reference does not cover CTSEmitter::Spawn (it's
   a gameplay method, not an interface function). However, the TS signature
   `function Spawn(this: CTSEmitter): void` matches the disassembly:
   `this` is loaded from `[esp+0x20]` (first stack arg, cdecl-style with
   `this` on stack rather than in ECX — see issue below), and the function
   returns no value (no `mov eax, …` before `ret`).

2. Version check — N/A — Not an interface function.

3. interfaceVersion assignment-back — N/A — Not an interface function.

4. Success-path data flow — ✅ — The 12-byte origin copy at 0x64241–0x64247
   (`cld; mov ecx, 0x3; rep movsd`) is correctly captured as three dword
   assignments (`field_0x6c[0..2] = field_0[2..4]`). The thunk patch at
   0x641eb–0x64202 is captured, the `CheckValues` call is captured, the
   `pev->nextthink`-style float store at 0x64227–0x6422f is captured
   (`field_0[0x104] = const + global`), and the unconditional UTIL_Remove
   at 0x64277–0x6427b is captured.

5. No fabricated paths — ✅ — Every branch comes from the disassembly. The
   double UTIL_Remove pattern (one inside the `field_0x64 == -1` branch at
   0x6426f, one unconditional at 0x6427b) is correctly preserved. The
   `jne 0x64277` maps cleanly to `if (field_0x64 === -1) { … }`. The
   `pfnAlertMessage(at_warning=4, fmt, 0x200)` call is preserved.

6. No comment-only TODO body — ⚠️ — The body expresses real logic, but
   many operations read from placeholder identifiers (RO_DATA_AT_0x6EC6D,
   GLOBAL_AT_0x1600, GLOBAL_AT_0x12F0, DOUBLE_CONST_AT_0x6EAC8,
   ENGINE_FUNC_AT_0x1AA8_PLUS_0xF4, EMITTER_ERROR_FORMAT_STRING). These
   are acceptable per the D.3 conversion guidance (which says "use `any`
   for unknowns") and they're explicitly flagged as TODO/D.4 placeholders
   in the comments. But the function still reads as "do X with placeholder
   Y" rather than coherent domain logic. D.4 should resolve them.

7. Field names — ⚠️ — Field names are placeholders (`field_0`, `field_0xc`,
   `field_0x10`, `field_0x64`, `field_0x6c`, `field_0x104`). Per D.3 these
   are allowed, but the conversion guidance asks us to "infer the field's
   purpose from the operations." Likely mapping (for D.4):
 - field_0       → pev (entvars_t*)
     - field_0xc     → unknown dword (set to 0xFFFF0000)
     - field_0x10    → unknown dword/ptr (set from a global)
     - field_0x64    → likely a modelindex or spriteindex (compared to -1)
     - field_0x6c    → cached vec3_t (12 bytes, copied from pev->origin)
     - field_0[0x104]→ pev->nextthink (float)
   The TS would be stronger with one-line comments attaching each
   placeholder to its likely C struct member.

8. Compiles in isolation — ❌ — The function references many undeclared
   identifiers: CTSEmitter (type), CheckValues, UTIL_Remove (functions),
   RO_DATA_AT_0x6EC6D, GLOBAL_AT_0x1600, GLOBAL_AT_0x12F0,
   DOUBLE_CONST_AT_0x6EAC8, GLOBAL_AT_0x1600_VALUE,
   ENGINE_FUNC_AT_0x1AA8_PLUS_0xF4, EMITTER_ERROR_FORMAT_STRING (globals/
   constants). Per the conversion guidance ("The output should compile in
   isolation (no external type references we don't define here; use `any`
   for unknowns)"), these need stub `declare` statements or `any`
   annotations.

Issues to fix:
- **Compiles in isolation (item 8):** add stub declarations so the
  function type-checks standalone. Suggested:
  ```typescript
  declare const CTSEmitter: any;
  declare function CheckValues(this: any): void;
  declare function UTIL_Remove(this: any): void;
  declare const RO_DATA_AT_0x6EC6D: any;
  declare const GLOBAL_AT_0x1600: any;
  declare const GLOBAL_AT_0x12F0: number;
  declare const DOUBLE_CONST_AT_0x6EAC8: number;
  declare const GLOBAL_AT_0x1600_VALUE: number;
  declare const ENGINE_FUNC_AT_0x1AA8_PLUS_0xF4: (...args: any[]) => void;
  declare const EMITTER_ERROR_FORMAT_STRING: string;
  ```
  (Or wrap the function body in a module-scoped `// @ts-nocheck` for D.3.)

- **Indexing inconsistency on `field_0[…]`:** the TS uses dword-indexing
  for some accesses (`field_0[2..4]` for `pev->origin`, which is byte  offset 8) and byte-indexing for others (`field_0[0x104]` for
  `pev->nextthink`, which is byte offset 0x104). Same issue on
  `GLOBAL_AT_0x1600[0x98]`: if `GLOBAL_AT_0x1600` is meant as an Int32
  pointer (consistent with `field_0[2]`), then `[0x98]` should be `[0x26]`
  for byte offset 0x98. Pick one convention (dword-indexed everywhere,
  or byte-indexed everywhere) and apply it consistently. The TS author's
  inline comment `(*global_at_0x1600)[0x98]` correctly implies two
  derefs plus a byte offset, which lines up with the disassembly only if
  `[…]` is byte-indexed. So prefer byte-indexing for all of `field_0[…]`
  and `GLOBAL_AT_0x1600[…]`, or rename the indirection so the indexing
  semantics are unambiguous (e.g., `field_0_dwords[0x41]`,
  `GLOBAL_AT_0x1600_bytes[0x98]`).

- **Calling convention for `CheckValues`:** the disassembly sets
  `ECX = this->field_0` at 0x641eb and then does `sub esp, 0xc; push ebp;
  call CheckValues__10CTSEmitter@plt` at 0x64204–0x64208. If `CheckValues`
  is `thiscall`, the `this` arg is in `ecx` — meaning `CheckValues` is
  actually invoked with `this = this->field_0`, not `this`. The TS's
  `CheckValues(this)` may not match. Two possibilities:
  (a) `field_0` is `pev` and `CheckValues` is effectively `CheckValues(pev, this)` — TS should be `CheckValues(this.field_0, this)`.
  (b) `CheckValues` is cdecl and reads `this` off the stack — TS is fine,
      but then the ECX load was for the thunk patch (which writes back to
      `[ecx]` at 0x64202), not for `CheckValues`.
  Worth cross-checking against the `CheckValues` disassembly before
  declaring the TS correct.

- **`pfnAlertMessage` 0x200 arg:** `0x200` (512) is passed as the first
  varargs slot. Without the format string at `[ebx - 0x6eb50]`, it's
  unclear what this encodes (entity index? delay? buffer size?). The TS
  passes it as a raw int. Acceptable as a placeholder; flag for D.4 to
  identify the format string and confirm the vararg meaning.

- **Float-vs-double in the `nextthink` store:** the disassembly does
  `fld QWORD; fadd DWORD; fstp DWORD` — load 64-bit double, add 32-bit
  float, store 32-bit float. The TS collapses both to plain `number`
  addition. In JS/TS this is fine (numbers are doubles), but if engine
  semantics depend on the original 32-bit float truncation at the store,
  flag for D.4 to confirm.

- **HLSDK reference mismatch (informational):** the HLSDK reference is
  for the 4 entry-point exports, not gameplay entity methods. Future
  reviews of `Spawn`-style methods should use a different reference (the
  entity base class + TS mod source if available), or omit items 1–3 of
  the checklist.

Suggested rewrite (not a full rewrite — just the isolation fix + the
indexing convention fix + a one-line "likely field" comment per field):

```typescript
// D.3 stub declarations so this file type-checks in isolation.
declare const CTSEmitter: any;
declare function CheckValues(this: any): void;
declare function UTIL_Remove(this: any): void;
// Globals via [ebx ± offset] in the PIC setup — names TBD by D.4.
declare const RO_DATA_AT_0x6EC6D: number;
declare const GLOBAL_AT_0x1600: any;       // ptr (loaded twice: → ESI, then EDX)
declare const GLOBAL_AT_0x12F0: number;
declare const DOUBLE_CONST_AT_0x6EAC8: number;
declare const ENGINE_FUNC_AT_0x1AA8_PLUS_0xF4: (...args: any[]) => void;
declare const EMITTER_ERROR_FORMAT_STRING: string;

/**
 * CTSEmitter::Spawn — initializes the Emitter marker and removes it.
 * The Emitter is a transient level-design marker (see HANDOFF.md D.3).
 */
export function Spawn(this: CTSEmitter): void {
  // PIC: GOT base = 0x165e10 (= 0x641e0 + 0x101c30).

  // 1. Per-instance vtable thunk patch.
  //    *this.field_0 (= pev[0] or a CTSEmitter-internal dispatch slot)
  //      ← rodata_addr − *( *(GLOBAL_AT_0x1600) + 0x98 )
  //    TODO(D.4): identify which struct member field_0 is, and which
  //    vtable/struct GLOBAL_AT_0x1600 points into.
  (this as any).field_0[0] =
    RO_DATA_AT_0x6EC6D - GLOBAL_AT_0x1600[0x98];   // byte-indexed, matches asm

  // 2. Validate keyvalues (TODO: confirm whether CheckValues reads `this`
  //    from ECX=this.field_0 or from the stack; disassembly is ambiguous).
  CheckValues(this);

  // 3. Default fields — likely CTSEmitter bookkeeping, NOT pev fields.
  //    field_0xc ← 0xFFFF0000  (a flag word? render-mode bits?)
  //    field_0x10 ← global pointer (a cached sprite/model handle?)
  (this as any).field_0xc = 0xffff0000;
  (this as any).field_0x10 = GLOBAL_AT_0x12F0;

  // 4. pev->nextthink = (double)const + (float)global — stored as float.
  //    field_0[0x104] is byte offset 0x104 from field_0 (likely pev->nextthink).
  (this as any).field_0[0x104] =
    DOUBLE_CONST_AT_0x6EAC8 + GLOBAL_AT_0x1600_VALUE;

  // 5. Cache pev->origin (12 bytes) into this.field_0x6c (CTSEmitter m_vecEmitOrigin?).
  //    field_0[2..4] is dword indices at byte offsets 8..20 (= pev->origin).
  //    Convention note: switch this to byte indexing if you also switch
  //    field_0[0x104] above — don't mix.
  const pev = (this as any).field_0;
  (this as any).field_0x6c[0] = pev[2];
  (this as any).field_0x6c[1] = pev[3];
  (this as any).field_0x6c[2] = pev[4];

  // 6. If a required field is unset (no model — field_0x64 == -1), warn + remove.
  if ((this as any).field_0x64 === -1) {
    ENGINE_FUNC_AT_0x1AA8_PLUS_0xF4(
      4,                        // at_warning
      EMITTER_ERROR_FORMAT_STRING,
      0x200 // varargs: TBD by D.4 (entity index? delay?)
    );
    UTIL_Remove(this);
  }

  // 7. Always remove — Emitter is a marker, not runtime state.
  //    (In the field_0x64 == -1 branch above, this is the SECOND  //    UTIL_Remove; in the normal branch, the only one. UTIL_Remove is
  //    idempotent — likely a code-gen artifact rather than intentional.)
  UTIL_Remove(this);
}
```

The main changes vs the original TS: stub `declare`s for isolation
(item8), explicit `(this as any).field_*` to keep type-checking happy,
a one-line "likely field" comment per offset for D.4 hand-off, and a
callout that the `field_0[…]` indexing convention needs to be made
consistent before D.4.
```
