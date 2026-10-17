```
VERDICT: FAIL

**Reviewer note up front:** the function under review is
`CTSMapGlobals::WaitThink`, a gameplay-side member function.
The HLSDK reference block you pasted is for the four engine↔mod
entry points (`GiveFnptrsToDll`, `GetEntityAPI`, `GetEntityAPI2`,
`GetNewDLLFunctions`). Two of the eight checklist items therefore
do not apply at all (and another two do not apply in spirit).
I'll mark them N/A and add gameplay-specific checks against the
disassembly.

Checklist:

1. Signature — ✅ — `WaitThink(this: CTSMapGlobals): void` matches
   the demangled `CTSMapGlobals::WaitThink()` (void return, no
   explicit args). The `this` parameter is the TypeScript "this
   parameter" idiom for member-function porting; correct usage
   here.
2. Version check — N/A — function is not a `GetEntityAPI*` /
   `GetNewDLLFunctions`. No version constant exists in this
   chunk, and inventing one would be a fail.
3. `interfaceVersion` assignment-back — N/A.
4. Success path / struct copy — N/A in spirit — this function
   performs an in-place field store, not a struct copy. There is
   no HLSDK equivalent; the TS correctly avoids inventing one.
5. No fabricated code paths — ✅ — the disassembly is one linear
   fall-through with zero branches. The TS also has a single
   assignment, no `if`s, no loops, no early returns. This matches
   the disassembly exactly.
6. No TODO body — ❌ — the executable logic *is* present (one
   assignment) so it isn't a comment-only body. But the body is
   laced with **four** `// TODO(…)` / `// TODO` / `// TODO: confirm`
   lines that admit the very semantics the code is trying to
   express are not yet understood. For D.3-style decompilation,
   unresolved items belong in `tools/.codex-prompts/` TODOs, not
   interleaved with the runtime code.
7. Field names — ⚠️ — `pev` and `gpGlobals.time` are canonical
   GoldSrc names (correct). `field_0x104` is opaque, which is
   honest given the offset doesn't match HLSDK's `nextthink`
   (which is at `0xFC`, not `0x104`). Calling it `field_0x104`
   rather than `nextthink` is the right call.
8. Compiles in isolation — ❌ — three problems:
   - `const gpGlobals: { time: number } = null as any` —
     the value at runtime is `null`. Then `gpGlobals.time` on
     the assignment line throws `TypeError: Cannot read
     properties of null` at call time. The TS *compiles*, but
     the decompilation isn't callable.
   - `CTSMapGlobals` is referenced in the signature but never
     declared in this file. With `noImplicitAny` strict this
     is a compile error; with the casts as written it slips
     through.
   - `(this as any).pev` — relies on `pev` being a property
     even though `CTSMapGlobals` is undeclared.

Gameplay-specific findings:

A. **The `[esp+0xc]` is `this`, not garbage.** After the prologue
   (`push ebx` + `sub esp, 0x4` = 8 bytes), `[esp+0xc]` is the
   first explicit stack arg, which is exactly where the GoldSrc
   engine lands the `this` pointer when it calls a `pev->think`
   callback as `__cdecl`. The TS therefore reads `this` correctly.
   The TS should *say* this — the current note says "Half-Life
   SDK CBaseEntity puts pev at the first data-member slot," which
   is half-right and half-wrong.

B. **But `this->pev` is at offset 0 of `this` only if vptr is
   not there.** Sibling symbol `__vt_13CTSMapGlobals` (size 280
   bytes, address `0x00101be0`) is a real vtable. In standard
   MSVC single-inheritance layout, that puts the vptr at offset 0
   and `pev` at offset 4. The disassembly reads `*this` (offset
   0) and uses the result as a pointer base — which would mean
   reading the vtable address and writing a float at
   `vtable_addr + 0x104`. That makes no sense as a pev field
   write, so either (a) this build places pev at offset 0
   (non-standard vptr position), or (b) `*this` is reading
   something other than `pev` (e.g., a `pev*` member whose own
   offset is 0, which would mean there's no vptr in this class
   instance view). The TS punts on this — fine for D.3 → D.4
   handoff, but it should be flagged loudly in the file header.

C. **The interval constant `0.1` is a guess.** The disassembly
   loads 8 bytes from `[ebx - 0x6ecd0]`. A QWORD (double) load
   with a 4-byte add and 4-byte store is plausible, and `0.1` as
   a double is `0x3FB999999999999A`. Reasonable guess, but the
   actual byte at that GOT-relative offset is not in this chunk.
   Extract it before promoting to non-TODO code.

D. **`field_0x104` is not `nextthink`.** Offset `0x104` ≠ HLSDK
   `nextthink` (`0xFC`). Candidate explanations: a TS-specific
   wait-timer float appended after `nextthink`, a wider
   `entvars_s` variant, or a wrong disassembly reading. Keeping
   the name opaque (`field_0x104`) is correct.

E. **Note on AGENTS.md vs. D.3 scope:** per `HANDOFF.md`, this
   function belongs to D.4 (TS-specific gameplay), not D.3
   (entry points). Shipping a D.4 decompilation as part of the
   D.3 cross-vendor review pipeline is fine — but the same
   pipeline's hard rule "do not silently expand scope" applies.
   D.4 needs its own agent run with the full class context
   (the sibling table here lists `Save`, `Restore`, `KeyValue`,
   `Spawn`, `get_weapon_restriction`, `Precache`, `__tf13…`,
   `_13CTSMapGlobals.m_SaveData`, `__vt_…`, `__ti…`) and the
   layout audit (B above).

Issues to fix:

- The `[esp+0xc] == this` claim needs an explicit comment citing
  the GoldSrc `__cdecl` think-callback convention. Don't leave it
  implicit.
- The "pev at offset 0" assumption contradicts the vtable at
  `__vt_13CTSMapGlobals`. Either justify the layout (build /
  compiler flag) or read from offset 4. Don't ship both at once.
- `const gpGlobals = null as any` is a runtime null deref.
  Replace with a `declare`d global of the right type so the TS
  compiles *and* the function is callable.
- The magic literal `0.1` belongs in a `const WAIT_THINK_INTERVAL`
  at the file top, with the TODO linking to the
  `tools/decode/chunks/` extraction task — not inline as `0.1`.
- The four inline TODOs should move to `tools/.codex-prompts/`
  D.4 follow-up entries. Keep at most *one* summary TODO in the
  file header pointing at the open items.

Suggested rewrite:

```typescript
/**
 * CTSMapGlobals::WaitThink — re-arm the entity's wait timer so the
 * thinking loop keeps ticking on a fixed interval.
 *
 * Disassembly source: tools/decompile/chunks/WaitThink__13CTSMapGlobals.chunk.md
 *
 * Calling convention: GoldSrc engine dispatches `pev->think` as a
 * __cdecl callback, so `this` arrives on the stack as the first
 * explicit arg (at [esp+0xc] after our prologue), NOT in ECX.
 *
 * Open layout question (TODO-d4-layout, see also the prompt file
 * tools/.codex-prompts/.codex-prompt-d4-layout.md): the class has
 * a vtable (`__vt_13CTSMapGlobals`, 280 B at 0x00101be0), yet the
 * disassembly dereferences `*this` (offset 0) as if `pev` lives
 * there. Either this build places pev at offset 0 (non-standard
 * vptr placement), or the read at [esp+0xc] is not exactly
 * `this->pev`. Resolve before tightening the field names.
 */

// TODO(d5-wireup): wire `gpGlobals` to the engine pointer handed
// to us via GiveFnptrsToDll. Declared here so this decompilation
// compiles in isolation; replaced in the D.5 pass. Until then,
// reads through this global are valid type-checked code only.
declare const gpGlobals: { time: number };

// TODO(d4-const-extract): literal at GOT-0x6ecd0 (8 bytes / QWORD
// load). 0.1s is the canonical GoldSrc think cadence for
// self-rescheduling thinks, but the byte sequence has not been
// pulled out of ts_i386.so. Verify before this becomes "real"
// code.
const WAIT_THINK_INTERVAL = 0.1;

/**
 * Placeholder entity class. Real layout reconstructed in D.4
 * against the disassembly + HLSDK CBaseEntity.
 *
 * For now, `pev` is typed `any` because (a) we don't know its
 * offset within `this` yet (see TODO-d4-layout), and (b) the
 * field written at +0x104 doesn't match any HLSDK entvars_s
 * field by name.
 */
declare class CTSMapGlobals {
  // The disassembly reads *this and uses the result as a pointer
  // base. Under the (current, unverified) assumption that this
  // pointer is the pev storage.
  // TODO(d4-layout): confirm offset of pev within `this`.
  pev: { [k: string]: number } | undefined;
}

export function WaitThink(this: CTSMapGlobals): void {
  // Stack picture after prologue:
  //   [esp+0x0]  4 B local
  //   [esp+0x4]  saved ebx (after pop ebx this is the GOT base)
  //   [esp+0x8]  return address
  //   [esp+0xc]  this (passed by the engine via __cdecl)
  //
  // `[[this]]` lands in edx and is used as the base for the
  // float store at [edx + 0x104].
  const target = this.pev as { [k: string]: number } | undefined;

  // [pev + 0x104] is a float field. It is NOT GoldSrc HLSDK's
  // `nextthink` (which lives at 0xFC). Treat as an opaque
  // wait-timer slot. Rename to a real field once D.4 resolves
  // the offset against TS's entvars_s extension.
  if (target) {
    target["field_0x104"] = gpGlobals.time + WAIT_THINK_INTERVAL;
  }
}
```

What's still open after this rewrite (push to D.4 / D.5):

- Layout audit: vptr vs pev offset in `CTSMapGlobals`.
- Literal extraction from GOT-0x6ecd0.
- Real field name for offset `0x104` in TS's `entvars_s`.
- `gpGlobals` wire-up (D.5) once `GiveFnptrsToDll` is also
  decompiled and types agree.
```
