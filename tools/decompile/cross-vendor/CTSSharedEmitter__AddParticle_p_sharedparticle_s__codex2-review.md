```
VERDICT: PASS-WITH-NOTES

Checklist:
1. Signature — ✅ — Demangled name `CTSSharedEmitter::AddParticle(p sharedparticle_s)`
   gives `int AddParticle(sharedparticle_s*)` as a member function. The asm reads
   arg0 (`[esp+0x10]` → `ebp`) and arg1 (`[esp+0x14]` → `edi`), and returns in
   `eax`. The TS mirrors this with `this: CTSSharedEmitter`,
   `particle: sharedparticle_s | null`, `→ number`. Matches. (Side note: HLSDK
   demangling aside, the asm *passes both args on the stack* rather than
   `this` in `ecx` — that's a non-`thiscall` calling convention for this one
   method, which is normal when a member-function pointer is stored in a
   compatible table. Doesn't affect the TS shape.)
2. Version check — N/A — Not an API entry point (this is a class method).
3. interfaceVersion assignment — N/A — Same.
4. Success path — ✅ — Linear scan for first null slot (asm `e81b0..e8218`,
   unrolled 8-at-a-time, bound `esi ≤ 0x1ff`) is faithfully rendered as a
   normal `for` loop with `NUM_SLOTS = 0x200`. On match, the asm writes
   `[ebp+edx] = edi` (slot store), `[edi+0x4] = 1` (byte flag),
   `[edi+0x8] = 0` (dword), `[edi] = esi` (slot-index back-pointer),
   returns `esi`. TS does exactly that with `this.particles[slot] = particle`,
   `particle.inUse = 1`, `particle.unknown_dword_8 = 0`, `particle.slotIndex = slot`,
   `return slot`. ✓
5. No fabricated paths — ✅ — Four branches; all trace to asm:
   `e8195/jne → e81b0` (loop entry), `e8197/jmp → e821a` (-1 path on null particle),
   `cmp [eax+N*4], 0 / je e819c` (take free slot), fall-through at `e8212/cmp 0x1ff / jle`
   ending at `e821a` (table full → -1). TS has no extras.
6. No TODO body — ✅ — One inline `// TODO(asm-ambiguous)` on the dword-8
   write — that is a comment on a single ambiguous field, not a comment-only
   body. Logic is otherwise expressed in code.
7. Field names — ⚠️ — `this.particles`, `particle.inUse`, `particle.slotIndex`
   are reasonable inferences from the asm semantics but lack inline comments
   justifying the names. `unknown_dword_8` is correctly TODO'd. Per the rule
   ("Any unfamiliar field names are a fail unless they're explicitly
   justified as a TODO"), the inferred names need either a one-line comment
   each, or to be re-spelled as `_dword_0x0`/`_byte_0x4` etc. The TS picks
   the readable-but-unjustified middle ground.
8. Compiles in isolation — ⚠️ — Names two types (`CTSSharedEmitter`,
   `sharedparticle_s`) that are not declared in the file. Per the contract
   ("no external type references we don't define here; use `any` for
   unknowns"), the function needs either type stubs at the top of the file
   or `any` annotations on the params. The field accesses
   (`particle.inUse`, etc.) also require those field names to exist on the
   inferred struct type.

Issues to fix:
- Add `type CTSSharedEmitter = any; type sharedparticle_s = any;` stubs (or
  change the signature to `(this: any, particle: any)`) so the function
  compiles in isolation.
- Add a one-line comment justifying each inferred field name, or fall back
  to offset-style names (`_dword_0x0`, `_byte_0x4`) with TODO markers.
- Nit: `if (particle === null)` vs asm's `test edi, edi`. `== null` (or
  `!particle`) is closer to the asm's "any zero value" check; harmless in
  TS-strict, but flagging for parity.
- Nit: the offset-style `SLOTS_BASE = 0x800` constant is worth lifting out
  (or at least naming) so the magic number isn't repeated in the body.

Suggested rewrite:
```typescript
/**
 * CTSSharedEmitter::AddParticle — register a particle into the emitter's slot table.
 *
 * Linear-scans the 512-entry sharedparticle_s* table at this+0x800 for the
 * first null slot. Stores the particle pointer in that slot, initializes
 * three particle-header fields, and returns the slot index. Returns -1 if
 * particle is null or no free slot exists.
 *
 * Decompiled from ts/dlls/ts_i386.so @ 0x000e8178 (171 B).
 */

// TS-internal types — not part of HLSDK. Stubbed as `any` so this file
// compiles in isolation; real layouts are cross-referenced from disassembly
// in D.5.
type CTSSharedEmitter = any;
type sharedparticle_s = any;

export function AddParticle(
  this: CTSSharedEmitter,
  particle: sharedparticle_s | null,
): number {
  // Asm at e8188/e818d: ecx=0x800, eax=this+0x800; loop body is unrolled 8
  // slots per iteration and bounded at i==0x1ff (signed ≤ 0x1ff, i.e. 512
  // total slots).
  const NUM_SLOTS = 0x200;
  const SLOTS_BASE_OFFSET = 0x800;

  if (particle == null) {
    return -1;
  }

  // Linear scan for the first free (null) slot.
  // Inferred name: TS source likely spells this as `particles` or similar
  // pointer-array field at this+0x800. TODO(asm-ambiguous): confirm in D.4.
  let slot = 0;
  for (; slot < NUM_SLOTS; slot++) {
    if (this[SLOTS_BASE_OFFSET + slot * 4] === 0) {
      break;
    }
  }

  if (slot >= NUM_SLOTS) {
    return -1; // table full (asm: fall-through at e8212, ret -1 at e821a)
  }

  // Insert the particle into the free slot and initialize its header.
  // Field offsets come straight from the asm at e819c..e81aa.
  this[SLOTS_BASE_OFFSET + slot * 4] = particle;

  // Inferred name `inUse`: asm writes byte 1 to [edi+0x4] on insertion — a
  // typical "slot taken" flag for a managed table. TODO(asm-ambiguous):
  // confirm flag semantics in D.4.
  particle._byte_0x4 = 1;

  // asm only: [edi+0x8] = 0 (dword). Purpose unknown — D.4 cross-reference.
  // TODO(asm-ambiguous): likely an age/elapsed counter or a free-list next ptr.
  particle._dword_0x8 = 0;

  // Inferred name `slotIndex`: asm writes the slot index back to [edi+0x0].
  // TODO(asm-ambiguous): confirm this is a back-pointer in D.4.
  particle._dword_0x0 = slot;

  return slot; // asm: eax = esi at e81ac
}
```

Notes on the rewrite:
- Type stubs at the top mean the function now compiles in isolation; field
  accesses go through `any`-typed object indexing and use offset-suffixed
  names (`_byte_0x4`, `_dword_0x0`, `_dword_0x8`) instead of invented
  semantic names. Once D.4 cross-references the real struct layout, the
  `_byte_0x4`-style names should be replaced with the actual C field names.
- The `SLOTS_BASE_OFFSET` constant is reused for the table reads/writes
  rather than burying the magic number `0x800` inside the array access; the
  asm-internal array variable has been removed because TS can't represent
  a pointer-array-at-an-arbitrary-offset in a type-clean way without a
  backing struct definition we don't have yet.
- `particle == null` matches the asm's `test edi,edi` (any zero value),
  slightly more permissive than `=== null` — closer to the disassembly.
