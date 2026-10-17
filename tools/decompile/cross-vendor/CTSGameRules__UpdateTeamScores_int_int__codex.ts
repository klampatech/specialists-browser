```typescript
/**
 * CTSGameRules::UpdateTeamScores — empty stub. The MSVC compiler
 * eliminated the original body; the surviving 21 bytes are just
 * prologue + dead PIC/GOT base setup + epilogue, with no actual
 * scoring logic.
 *
 * @param this    The CTSGameRules entity instance (this in original C++)
 * @param score1  Team 1 score update (unused)
 * @param score2  Team 2 score update (unused)
 * @returns       void
 */
export function UpdateTeamScores(
  this: CTSGameRules,
  score1: number,
  score2: number,
): void {
  // The original C++ body was inlined or dead-code-eliminated by the
  // compiler. The remaining 21 bytes are:
  //
  //   push ebx                       ; save callee-saved ebx
  //   sub  esp, 0x8                  ; allocate 8 bytes of locals
  //   call $+5                       ; PIC trick: push return-addr
  //   pop  ebx                       ; ebx = 0x67911
  //   add  ebx, 0xfe4ff             ; ebx = 0x160E10 (GOT base)
  //   add  esp, 0x8                  ; deallocate locals
  //   pop  ebx                       ; restore caller's ebx
  //   ret
  //
  // No `[ebx+...]` access happens, and no `this` fields are read or
  // written, so this function is effectively a no-op. The PIC setup
  // is dead code left over from a (now-removed) body that referenced
  // globals.
  // TODO(asm-ambiguous): confirm against `TeamWin` and the scoreboard
  //   HUD that this stub is intentionally empty rather than a real
  //   implementation that got accidentally dead-code-eliminated.
}

// TODO: define the `CTSGameRules` interface (D.4 task) — fields and
// virtuals used by the rest of CTSGameRules::UpdateTeamScores's
// sibling method `TeamWin(int, int, bool, ?)`.
```
