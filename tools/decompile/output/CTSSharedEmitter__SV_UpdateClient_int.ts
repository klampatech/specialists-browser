```typescript
/**
 * CTSSharedEmitter::SV_UpdateClient — iterates over a 256-entry table of
 * paired 4-byte client handles stored at `arg0 + 0x800`, dispatching one
 * engine network message per non-null handle. Each 8-byte row holds two
 * handles at +0 and +4 (so each loop pass emits up to two messages).
 *
 * @param this  The CTSSharedEmitter entity instance.
 * @param arg0  Caller-supplied base pointer; the handle table starts
 *              0x800 bytes past this.
 * @returns     void
 */
export function SV_UpdateClient(
  this: CTSSharedEmitter,
  arg0: number
): void {
  // Engine-interface vtable, fetched once via the PIC/GOT base.
  const engineVTable = GOT32(0x1aa8) as any;            // [ebx + 0x1aa8]
  // Engine singleton, reached via pointer-at-pointer in the GOT.
  const srvPtr = readPtr(GOT32(0x1cf8) as any) as any;  // [[ebx + 0x1cf8]]

  let row = (arg0 + 0x800) | 0;

  // Counter goes 0, 2, …, 0x1ff -> 256 iterations. It is a pure loop
  // bound (it does not index the table; `row` advances by 8 per pass).
  // TODO: the +0x800 stride into `arg0` is unexplained by the chunk — its
  // meaning depends on which engine struct `arg0` actually is.
  for (let iter = 0; iter <= 0x1ff; iter += 2) {
    const handleA = readU32(row + 0);                   // [ebp + 0x0]
    const handleB = readU32(row + 4);                   // [ebp + 0x4]

    // Per emit, inlined twice (once per non-null slot):
    //   [edi + 0x120] — look up the message handle for arg0  (returns eax)
    //   [edi + 0xb8]  — write (1, srvPtr, 0, handle)
    //     // TODO(asm-ambiguous): argument order is the four pushes
    //     // (handle ; 0 ; srvPtr ; 1); without engine ABI docs we
    //     // can't confirm which arg ends up in which callee slot.
    //   [edi + 0xc0]  — write a single byte (1)
    //   [edi + 0xbc]  — end the message
    if (handleA !== 0) {
      const h = engineVTable[0x120](arg0);
      engineVTable[0xb8](1, srvPtr, 0, h);
      engineVTable[0xc0](1);
      engineVTable[0xbc]();
    }
    if (handleB !== 0) {
      const h = engineVTable[0x120](arg0);
      engineVTable[0xb8](1, srvPtr, 0, h);
      engineVTable[0xc0](1);
      engineVTable[0xbc]();
    }

    row += 0x8;
  }
}
```
