// Minimal class stub so this D.3 decompilation compiles in isolation.
// Will be widened in D.4 once we enumerate the real CTSStunt fields/methods.
interface CTSStunt {
  // populated in D.4
}

/**
 * CTSStunt::SlotBonus — no-op stub. Computes the PIC/GOT base in the
 * prologue but never references any globals; returns 0 unconditionally.
 *
 * @returns Always 0.
 */
export function SlotBonus(this: CTSStunt): number {
  // Original assembly (0x0008a480, 20 bytes):
  //   push ebx
  //   call $+5              ; PIC: get current IP into ebx
  //   pop ebx               ; ebx = 0x8a486
  //   add  ebx, 0xdb98a     ; ebx = GOT base (computed but never used)
  //   mov  eax, 0x0         ; return value = 0
  //   pop  ebx
  //   ret
  // No `[esi+offset]` field reads/writes and no `[ebx+offset]` global
  // accesses in the body — `this` is unused.
  //
  // TODO(asm-ambiguous): GOT base is set up but never dereferenced. This
  // is either a deliberately empty stub (a disabled slot-machine bonus
  // path in the stunt system) or the compiler folded a real body down
  // to `return 0;` while leaving the PIC prologue intact.
  return 0;
}
