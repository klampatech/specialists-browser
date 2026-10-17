```typescript
/**
 * CTSKnifeWeapon::RandomKnife — returns one of two knife sequence /
 * animation indices chosen at random. The global uniform random stream
 * is sampled in [1, 2]; the sample is then mapped 1→0x19 (25) and
 * 2→0x23 (35). Any other sample value falls through to 0x19.
 *
 * @param this  The CTSKnifeWeapon instance (not actually read —
 *              randomness comes from a global RNG singleton, not
 *              from instance state)
 * @returns     0x19 (25) or 0x23 (35)
 */
export function RandomKnife(this: CTSKnifeWeapon): number {
  // TODO(asm-ambiguous): the global pointer loaded via GOT+0x1aa8 is
  // inferred to be the engine's CUniformRandomStream singleton; its
  // vtable slot +0x168 is inferred to be RandomInt(min, max) based on
  // the (1, 2) argument pair and the downstream 1/2 discriminator.
  const rng = (globalThis as any).__tsGOT_0x1aa8 as {
    RandomInt(min: number, max: number): number;
  };
  const r: number = rng.RandomInt(1, 2);

  // Case 1 (and the fall-through default for any unexpected return):
  //   return 0x19 (25)
  // Case 2:
  //   return 0x23 (35)
  return r === 2 ? 0x23 : 0x19;
}
```
