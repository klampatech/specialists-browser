```typescript
/**
 * CTSSMGWeapon::RandomSMG — Roll a random SMG weapon class ID.
 *
 * The original 32-bit MSVC routine dispatches into the engine's bounded
 * integer-RNG virtual via a vtable lookup, then performs a jump-table
 * switch over (roll − 1) ∈ [0, 5]. The jump table sits at
 * GOT_base − 0xac430 (= address b99e0) and has six 4-byte entries.
 * The compiler fused the default arm with the index-0 case body, so
 * both share a single `mov eax, 0x17` body at b99f8.
 *
 * Mapping (roll → returned weapon class ID):
 *   1 → 23   (default body; shared with out-of-range)
 *   2 → 7
 *   3 → 6
 *   4 → 19
 *   5 → 17
 *   6 → 3
 *   <other> → 23
 *
 * `this` is unused — no `[esi+...]` accesses anywhere in the body.
 *
 * @returns A TS internal weapon class ID for the rolled SMG.
 */
export function RandomSMG(this: CTSSMGWeapon): number {
  // Engine RNG is vtable-dispatched:
  //   eax = *(GOT + 0x1aa8)            // engine-interface singleton
  //   call [eax + 0x168](1, 6)         // = RANDOM_LONG(min, max), cdecl
  // TODO(engine-binding): replace with the real engine RNG once the
  // engine surface is defined; args were pushed right-to-left (6, 1)
  // and the caller cleaned up with `add esp, 0x10`.
  const roll = engineRandomLong(/* min */ 1, /* max */ 6);

  // Switch dispatch — flattened from the original jump table.
  // The compiler mapped index 0 onto the same body as the out-of-range
  // default (both load 23 = 0x17).
  switch (roll - 1) {
    case 0: return 23;
    case 1: return 7;
    case 2: return 6;
    case 3: return 19;
    case 4: return 17;
    case 5: return 3;
    default: return 23;
  }
}
```
