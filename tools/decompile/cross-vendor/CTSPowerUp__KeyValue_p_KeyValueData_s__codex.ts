```typescript
/**
 * CTSPowerUp::KeyValue — engine key-value dispatcher for the power-up entity.
 *
 * Compares pkvd.szKeyName against up to three known strings (loaded from the
 * module's global offset table). For a known key, parses pkvd.szValue into
 * the matching this field and sets pkvd.fHandled = 1; on a miss, chains to
 * CBaseDelay::KeyValue so the base class can attempt its own handlers.
 *
 * Fields written into this by the matched branches:
 *   +0x84  m_iPowerUpType   int   — decimal strtol  (branch 1)
 *   +0x94  m_iAmount        int   — decimal strtol  (branch 2)
 *   +0x98  m_flValue        float — strtod          (branch 3)
 *
 * @param this  The CTSPowerUp entity instance
 * @param pkvd  Engine-provided key/value descriptor (KeyValueData_s*)
 * @returns     void
 */
// TODO(decompile): CTSPowerUp and KeyValueData_s are project-level types
// declared elsewhere in the engine compat layer; once available, drop the
// `: any` annotations on this/pkvd.
export function KeyValue(this: any, pkvd: any): void {
  // Branch 1: key literal at GOT - 0x6c693.
  // TODO(asm-ambiguous): confirm literal against
  //   tools/decompile/analysis/strings-n5.txt (search by offset delta from GOT).
  if (pkvd.szKeyName === /* TODO: key literal #1 (GOT-0x6c693) */ "") {
    // __strtol_internal(szValue, endptr=NULL, base=10, group=0)
    this.m_iPowerUpType = parseInt(pkvd.szValue, 10);
    pkvd.fHandled = 1;
    return; // original: jmp to shared epilogue
  }

  // Branch 2: key literal at GOT - 0x6c6a0.
  // TODO(asm-ambiguous): confirm literal against strings-n5.txt.
  if (pkvd.szKeyName === /* TODO: key literal #2 (GOT-0x6c6a0) */ "") {
    // __strtol_internal(szValue, endptr=NULL, base=10, group=0)
    this.m_iAmount = parseInt(pkvd.szValue, 10);
    pkvd.fHandled = 1;
    return;
  }

  // Branch 3: key literal at GOT - 0x6c68a. On match, parses via __strtod_internal
  // (FPU push through strtod; fstp stores a 32-bit float into this+0x98).
  // TODO(asm-ambiguous): confirm literal against strings-n5.txt.
  if (pkvd.szKeyName === /* TODO: key literal #3 (GOT-0x6c68a) */ "") {
    // __strtod_internal(szValue, endptr=NULL, group=0)
    this.m_flValue = parseFloat(pkvd.szValue);
    pkvd.fHandled = 1;
    return;
  }

  // No own match — defer to the base class (PLT call: CBaseDelay::KeyValue).
  // The original reverses the argument order on the stack (this pushed first,
  // pkvd pushed second) when chaining; semantically equivalent to forwarding.
  CBaseDelay_KeyValue(this, pkvd);
}
```
