/**
 * CTSSharedEmitter::NextEmitter — find the first empty (zero)
 * slot in a 512-entry emitter table. Returns the index, or -1
 * if no empty slot exists in [0, 511].
 *
 * Faithfully mirrors the 8-way unroll + `edx <= 0x1ff` bound
 * check in the original disassembly at 0xe7f68.
 *
 * TODO(asm-ambiguous): the demangled C symbol is `NextEmitter()`
 * (no args) but the disassembly reads one pointer-sized arg
 * from the stack at `[esp+0x4]` and uses it as the array base.
 * Either (a) `this` is passed implicitly and the class treats
 * it as the array base (caller passes the static `s_Emitter`
 * as `this`), or (b) the demangler missed an explicit
 * `sharedemitter_s*` parameter. Either way, the runtime shape
 * is `(arr: Uint32Array) -> int32`, so we expose `arr`
 * explicitly and accept any receiver via `this: any`. D.4
 * (full class reconstruction) will resolve this.
 *
 * NOTE: the static `s_Emitter` (0x0018f480, 4096 B) suggests
 * 1024 entries of 4-byte pointers OR 512 entries of 8-byte
 * structs; this function scans only the first 512 indices,
 * consistent with either layout when each entry is a pointer.
 */
export function NextEmitter(this: any, arr: Uint32Array): number {
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
