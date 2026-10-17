/**
 * CTSGameRules::UpdateTeamScores(int, int) — observed as a no-op stub
 * in `ts_i386.so`. The 21-byte body is prologue + a dead PIC/GOT
 * base setup + epilogue, with no field reads, no field writes, and
 * no calls:
 *
 *   push ebx                       ; save callee-saved ebx
 *   sub  esp, 0x8                  ; allocate 8 B of locals (unused)
 *   call 0x67911                   ; PIC: push next-instr addr
 *   pop  ebx                       ; ebx = 0x67911
 *   add  ebx, 0xfe4ff              ; ebx = 0x160E10 (GOT base, unused)
 *   add  esp, 0x8                  ; deallocate locals
 *   pop  ebx                       ; restore caller's ebx (clobbers PIC base)
 *   ret                            ; void return, no eax setup
 *
 * The PIC setup computes the GOT base into `ebx` but never reads
 * `[ebx+...]` before the function returns, so it is dead code. Likely
 * the original body was inlined into `TeamWin` (sibling at 0x68a08,
 * 1564 B) and the compiler eliminated this override. D.4 will
 * cross-reference `TeamWin` and the scoreboard HUD to confirm.
 *
 * Signature is faithful to the demangled symbol
 * `UpdateTeamScores__12CTSGameRulesii`:
 *   - class: `CTSGameRules` (the `ii` at the end of the mangled
 *     symbol is the function's two-`int` arg suffix, not part of
 *     the class name)
 *   - args: int, int
 *   - return: void
 */
export function UpdateTeamScores(
  this: any, // CTSGameRules — real interface defined in D.4
  score1: number,
  score2: number,
): void {
  // No-op. The 21-byte body does no work; see JSDoc above and
  // tools/decompile/chunks/UpdateTeamScores__12CTSGameRulesii.chunk.md.
}
