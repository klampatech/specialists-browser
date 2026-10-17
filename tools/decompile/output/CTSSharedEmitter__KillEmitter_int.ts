// Minimal stub so this file compiles in isolation.
// Real CTSSharedEmitter layout will be filled in during D.4.
interface CTSSharedEmitter {
  // TODO(asm-ambiguous): confirm actual C++ field name (m_emitters? m_pEmitters?).
  // The disassembly only reveals that the array stride is4 bytes (DWORD-sized).
  emitters: any[];
}

/**
 * CTSSharedEmitter::KillEmitter — clear the emitter slot at the given index,
 * effectively killing (deactivating) the emitter stored there.
 *
 * Disassembly: 4 instructions, cdecl, no PLT calls, no branches.
 *   mov edx, [esp+0x4]          ; this
 *   mov eax, [esp+0x8]          ; slot
 *   mov DWORD PTR [edx+eax*4],0 ; this->emitters[slot] = 0
 *   ret
 *
 * @param this  The CTSSharedEmitter entity instance
 * @param slot  Index into the emitter slot array to clear
 */
export function KillEmitter(this: CTSSharedEmitter, slot: number): void {
  this.emitters[slot] = 0;
}
