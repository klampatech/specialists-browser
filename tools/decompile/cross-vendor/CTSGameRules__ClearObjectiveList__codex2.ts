/**
 * CTSGameRules::ClearObjectiveList — resets the round objective list.
 *
 * Zeros the objective count at this+0x2d0 and bulk-zeros the 160-slot
 * CTSObjective pointer array at this+0x2d4 (0x280 bytes / 0xa0 dwords,
 * 32-bit pointers). Called when a round restarts or the objective set
 * is wiped before re-initialization.
 *
 * Disassembly reference:
 *   [edi+0x2d0] = 0          ; clear count
 *   rep stosd, ecx=0xa0      ; zero 160 dwords (640 bytes)
 *
 * @param this  CTSGameRules instance (left as `any` until D.4 wires the class).
 */
export function ClearObjectiveList(this: any): void {
  // Clear the objective count field (this+0x2d0).
  this.m_NumObjectives = 0;
  // Zero-fill the 160-slot objective pointer array (this+0x2d4,
  // 0xa0 dwords = 0x280 bytes, 32-bit pointers).
  this.m_Objectives.fill(0);
}
