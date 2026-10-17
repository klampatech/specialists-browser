```
VERDICT: PASS-WITH-NOTES

Checklist:
1. Signature — ✅ — `(this, int fromIndex, int toIndex) -> void`
   matches the demangled `CTSSharedEmitter::SetEmitterParticle(int, int)` and
   the asm stack frame (`[esp+0x8]` = this, `[esp+0xc]` = fromIndex,
   `[esp+0x10]` = toIndex, no return value). The "this is passed
   explicitly" interpretation is correct given the three stack loads.

2. HLSDK version check — N/A — This isn't a `GetEntityAPI*` /
   `GetNewDLLFunctions` entry point. No version-check pattern applies.

3. HLSDK interfaceVersion assignment-back — N/A — N/A for the same reason.

4. "Success path" / data flow — ✅ — The asm's two main mutations are
   preserved exactly and in order:
   - asm `e8274: mov [eax+0x14], ecx` ← TS `fromEntry.f14 = toIndex;`
   - asm `e827e: inc DWORD PTR [eax+0x8]` ← TS `toSlot.f08++;`
   The decrement of the previous target's refcount (asm `e826e`) is also
   preserved with the same re-validation (`refs[prevNext] != NULL` before
   the `dec`).

5. No fabricated paths — ✅ — Every branch in the TS comes from a real
   asm branch: two sentinel-exits (e8234, e8239), two NULL-exits (e8246,
   e8250), one prev-=-1 skip (e8259), one prev-NULL skip (e8269), then
   the unconditional write+bump. No invented early-returns, no extra
   bounds checks, no extra refcount work.

6. No TODO body — ✅ — Body is fully implemented logic. The two `// TODO`
   markers are scoped metadata (real field names + `cmp`/`== null`
   equivalence) rather than stubs. Consistent with the conversion
   guidance allowing `// TODO(asm-ambiguous):` comments.

7. Field names — ⚠️ — `entries`, `refs`, `f14`, `f08` are deliberate
   placeholders called out in a TODO and consistent with the +0x800
   offset hint, but they're not anchored to a known C++ field. Acceptable
   for D.3 (per the conversion guidance, "real field names + struct
   layouts to be confirmed at D.4") — should be reassigned when the
   class is reconstructed.

8. Compiles in isolation — ⚠️ — `CTSSharedEmitter` is referenced in the
   `this:` parameter type but not declared anywhere in the snippet.
   TypeScript will error with `Cannot find name 'CTSSharedEmitter'`.
   Either add a stub `declare class CTSSharedEmitter { ... }` at the
   top of the file, or fall back to `this: any` per the conversion
   guidance ("use `any` for unknowns").

Issues to fix:
- Resolve the `CTSSharedEmitter` reference so the file compiles
  standalone (one-line stub or `this: any`).
- Optional: tighten field placeholders with a comment block that
  nails down the offsets (`+0x000` and `+0x800` are pointer-table bases,
  not byte-payload offsets) so a future reader doesn't try to read
  `entries` as a sub-struct of `this`.

Suggested rewrite (PASS-WITH-NOTES, minimal change — only the
compile-isolation fix; logic is unchanged):

```typescript
// Stub so the file compiles standalone. Real fields filled in at D.4.
declare class CTSSharedEmitter {
  // +0x000: pointer table; each slot's +0x14 holds the "next active"
  //        index (or -1 sentinel).
  entries: Array<{ f14: number } | null>;
  // +0x800: pointer table; each slot's +0x08 is the shared refcount.
  refs:    Array<{ f08: number } | null>;
}

/**
 * CTSSharedEmitter::SetEmitterParticle — re-point a particle slot's
 * "next active" link from {@link fromIndex} to {@link toIndex},
 * adjusting the link target's refcount as we go.
 *
 * The original binary passes `this` as an explicit first stack argument
 * (effectively __cdecl, rather than the MSVC `__thiscall` default), so
 * the true C++ signature is `(int fromIndex, int toIndex)`.
 *
 * @param this      The shared emitter.
 * @param fromIndex Index into the emitter's +0x000 pointer table; the
 *                  entry's +0x14 "next" field will be overwritten.
 * @param toIndex   Index into the emitter's +0x800 pointer table; the
 *                  entry's +0x08 refcount will be incremented.
 */
export function SetEmitterParticle(
  this: CTSSharedEmitter,
  fromIndex: number,
  toIndex: number,
): void {
  // Sentinel: -1 = "no link / unset". The original binary short-
  // circuits out without touching either table.
  if (fromIndex === -1 || toIndex === -1) return;

  // The emitter keeps two parallel pointer tables at fixed byte
  // offsets within `this`, both indexed by an int, each entry
  // pointing to a struct:
  //
  //   +0x000 : entries[fromIndex]   -- struct has a 32-bit "next"
  //                                    index at offset +0x14
  //   +0x800 : refs    [toIndex]    -- struct has a 32-bit refcount
  //                                    at offset +0x08
  //
  // TODO(D.4): real field names + struct layouts to be confirmed at
  //            full class reconstruction.
  const emitter = this;

  // Both endpoints must already be populated; NULL slots are no-ops.
  // `cmp DWORD PTR [...], 0x0` in the asm maps to `== null` in TS
  // (covers both null and undefined).
  const fromEntry = emitter.entries[fromIndex];
  if (fromEntry == null) return;
  const toSlot = emitter.refs[toIndex];
  if (toSlot == null) return;

  // If `fromIndex` already had a "next" link, drop it first by
  // decrementing the old target's refcount. The asm re-validates
  // that the previous target slot is still populated before
  // touching it (the refs table can be sparsely populated, so a
  // stale -1 link might point at a NULL slot).
  const prevNext = fromEntry.f14;
  if (prevNext !== -1) {
    const prevSlot = emitter.refs[prevNext];
    if (prevSlot != null) {
      prevSlot.f08--; // +0x08 = refcount
    }
  }

  // Re-link `fromIndex -> toIndex` and bump the new target's refcount.
  fromEntry.f14 = toIndex; // +0x14 = "next" index
  toSlot.f08++;           // +0x08 = refcount
}
```

Summary: the decompilation is faithful to the disassembly — every
branch, every write, every NULL/sentinel guard maps 1:1, and no
control flow was invented. The only blocking issue is the missing
`CTSSharedEmitter` declaration preventing standalone compile; one-
line fix.
