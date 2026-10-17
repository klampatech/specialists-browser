// ---------------------------------------------------------------------------
// Stubs so this file compiles in isolation. In a real module these would
// live with the rest of the TS gameplay code; declared here so the
// decompiled function can be type-checked standalone.
// ---------------------------------------------------------------------------

/** HLSDK `string_t` — engine string-table offset (placeholder). */
type string_t = number;

/**
 * One target entry on CTSCustomTarget; total size 0x20 bytes. Only the
 * first field is known from this chunk; the rest are TS-specific and
 * will be discovered in D.4 by cross-referencing the class's other methods.
 */
export interface CTSCustomTargetEntry {
  /** Offset 0 of each entry: target entity name (string_t). */
  targetname: string_t;
  /** Bytes 4..0x20 — unknown / TS-specific fields. */
  _reserved: any;
}

/** CTSCustomTarget class layout (offsets from `this`). */
export interface CTSCustomTarget {
  /**
   * Fixed-size target array.
   *   - Logical offset: 0x64
   *   - Element stride: 0x20 bytes
   *   - Max slots:      (0x864 - 0x64) / 0x20 == 64
   */
  readonly targets: CTSCustomTargetEntry[];
  /** Logical offset: 0x864 — number of populated target entries. */
  readonly targetCount: number;
}

/**
 * HLSDK `FireTargets(const char *targetName, CBaseEntity *pActivator,
 * CBaseEntity *pCaller, USE_TYPE useType, float value)`.
 * Signature mirrors the asm call shape; TS may wrap / extend.
 */
declare function FireTargets(
  targetName: string,
  pActivator: CTSCustomTarget,
  pCaller: CTSCustomTarget,
  useType: number, // USE_TYPE enum (verify TS-specific values in D.4)
  value: number,
): void;

// ---------------------------------------------------------------------------
// Decompiled function
// ---------------------------------------------------------------------------

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
  // Asm: `test eax,eax / js` (negative → all) then `cmp eax,[ebp+0x864] / jl`
  // (out of range → all). Reaching here means 0 <= index < count.
  if (index >= 0 && index < count) {
    // [this + 0x64 + 0x20*index] — targetname for the requested slot.
    FireTargets(
      this.targets[index].targetname,
      this, // pActivator = the CTSCustomTarget itself
      this, // pCaller    = the CTSCustomTarget itself
      /* useType */ 3, // 3 == USE_TOGGLE in vanilla HL SDK; verify TS override.
      /* value  */ 0,
    );
    return;
  }

  // --- All-targets branch: negative or out-of-range `index`. -----------
  for (let i = 0; i < count; i++) {
    // TODO(asm-ambiguous): the assembly guards each call with
    //   `cmp esi, 0xffffff9c` (== -100) on the entry pointer. With a
    //   valid `this`, esi is `this + 0x20*i` — never -100. Likely a
    //   vestigial defensive check from earlier source. Elided here.
    FireTargets(
      this.targets[i].targetname,
      this,
      this,
      /* useType */ 3,
      /* value  */ 0,
    );
  }
}
