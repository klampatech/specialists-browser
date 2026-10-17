I need to flag a structural mismatch up front: the review prompt's HLSDK reference and checklist target the engine↔mod interface functions (`GiveFnptrsToDll`, `GetEntityAPI*`, `GetNewDLLFunctions`), but the function under review is `CTSSharedEmitter::SV_UpdateClient(int)` — a TS gameplay method, not an API export. I'll apply the spirit of the checklist to the actual function, plus the items that do transfer (signature, no-fabrication, no-TODO-body, compiles-in-isolation, field-name faithfulness).

I also did not open `HANDOFF.md` / `SPEC.md` — the task is a one-shot review of code provided inline, no commit, no project state change. If this review should land in the repo (e.g., as `tools/decompile/reviews/prN-...md`), tell me and I'll write it under the read-only sandbox via PR.

---

```
VERDICT: FAIL (one structural bug: wrong base pointer)

Checklist:
1. Signature — ⚠️ — `SV_UpdateClient(this: CTSSharedEmitter, arg: number): void`
   matches the demangled `CTSSharedEmitter::SV_UpdateClient(int)` in name and
   arity. The Itanium pre-cxxabi suffix `__16CTSSharedEmitteri` decodes to
   `(this*, int)`, so the explicit `(arg: number)` plus implicit `this`
   binding is correct. Type `void` matches no-return. OK in shape, but see
   issue #1 below — the function body uses the wrong one of these two
   parameters as the slot-array base.

2. Version check pattern — N/A — function is not a `GetEntityAPI*` /
   `GetNewDLLFunctions` export. Skipped.

3. *interfaceVersion assignment-back — N/A — not an interface function.

4. Success path: struct copy / equivalent — ✅ — the function does NOT do a
   struct copy. It walks a per-recipient array and calls engine vtable
   entries (0x120 / 0xb8 / 0xc0 / 0xbc). The TS's   `broadcastSlotUpdate(engine, arg)` helper faithfully captures the
   BeginMessage / WriteXXX / WriteByte / EndMessage quad at each iteration.

5. No fabricated code paths — ✅ — every control-flow branch in the TS
   maps to a branch in the disassembly:
     - top of loop          → `cmp [esp+0x8], 0x1ff; jle`
     - field0 != 0 test → `cmp [ebp+0x0], 0; je e82f0`
     - field1 != 0 test     → `cmp [ebp+4], 0; je e8330`
     - the two inner blocks → identical engine-call quads
   No invented `else`, no early-return, no extra branches. ✓

6. No comment-only TODO body — ✅ — body is real code; TODO comments
   appear only in `declare`s and JSDoc, which is appropriate for a stub.

7. Field names — ❌ — three issues:
     - **CRITICAL:** `const slotBase = (arg + 0x800) >>> 0` uses `arg`,
       but the assembly's `mov ebp, [esp+0x20]` reads `[esp+0x20]` which
       after prologue+sub is `[entry_esp + 4]` = the IMPLICIT `this` arg
       (1st ABI slot). `arg` (the explicit `int`) lives at
       `[entry_esp + 8]`, which the inner block pushes into
       `engine[0x120]`. So `this + 0x800` is the slot base, not `arg + 0x800`.
     - `MEM_U32[slotAddr]` / `MEM_U32[slotAddr + 4]` index a `Uint32Array`
       by what looks like a byte offset, but `Uint32Array` is element-
       indexed. As written, `MEM_U32[slotAddr]` reads the dword at element
       index `slotAddr` (= byte offset `slotAddr * 4`). Either rename to
       `MEM_U32[slotAddr >>> 2]`, use a `DataView`, or use the GOT semantics the engine binding actually exposes.
     - `MEM_U32[*(GLOBAL_AT_0x1CF8)]` does the same element-vs-byte
       indexing and stacks a C-style `*` deref on top of a TS `any`. The
       assembly pattern is `mov eax, [ebx+0x1cf8]; mov esi, [eax]` — a
       pointer-to-pointer chain. The TS should model that as a single
       `loadU32(loadPtr(GOT_0x1CF8))` or similar, not `MEM_U32[*GLOBAL]`.

8. Compiles in isolation — ✅ — `declare class CTSSharedEmitter {}`,
   `declare const ENGINE_GLOBAL: any`, `declare const GLOBAL_AT_0x1CF8:
   any`, `declare const MEM_U32: any` cover the unknowns; the rest is
   `any`-typed. No external type references are left dangling.
```

---

## Issues to fix

- **[BLOCKER] `slotBase` uses the wrong ABI arg.** `this` (the implicit
  CTSSharedEmitter `this*`) is at `[esp+0x20]` after the prologue and is
  the base for the 256 × 8-byte slot array at offset 0x800. The explicit
  `int arg` (at `[esp+0x30]` post-inner-sub) is the recipient id passed
  to `engine[0x120]`. The current TS has these two roles swapped at the
  `slotBase` site. Fix: `slotBase` must come from `this`, not `arg`.
- **`Uint32Array` indexing is byte-confused.** `MEM_U32[slotAddr]`
  silently reads at byte offset `slotAddr * 4`. Either divide by 4
  (`>>> 2`) or change the memory model to a `DataView`. Same for
  `MEM_U32[*(GLOBAL_AT_0x1CF8)]`.
- **`*(GLOBAL_AT_0x1CF8)` semantics.** The C deref chain  `[ebx+0x1cf8] → [eax]` is a singleton pointer-to-pointer; in TS, model
  it explicitly as `loadU32(loadPtr(GOT_BASE + 0x1cf8))` or similar, with
  a short comment explaining the two-step load.
- **`engine` global naming.** `[ebx+0x1aa8]` is the engine vtable
  pointer, not a generic global. Rename `ENGINE_GLOBAL` → `ENGINE_VTABLE`
  (or similar) so it's not confused with the `gpGlobals` / `g_engfuncs`
  tables.
- **JSDoc drift.** The doc says *"Per-recipient base. The 256×8-byte
  state array starts at `arg + 0x800`"* — but the base is on `this`, not
  `arg`. Once the variable is corrected, update the doc.
- **No comment for the `[esp+0x20]` / `[esp+0x30]` asymmetry.** A short
  `// TODO(asm-ambiguous): this lives at [esp+0x20]; arg lives at
  [esp+0x30] after the inner sub` note would make future readers' lives
  easier and prevent the same swap from re-occurring.

Everything else — the loop bounds (`i <= 0x1ff`, `i += 2`), the
field0/field1 conditional structure, the engine-call quad, the helper
factoring of the duplicated inner block — is correct.

---

## Suggested rewrite

```typescript
// TODO(D.4): the real CTSSharedEmitter class definition. Stub for typecheck.
declare class CTSSharedEmitter {
  // The256×8-byte per-recipient state array lives on `this` at offset
  // 0x800 in the original C++ layout. Model it explicitly when D.4
  // reconstructs the class.
  // m_pSlots: number; // byte offset within the entity blob
}

// TODO: runtime globals — defined elsewhere by the engine binding layer.
declare const ENGINE_VTABLE: any;     // [GOT + 0x1aa8]: engine vtable ptr
declare const GOT_0x1CF8: any;        // [GOT + 0x1cf8]: pointer-to-singleton
declare const MEM_U32: any;           // shared memory as Uint32Array view // (element-indexed; shift offsets >>> 2)

// Helper: load a u32 from a byte offset within MEM_U32's underlying buffer.
declare function loadU32(byteOffset: number): number;
// Helper: dereference a "pointer" (just a number/byte offset here) and read
// the pointed-to u32.
declare function loadPtr(addr: number): number;

/**
 * CTSSharedEmitter::SV_UpdateClient — broadcast shared-emitter state
 * updates to one recipient.
 *
 * Walks the 256 × 8-byte slot array at `this + 0x800` (NOT at `arg +
 * 0x800` — the assembly's `mov ebp, [esp+0x20]` reads the implicit
 * `this*` arg, not the explicit `int`). For each non-zero slot dword,
 * emits a MESSAGE_BEGIN / WRITE_* / WRITE_BYTE / MESSAGE_END quad * through the engine vtable. The `int arg` is the recipient id, passed
 * into `engine[0x120]` (BeginMessage recipient selector).
 *
 * ABI note: the function takes (this*, int). After prologue + outer
 * `sub esp,0xc`, `this` is at [esp+0x20] and the inner `sub esp,0xc`
 * shifts `arg` to [esp+0x30] for the engine call.
 *
 * @param this  The CTSSharedEmitter entity. `this + 0x800` is the base
 *              of the 256 × 8-byte per-recipient slot array.
 * @param arg   Recipient id (int). Passed to `engine[0x120]` and to
 *                  `[edi+0xb8]` as the buffer param via `eax`.
 * @returns     void
 */
export function SV_UpdateClient(this: CTSSharedEmitter, arg: number): void {
  // Engine vtable — loaded into edi once at the top, reused per iteration.
  const engine: any = ENGINE_VTABLE;

  // 256 slots, 8 bytes each (field0 at [ebp+0x0], field1 at [ebp+0x4]).
  // Loop counter ticks by 2 per iteration, tops out at 0x1ff inclusive.
  // Base comes from `this` (NOT `arg`), per the assembly's
  // `mov ebp, [esp+0x20]; add ebp, 0x800`.
  const thisAddr = (this as unknown as number) >>> 0;
  const slotBase = thisAddr + 0x800;
  for (let i = 0; i <= 0x1ff; i += 2) {
    const slotAddr = slotBase + (i >> 1) * 8;
    const field0 = loadU32(slotAddr);          // [ebp + 0x0]
    const field1 = loadU32(slotAddr + 4);      // [ebp + 0x4]

    if (field0 !== 0) broadcastSlotUpdate(engine, arg);
    if (field1 !== 0) broadcastSlotUpdate(engine, arg);
  }
}

// Per-slot broadcast: BeginMessage / Write(1, slotType, 0, buf) /
// WriteByte(1) / EndMessage. The slot-type singleton is reloaded inside
// this helper, mirroring the redundant `mov eax,[ebx+0x1cf8]; mov
// esi,[eax]` pair the compiler emits at each if-block site in the
// original disassembly.
function broadcastSlotUpdate(engine: any, arg: number): void {
  // Two-step pointer-to-pointer load:
  //   eax = [GOT + 0x1cf8]    ; pointer to singleton
  //   esi = [eax]             ; singleton value (msg-type id)
  const slotType = loadU32(loadPtr(GOT_0x1CF8));
  const buf = engine[0x120](arg);              // BeginMessage(arg) → eax
  engine[0xb8](1, slotType, 0, buf);           // WriteXXX(1, slotType, 0, buf)
  engine[0xc0](1);                             // WriteByte(1)
  engine[0xbc]();                              // EndMessage()
}
```

The two key behavioral changes from the submitted version:

1. `slotBase` now uses `this + 0x800` (the implicit `this*`, which is
   what `[esp+0x20]` actually reads), not `arg + 0x800`.
2. Memory accesses go through `loadU32(...)` / `loadPtr(...)` helpers
   instead of being open-coded as `MEM_U32[...]` with byte-offset
   arguments against a `Uint32Array`. The helper layer is where the
   byte-vs-element and pointer-deref semantics get defined in one place;
   the function body then reads like the disassembly.
