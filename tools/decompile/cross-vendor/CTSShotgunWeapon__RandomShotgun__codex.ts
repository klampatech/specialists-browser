```typescript
/**
 * CTSShotgunWeapon::RandomShotgun — Picks a random shotgun fire-pattern index
 * (likely pellet count / cone shape) by calling the engine's RANDOM_LONG(1, 5)
 * and dispatching through a 5-way jump table.
 *
 * Original returns one of:
 *   random = 1 → 0   (case 0 falls through without overriding eax)
 *   random = 2 → 26  (0x1a)
 *   random = 3 → 33  (0x21)
 *   random = 4 → 20  (0x14)
 *   random = 5 → 11  (0x0b)
 *
 * @param this  The CTSShotgunWeapon entity instance (this in the original C++)
 * @returns     Integer pattern index (0, 11, 20, 26, or 33)
 */

// TODO(engine-callbacks): wire through the real engine binding layer.
// In GoldSrc this is g_engfuncs.pfnRandomLong (table offset 0x168).
declare const RANDOM_LONG: (low: number, high: number) => number;

export function RandomShotgun(this: CTSShotgunWeapon): number {
  // Engine function-table pointer loaded via GOT ([ebx+0x1aa8]); the indirect
  // call goes through offset 0x168, which is pfnRandomLong in the GoldSrc
  // engfuncs table. Arguments are pushed low → high in cdecl order: (1, 5).
  // TODO(asm-ambiguous): confirm 0x168 maps to pfnRandomLong in the TS build.
  const random = RANDOM_LONG(1, 5);

  // The original uses a GOT-relative jump table indexed by (random - 1);
  // lifted to a TS switch. The sub eax,1 just normalizes the 1..5 range down
  // to a 0..4 index for the table.
  switch (random - 1) {
    case 0:
      // b968d: case-0 path jumps directly to the shared cleanup (b96ad)
      // without a `mov eax, IMM`, so eax still holds the post-subtract value
      // going into `ret`.
      return random - 1;
    case 1:
      // b9690
      return 0x1a; // 26
    case 2:
      // b9698
      return 0x21; // 33
    case 3:
      // b96a0
      return 0x14; // 20
    case 4:
      // b96a8 (last case, no trailing jmp needed — falls into b96ad cleanup)
      return 0x0b; // 11
    default:
      // (random - 1) > 4 takes the `ja b9688` bounds-check branch, which the
      // disassembler decodes into the case-0 region; the retval there is the
      // same (eax = random - 1, unmodified through the cleanup).
      return random - 1;
  }
}
```
