```
VERDICT: PASS-WITH-NOTES

Checklist:
1. Signature — ✅ — `AddParticle(this: CTSSharedEmitter, particle: sharedparticle_s | null): number`
   matches the demangled symbol `CTSSharedEmitter::AddParticle(p sharedparticle_s)`.
   The `| null` union on `particle` is a TS-only addition for null safety that
   matches the asm's `test edi,edi / jne` null check at e8193–e8197.
   Return type `number` correctly represents the int (slot index or `-1`).

2. Version check pattern — N/A — this is not one of the engine↔mod API entry
   points (GiveFnptrsToDll / GetEntityAPI / GetEntityAPI2 /
   GetNewDLLFunctions); the checklist item doesn't apply.

3. *interfaceVersion assignment — N/A — same reason.

4. Success path — ✅ — the linear scan correctly finds the first null slot,
   stores the particle, initializes all three header fields, and returns
   the slot index. Order of operations matches the asm exactly:
   `[edx+ebp] = edi` → `byte[edi+0x4] = 1` → `dword[edi+0x8] = 0` →
   `dword[edi] = esi` → `eax = esi`.

5. No fabricated paths — ✅ — every branch maps to the asm:
   - `particle === null → return -1` ← `test edi,edi; jmp e821a` (e8193–e8197)
   - slot full → return -1 ← fall-through to `mov eax, 0xffffffff` at e821a
   - free slot found → insert + return slot ← `je e819c` at e81b5/e81c1/...
   - linear unrolled scan → idiomatic `for` loop in TS (per conversion guidance)

6. No TODO body — ⚠️ — body is fully expressed in code; the only
   `// TODO(asm-ambiguous)` is on the field name `unknown_dword_8` for the
   dword at offset 0x8 (purpose unclear from asm alone — `mov dword
   ptr [edi+0x8], 0x0` is just "clear a field"). Acceptable: it's a name
   placeholder, not a missing control-flow branch.

7. Field names — ⚠️ —
   - `this.particles[slot]` — reasonable inference from `lea eax, [ebp+0x800]`
     plus 512-entry pointer array at offset 0x800. Naming it `particles`
     is consistent with a "shared particle pool" held by the emitter.
   - `particle.inUse` (byte at offset 0x4, set to 1) — natural name for a
     "slot-taken" flag.
   - `particle.slotIndex` (dword at offset 0x0, set to esi) — back-pointer
     from particle to its owning slot.
   - `particle.unknown_dword_8` (dword at offset 0x8, cleared) — placeholder
     name, marked ambiguous. Fine.
   The asm consistently treats `edi` (offset 0/4/8-accessed value) as a
   `sharedparticle_s*` and `ebp` (holds the slot table at +0x800) as the
   emitter (`this`). The TS follows this mapping.

8. Compiles in isolation — ⚠️ — refers to `CTSSharedEmitter`, `sharedparticle_s`,
   and field types that aren't defined in the snippet. Per the conversion
   guidance ("use `any` for unknowns"), a minimal stub or `any`-typed
   fields are needed for true standalone compilation. This is a minor
   documentation issue, not a logic issue — the function itself is
   type-correct given suitable declarations.

Issues to fix:
- None blocking. The decompilation is faithful and idiomatic.
- Minor: the `unknown_dword_8` placeholder should be flagged in code
  comments for a future D.4 pass when particle semantics are better known.
- Minor: a minimal `interface sharedparticle_s { inUse: number;
  unknown_dword_8: number; slotIndex: number }` stub (or use of `any`)
  would make this strictly compilable in isolation. The decompilation
  guidance explicitly allows `any` for unknowns, so either approach works.

Notes on asm quirks the TS correctly normalizes away (per the
"treat disassembly as a specification, not literal source" rule):
- The asm has a bookkeeping off-by-one in the unrolled loop: per outer
  iteration, `esi` advances by 9 while `eax` advances by only 0x20
  (8 slots). After many iterations, `esi` and `ecx` drift out of sync
  with the actual slot position pointed to by `eax`. In a worst case,
  if a slot near the tail is null, the asm would write the particle
  to an out-of-bounds offset (e.g., `ebp + 0x1148` instead of
  `ebp + 0xF00`) while returning a meaningless esi value. The TS uses
  a clean linear scan with `slot` tracking the actual array index, so
  the bug is not reproduced. **This is the correct choice.**
- The calling convention appears to be `__cdecl`-style (this on stack
  alongside the explicit param), per the dual `mov ebp,[esp+0x10]` /
  `mov edi,[esp+0x14]` loads. The TS uses standard TS `this` parameter,
  which is appropriate.
- The asm loads `ecx = 0x800` and computes `eax = ebp + 0x800` BEFORE
  the null check on `edi`. The TS reorders the null check to the top,
  which is cleaner and semantically identical.

Suggested rewrite (no changes needed — keeping the existing version with
two small clarifying comments):

```typescript
/**
 * CTSSharedEmitter::AddParticle — register a sharedparticle_s into the
 * emitter's 512-slot pointer table at this+0x800.
 *
 * The asm unrolls the scan 8 slots per iteration with a slightly off-by-one
 * esi counter; the TS uses a clean linear scan that does not reproduce that
 * bookkeeping quirk (per the "don't 1:1 translate asm" conversion rule).
 *
 * @param this      The CTSSharedEmitter instance
 * @param particle  Particle to register; null returns -1
 * @returns         Slot index 0..511 on success; -1 if particle is null
 *                  or the slot table is full.
 */
export function AddParticle(
  this: CTSSharedEmitter,
  particle: sharedparticle_s | null,
): number {
  // Slot table is a 512-entry pointer array at this+0x800 (asm lea eax,[ebp+0x800]).
  const NUM_SLOTS = 0x200;

  if (particle === null) {
    return -1; // asm: test edi,edi; jmp to "mov eax,0xffffffff"
  }

  // Linear scan for the first free (null) slot.
  let slot = 0;
  for (; slot < NUM_SLOTS; slot++) {
    if (this.particles[slot] === null) {
      break;
    }
  }

  if (slot >= NUM_SLOTS) {
    return -1; // asm: fall-through to "mov eax,0xffffffff"
  }

  // Insert + initialize particle header. Offsets come straight from
  // the asm at e819c..e81aa, in the same order.
  this.particles[slot] = particle;   // [edx+ebp*1] = edi
  particle.inUse = 1;                // [edi+0x4] byte = 1
  particle.unknown_dword_8 = 0;      // [edi+0x8] dword = 0  (purpose TBD)
  particle.slotIndex = slot;         // [edi+0x0] dword = esi

  return slot;                       // eax = esi
}
```

Summary: this is a faithful, idiomatic decompilation. The only field name
that's genuinely ambiguous is the dword at offset 0x8 (`unknown_dword_8`),
and that's appropriately flagged. The TS correctly normalizes the asm's
off-by-one bookkeeping bug away. Ship it, with a future D.4 task to
identify what `unknown_dword_8` actually represents once particle
semantics are better known.
