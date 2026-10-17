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
