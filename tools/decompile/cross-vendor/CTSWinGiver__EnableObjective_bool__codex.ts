```typescript
/**
 * CTSWinGiver::EnableObjective — resets objective state fields to zero.
 *
 * Despite the "Enable" name, the body unconditionally clears the objective
 * int and flag byte; the bool parameter is declared in the mangled symbol
 * but never inspected in the disassembly (compiler likely folded the branch
 * at the call site).
 *
 * @param this  The CTSWinGiver entity instance (this in the original C++)
 * @param enable  Declared bool argument; unused by the body.
 * @returns     void
 */
export function EnableObjective(this: CTSWinGiver, enable: boolean): void {
  // TODO(asm-ambiguous): the `enable` parameter is not read — confirm whether
  // any caller ever passes `true`, or whether this is effectively a reset.
  this.m_iObjective = 0; // [this+0x64] DWORD cleared
  this.m_bObjective = 0;  // [this+0x68] BYTE cleared
}
```
