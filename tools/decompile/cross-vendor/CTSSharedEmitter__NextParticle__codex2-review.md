```
VERDICT: PASS-WITH-NOTES

NOTE — mismatch with reference doc. The function under review
(`CTSSharedEmitter::NextParticle`) is a TS gameplay entity class
method, NOT one of the 4 HLSDK engine↔mod interface entry points
that the supplied reference doc covers (`GiveFnptrsToDll` /
`GetEntityAPI` / `GetEntityAPI2` / `GetNewDLLFunctions`). The
HLSDK reference doesn't directly apply here. Items 2, 3, and 4
of the checklist are N/A — I applied the spirit of items 1, 5,
6, 7, 8.

Checklist:
1. Signature — ✅ — `(this: CTSSharedEmitter): number`
   captures a class method that returns an index. The asm
   loads `this` via `[esp+0x4]` (stack-passed, not ECX), which
   is unusual for 32-bit x86 thiscall but is semantically
   equivalent for the TS signature. Return type `number`
   matches the `eax` convention. Name matches the demangled
   symbol exactly.

2. Version check — ✅ N/A — Not a `GetEntityAPI*` function.

3. `*interfaceVersion` assignment-back — ✅ N/A — No
   interfaceVersion pointer involved.

4. Success path — ✅ — "Success" here means finding a free
   slot. TS correctly returns the index. The unrolled-8 loop
   body mirrors the asm's `lea ecx, [eax+N]` pattern (N=1..7)
   and the bare-eax path for N=0.

5. No fabricated paths — ✅ — Traced every asm branch:
   - `je e803a` on slot `base+0` (no `lea ecx`; eax is already
     base) → matches `return base + 0`
   - `je e8024` on slots `base+1..7` (each preceded by
     `lea ecx, [eax+N]`, then `mov eax, ecx; ret`) → matches
     `return base + N`
   - Loop tail `add edx, 0x20 / add eax, 0x8 /
     cmp eax, 0x1ff / jle e7fe0` → matches
     `for (let base = 0; base < 512; base += 8)`
   - Fall-through `mov eax, 0xffffffff; ret` → matches
     `return -1`
   No invented control flow. No invented fields. No invented
   branches.

6. No TODO body — ✅ — Body is implemented logic, not a
   comment stub. The leading TODO comment is supplementary
   context for the field layout, not the body. Slightly
   redundant — see rewrite.

7. Field names — ⚠️ — `s_Emitter` matches the sibling symbol
   `_16CTSSharedEmitter.s_Emitter` at BSS `0x0018f480`,
   size 4096 B. Two ambiguities the asm does not resolve:
   (a) the BSS symbol is 4096 B = 1024 slots, but the loop
   only scans 512 — that's a 2× discrepancy; (b) a BSS symbol
   with a fixed address usually denotes a static class
   member, while the asm accesses `this + 0x800` (instance-
   relative). The asm dereferences `edx+0..28` directly, so
   the array really does live at `this + 0x800` (instance
   storage), and the BSS symbol is probably a separate
   static pool sharing the name. The name is defensible
   but needs an explicit TODO.

8. Compiles in isolation — ❌ — The signature references
   `CTSSharedEmitter` which is not declared in this snippet.
   Per "use `any` for unknowns", the `this` parameter should
   be `any` (or `unknown`) until the class is defined
   elsewhere. The body's
   `(this as unknown as { readonly s_Emitter: ArrayLike<number> }).s_Emitter`
   works around the missing type at the cost of an extra
   cast; using `any` for `this` simplifies it.

Issues to fix:
- (Item 7) Add a `// TODO(asm-ambiguous):` comment flagging
  the `s_Emitter` ↔ `this+0x800` ↔ 1024-vs-512-slot
  discrepancy. Name is defensible, but D.4 (TS-specific
  class layout) should reconcile.
- (Item 8) Change `this: CTSSharedEmitter` to `this: any`
  so the function compiles standalone. The class type will
  be re-attached when the surrounding class file lands.
- (Cosmetic) Drop the body-local "wire to class layout"
  TODO comment — once `this` is `any`, the cast is gone and
  the comment becomes noise.

Suggested rewrite:
```typescript
/**
 * CTSSharedEmitter::NextParticle — find the index of the
 * first null slot in the 512-entry pointer table at
 * `this + 0x800`, or `-1` if all slots are in use.
 *
 * The MSVC compiler unrolls the linear scan 8 slots per
 * iteration; we mirror that in TS for a one-to-one
 * correspondence with the disassembly.
 *
 * @returns Index of the first free slot in [0..511], or -1
 *          if the table is full.
 */
export function NextParticle(this: any): number {
  // TODO(asm-ambiguous): `s_Emitter` matches the BSS symbol
  // at 0x0018f480 (4096 B = 1024 slots), but the asm only
  // scans 512 slots starting at this + 0x800. Reconcile in
  // D.4 when the full CTSSharedEmitter class layout is
  // reconstructed.
  const table = (this as { s_Emitter?: ArrayLike<number> })
    .s_Emitter as ArrayLike<number>;

  for (let base = 0; base < 512; base += 8) {
    if (table[base + 0] === 0) return base + 0;
    if (table[base + 1] === 0) return base + 1;
    if (table[base + 2] === 0) return base + 2;
    if (table[base + 3] === 0) return base + 3;
    if (table[base + 4] === 0) return base + 4;
    if (table[base + 5] === 0) return base + 5;
    if (table[base + 6] === 0) return base + 6;
    if (table[base + 7] === 0) return base + 7;
  }
  return -1;
}
```
