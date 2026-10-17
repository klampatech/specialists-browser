```typescript
/**
 * CTSSharedEmitter::NextEmitter — scans an emitter-slot array for
 * the first empty (zero) slot, returning its index. Returns -1 if
 * no slot is empty within the first 512 entries.
 *
 * @param this  The CTSSharedEmitter instance (not directly accessed
 *              in the body; this function is a pure helper over an
 *              explicit array).
 * @param arr   Pointer-sized array of slot entries
 *              (0 = empty, non-zero = used).
 * @returns     Index of the first empty slot, or -1 if none found.
 */
export function NextEmitter(this: any, arr: Int32Array): number {
  // TODO(asm-ambiguous): the demangled signature is `NextEmitter()`
  // (no args) but the disassembly reads one pointer-sized arg off the
  // stack at [esp+0x4] and uses it as the array base. Most likely an
  // explicit array parameter passed by the caller; alternatively  // `this` itself under a cdecl calling convention.
  //
  // TODO: the loop bound 0x1ff (= 511) and unroll step 8 are hard-
  // coded constants in the binary. The class's static `s_Emitter` is
  // 4096 bytes, but this function only scans the first 2048 (512
  // entries) — either the static holds two halves, or the array
  // being scanned here is a separate instance member, or entries are
  // 8 bytes each (in which case 512 entries * 8 bytes = 4096 bytes).
  for (let i = 0; i <= 0x1ff; i += 8) {
    if (arr[i    ] === 0) return i;
    if (arr[i + 1] === 0) return i + 1;
    if (arr[i + 2] === 0) return i + 2;
    if (arr[i + 3] === 0) return i + 3;
    if (arr[i + 4] === 0) return i + 4;
    if (arr[i + 5] === 0) return i + 5;
    if (arr[i + 6] === 0) return i + 6;
    if (arr[i + 7] === 0) return i + 7;
  }
  return -1;
}
```
