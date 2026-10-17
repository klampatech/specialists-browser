```typescript
// TODO(D.4): the real CTSSharedEmitter class definition. Stub for typecheck.
declare class CTSSharedEmitter {}

// TODO: runtime globals — defined elsewhere by the engine binding layer.
declare const ENGINE_GLOBAL: any;       // [GOT + 0x1aa8]: engine vtable
declare const GLOBAL_AT_0x1CF8: any;    // [GOT + 0x1cf8]: singleton pointer
declare const MEM_U32: any;             // shared memory as Uint32Array view

/**
 * CTSSharedEmitter::SV_UpdateClient — broadcast shared-emitter state
 * updates to one recipient. Iterates the 256-slot, 8-byte-per-slot
 * per-recipient state array at `arg + 0x800` and, for each non-zero
 * slot dword, emits a small network message via the engine interface
 * loaded from the GOT.
 *
 * The "begin / write / end message" shape of the inner block maps
 * cleanly onto Half-Life's MESSAGE_BEGIN / WRITE_* / MESSAGE_END trio;
 * TS reuses that pattern with its own vtable offsets.
 *
 * @param this  The CTSSharedEmitter entity. Instance fields are not
 *              touched in this function — all per-recipient state
 *              lives in a global table addressed by `arg`.
 * @param arg   Per-recipient base. The 256×8-byte state array starts
 *              at `arg + 0x800`. (Despite the `int` signature, the
 *              assembly treats the value as a pointer.)
 * @returns     void
 */
export function SV_UpdateClient(this: CTSSharedEmitter, arg: number): void {
  // Engine interface vtable (loaded into edi once at the top of the
  // function and reused for every iteration).
  const engine: any = ENGINE_GLOBAL;

  // 256 slots, 8 bytes each (field0 = [ebp+0], field1 = [ebp+4]).
  // The loop counter ticks by 2 per iteration and tops out at 0x1ff,
  // covering slots [arg+0x800 .. arg+0x1000).
  const slotBase = (arg + 0x800) >>> 0;
  for (let i = 0; i <= 0x1ff; i += 2) {
    const slotAddr = slotBase + (i >> 1) * 8;
    const field0 = MEM_U32[slotAddr];       // [ebp + 0x0]
    const field1 = MEM_U32[slotAddr + 4];   // [ebp + 0x4]

    if (field0 !== 0) broadcastSlotUpdate(engine, arg);
    if (field1 !== 0) broadcastSlotUpdate(engine, arg);
  }
}

// Per-slot broadcast: BeginMessage / Write(1, slotType, 0, buf) /
// WriteByte(1) / EndMessage. The slot type/id singleton is reloaded
// inside this helper, mirroring the redundant `mov eax,[ebx+...];
// mov esi,[eax]` pair the compiler emits at each if-block site.
function broadcastSlotUpdate(engine: any, arg: number): void {
  const slotType: number = MEM_U32[*(GLOBAL_AT_0x1CF8)];
  const buf = engine[0x120](arg);          // BeginMessage(arg) → eax
  engine[0xb8](1, slotType, 0, buf);       // WriteXXX(1, slotType, 0, buf)
  engine[0xc0](1);                         // WriteByte(1)
  engine[0xbc]();                          // EndMessage()
}
```
