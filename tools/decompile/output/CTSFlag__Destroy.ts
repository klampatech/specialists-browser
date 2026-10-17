// Local stubs so this snippet compiles in isolation.
// In the real codebase these are imported from sibling DLL modules.
declare class CTSFlag {
  // TODO(asm-ambiguous): field type at offset 0xAC is not disambiguatable
  // from the disassembly alone (bool vs 1-bit bitfield are both consistent
  // with the observed 1-byte store). Verify against DWARF.
  m_fInProcessOfBeingRemoved: any;
}
declare function RemoveEntityFromSlowedArray(ent: CTSFlag): void;
declare function UTIL_Remove(ent: CTSFlag): void;

/**
 * CTSFlag::Destroy — marks the flag as being removed, deregisters it
 * from the slow-motion entity array, and removes it from the world.
 *
 * @param this  The CTSFlag entity instance (this in the original C++)
 * @returns     void
 *
 * Disassembly (ts_i386.so, 0x0008de24, 51 B):
 *   sub esp,0x4
 *   mov esi,[esp+0x10]            ; this
 *   mov BYTE PTR [esi+0xac],0x1   ; m_fInProcessOfBeingRemoved = 1
 *   push esi
 *   call RemoveEntityFromSlowedArray
 *   call UTIL_Remove
 *   ret
 */
export function Destroy(this: CTSFlag): void {
  // TODO(asm-ambiguous): field type at offset 0xAC — verify against DWARF.
  this.m_fInProcessOfBeingRemoved = 1;

  // Detach from the slow-motion entity bookkeeping array.
  RemoveEntityFromSlowedArray(this);

  // Actually remove the entity from the world.
  UTIL_Remove(this);
}
