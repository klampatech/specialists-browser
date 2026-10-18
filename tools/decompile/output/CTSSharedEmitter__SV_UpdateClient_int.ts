// TODO(D.4): the real CTSSharedEmitter class definition. Stub for typecheck.
declare class CTSSharedEmitter {
  // The256×8-byte per-recipient state array lives on `this` at offset
  // 0x800 in the original C++ layout. Model it explicitly when D.4
  // reconstructs the class.
  // m_pSlots: number; // byte offset within the entity blob
}

// TODO: runtime globals — defined elsewhere by the engine binding layer.
declare const ENGINE_VTABLE: any;     // [GOT + 0x1aa8]: engine vtable ptr
declare const GOT_0x1CF8: any;        // [GOT + 0x1cf8]: pointer-to-singleton
declare const MEM_U32: any;           // shared memory as Uint32Array view // (element-indexed; shift offsets >>> 2)

// Helper: load a u32 from a byte offset within MEM_U32's underlying buffer.
declare function loadU32(byteOffset: number): number;
// Helper: dereference a "pointer" (just a number/byte offset here) and read
// the pointed-to u32.
declare function loadPtr(addr: number): number;

/**
 * CTSSharedEmitter::SV_UpdateClient — broadcast shared-emitter state
 * updates to one recipient.
 *
 * Walks the 256 × 8-byte slot array at `this + 0x800` (NOT at `arg +
 * 0x800` — the assembly's `mov ebp, [esp+0x20]` reads the implicit
 * `this*` arg, not the explicit `int`). For each non-zero slot dword,
 * emits a MESSAGE_BEGIN / WRITE_* / WRITE_BYTE / MESSAGE_END quad * through the engine vtable. The `int arg` is the recipient id, passed
 * into `engine[0x120]` (BeginMessage recipient selector).
 *
 * ABI note: the function takes (this*, int). After prologue + outer
 * `sub esp,0xc`, `this` is at [esp+0x20] and the inner `sub esp,0xc`
 * shifts `arg` to [esp+0x30] for the engine call.
 *
 * @param this  The CTSSharedEmitter entity. `this + 0x800` is the base
 *              of the 256 × 8-byte per-recipient slot array.
 * @param arg   Recipient id (int). Passed to `engine[0x120]` and to
 *                  `[edi+0xb8]` as the buffer param via `eax`.
 * @returns     void
 */
export function SV_UpdateClient(this: CTSSharedEmitter, arg: number): void {
  // Engine vtable — loaded into edi once at the top, reused per iteration.
  const engine: any = ENGINE_VTABLE;

  // 256 slots, 8 bytes each (field0 at [ebp+0x0], field1 at [ebp+0x4]).
  // Loop counter ticks by 2 per iteration, tops out at 0x1ff inclusive.
  // Base comes from `this` (NOT `arg`), per the assembly's
  // `mov ebp, [esp+0x20]; add ebp, 0x800`.
  const thisAddr = (this as unknown as number) >>> 0;
  const slotBase = thisAddr + 0x800;
  for (let i = 0; i <= 0x1ff; i += 2) {
    const slotAddr = slotBase + (i >> 1) * 8;
    const field0 = loadU32(slotAddr);          // [ebp + 0x0]
    const field1 = loadU32(slotAddr + 4);      // [ebp + 0x4]

    if (field0 !== 0) broadcastSlotUpdate(engine, arg);
    if (field1 !== 0) broadcastSlotUpdate(engine, arg);
  }
}

// Per-slot broadcast: BeginMessage / Write(1, slotType, 0, buf) /
// WriteByte(1) / EndMessage. The slot-type singleton is reloaded inside
// this helper, mirroring the redundant `mov eax,[ebx+0x1cf8]; mov
// esi,[eax]` pair the compiler emits at each if-block site in the
// original disassembly.
export function broadcastSlotUpdate(engine: any, arg: number): void {
  // Two-step pointer-to-pointer load:
  //   eax = [GOT + 0x1cf8]    ; pointer to singleton
  //   esi = [eax]             ; singleton value (msg-type id)
  const slotType = loadU32(loadPtr(GOT_0x1CF8));
  const buf = engine[0x120](arg);              // BeginMessage(arg) → eax
  engine[0xb8](1, slotType, 0, buf);           // WriteXXX(1, slotType, 0, buf)
  engine[0xc0](1);                             // WriteByte(1)
  engine[0xbc]();                              // EndMessage()
}
