```typescript
/**
 * CTSStunt::SlotBonus — no-op stub. Computes the PIC/GOT base in the
 * prologue but never references any globals; returns 0 unconditionally.
 *
 * @param this  The CTSStunt entity instance (this in the original C++)
 * @returns     Always 0 (no bonus / disabled feature).
 */
export function SlotBonus(this: CTSStunt): number {
  // Original assembly:
  //   push ebx
  //   call $+5              ; PIC: get current IP into ebx
  //   pop ebx               ; ebx = 0x8a486
  //   add ebx, 0xdb98a      ; ebx = GOT base (computed but never used)
  //   mov eax, 0x0          ; return value = 0
  //   pop ebx
  //   ret
  // No `[esi+offset]` field reads/writes and no `[ebx+offset]` global
  // accesses — `this` is unused.
  // TODO(asm-ambiguous): GOT base is computed but never dereferenced —
  // either a deliberately empty stub (e.g. a disabled slot-machine bonus
  // path in the stunt system) or the compiler optimized a real body down
  // to a plain `return 0;` while leaving the PIC prologue intact.
  return 0;
}
```
