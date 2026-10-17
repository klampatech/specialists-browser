/**
 * CTSPowerUp::KeyValue — engine key-value dispatcher for the power-up entity.
 *
 * Compares pkvd.szKeyName against three known strings (loaded from the
 * module's global offset table). For a known key, parses pkvd.szValue
 * into the matching this field and sets pkvd.fHandled = 1; on a miss,
 * chains to CBaseDelay::KeyValue so the base class can attempt its own
 * handlers.
 *
 * Fields written into this by the matched branches:
 *   +0x84  m_iPowerUpType   int   — decimal strtol  (branch 1)
 *   +0x94  m_iAmount        int   — decimal strtol  (branch 2)
 *   +0x98  m_flValue        float — strtod (→ float32)  (branch 3)
 *
 * NOTE: the three key literals are unresolved at D.3 — they must be
 * filled in from tools/decompile/analysis/strings-n5.txt (GOT-relative
 * offsets GOT-0x6c693, GOT-0x6c6a0, GOT-0x6c68a). Until then, the
 * throw()s in each branch make the gap loud rather than silent.
 *
 * @param this  The CTSPowerUp entity instance
 * @param pkvd  Engine-provided key/value descriptor (KeyValueData_s*)
 * @returns     void
 */
// TODO(decompile-D.4): replace `any` on this/pkvd with the real
// CTSPowerUp and KeyValueData_s once class reconstruction lands.
export function KeyValue(this: any, pkvd: any): void {
  // ---- Branch 1 -----------------------------------------------------
  // Disassembly: strcmp(pkvd->szKeyName, GOT-0x6c693) →
  //   __strtol_internal(pkvd->szValue, NULL, 10, 0) →
  //   this->m_iPowerUpType (+0x84, int) →
  //   pkvd->fHandled (+0xc) = 1 → jmp epilogue.
  if (pkvd.szKeyName === KEY_1_LITERAL) {
    // TODO(decompile-D.3): field name unverified — confirm in D.4.
    this.m_iPowerUpType = parseInt(pkvd.szValue, 10);
    pkvd.fHandled = 1;
    return;
  }

  // ---- Branch 2 -----------------------------------------------------
  // Disassembly: strcmp(pkvd->szKeyName, GOT-0x6c6a0) →
  //   __strtol_internal(pkvd->szValue, NULL, 10, 0) →
  //   this->m_iAmount (+0x94, int) →
  //   pkvd->fHandled (+0xc) = 1 → jmp epilogue.
  if (pkvd.szKeyName === KEY_2_LITERAL) {
    // TODO(decompile-D.3): field name unverified — confirm in D.4.
    this.m_iAmount = parseInt(pkvd.szValue, 10);
    pkvd.fHandled = 1;
    return;
  }

  // ---- Branch 3 -----------------------------------------------------
  // Disassembly: strcmp(pkvd->szKeyName, GOT-0x6c68a) →
  //   __strtod_internal(pkvd->szValue, NULL, 0) →
  //   fstp DWORD PTR [this+0x98] (truncate double → float32) →
  //   pkvd->fHandled (+0xc) = 1 → jmp epilogue.
  if (pkvd.szKeyName === KEY_3_LITERAL) {
    // TODO(decompile-D.3): field name unverified — confirm in D.4.
    // Math.fround() to mirror the disassembly's `fstp DWORD PTR` (float32).
    this.m_flValue = Math.fround(parseFloat(pkvd.szValue));
    pkvd.fHandled = 1;
    return;
  }

  // ---- Fallthrough --------------------------------------------------
  // Disassembly: sub esp,0x8; push esi (pkvd, rightmost); push edi (this, leftmost);
  //   call CBaseDelay::KeyValue(this, pkvd).
  // cdecl pushes right-to-left, so edi (pushed last) is arg1 = this,
  // esi (pushed first) is arg2 = pkvd. Effective call is  //   CBaseDelay::KeyValue(this, pkvd).
  CBaseDelay_KeyValue(this, pkvd);
}

// ---------------------------------------------------------------------------
// Unresolved string literals (D.3 TODO).
// Resolve from tools/decompile/analysis/strings-n5.txt by finding the
// substring at file offset = GOT_BASE - 0x6c693 / 0x6c6a0 / 0x6c68a
// (GOT_BASE = 0x000b5e10 per the PIC setup at 87ec7: add ebx,0xddf49).
//
// Until resolved, the throw()s make the gap obvious at runtime and at
// review time. Do NOT ship with empty-string compares — that's silently
// wrong, not a TODO.
// ---------------------------------------------------------------------------
function _unresolvedKeyLiteral(gotOffset: string): string {
  throw new Error(
    `TODO(decompile-D.3): unresolved key literal at ${gotOffset}. ` +
    `Resolve from tools/decompile/analysis/strings-n5.txt.`
  );
}
const KEY_1_LITERAL: string = _unresolvedKeyLiteral("GOT-0x6c693"); // branch 1
const KEY_2_LITERAL: string = _unresolvedKeyLiteral("GOT-0x6c6a0"); // branch 2
const KEY_3_LITERAL: string = _unresolvedKeyLiteral("GOT-0x6c68a"); // branch 3
