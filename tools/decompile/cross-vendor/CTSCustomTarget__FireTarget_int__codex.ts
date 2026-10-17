```typescript
/**
 * CTSCustomTarget::FireTarget — fires one or all stored target entries via
 * FireTargets, using the CTSCustomTarget instance itself as both activator
 * and caller.
 *
 * If `index` is a valid in-range slot, only that entry is fired; otherwise
 * (negative index, or index >= count) every populated entry is fired in
 * order.
 *
 * Class field layout (byte offsets from `this`):
 *   `[0x64 + 0x20*i]` — i-th entry's `targetname` (`string_t`), 0 ≤ i < count
 *   `[0x864]`         — number of populated entries. The fixed array has
 *                       `(0x864 - 0x64) / 0x20 == 64` slots.
 *
 * @param this  The CTSCustomTarget entity instance (1st C++ argument).
 * @param index Target slot index; out-of-range means "fire all".
 * @returns     void
 */
export function FireTarget(this: CTSCustomTarget, index: number): void {
  // [this + 0x864] — number of populated target entries.
  const count = this.targetCount;

  // --- Single-target branch: `index` is in [0, count). -----------------
  if (index >= 0 && index < count) {
    // [this + 0x64 + 0x20*index] — targetname for the requested slot.
    FireTargets(
      this.targets[index].targetname,
      this, // pActivator = the CTSCustomTarget itself
      this, // pCaller    = the CTSCustomTarget itself
      /* useType */ 3, // TODO(asm-ambiguous): 3 == USE_TOGGLE in vanilla
                       //   HL SDK; TS may override the enum — verify.
      /* value  */ 0,
    );
    return;
  }

  // --- All-targets branch: negative or out-of-range `index`. -----------
  for (let i = 0; i < count; i++) {
    // TODO(asm-ambiguous): the assembly guards each call with
    //   `cmp esi, 0xffffff9c` (== -100) on the entry pointer, but with a
    //   valid `this` this never matches and is effectively dead. Likely
    //   a vestigial defensive check from earlier source — intent not
    //   recoverable from the chunk, so we elide it here.
    FireTargets(
      this.targets[i].targetname,
      this,
      this,
      /* useType */ 3,
      /* value  */ 0,
    );
  }
}
```
