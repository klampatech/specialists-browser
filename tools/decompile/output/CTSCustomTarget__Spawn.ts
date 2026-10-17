// Half-Life engine "string-t" macro:
//   STRING(literal) ≡  addr(literal) − gpGlobals->pStringBase.
// We don't need the real body for D.3 — `any` is fine.
declare function STRING(literal: string): number;

// CTSCustomTarget — full layout not yet in scope (D.4 task).
// CBaseEntity gives us `pev`; everything beyond is `any` so the
// `field_0xNNN` placeholders below type-check without a header.
interface CTSCustomTarget {
  pev: any;
  [key: string]: any;
}

/**
 * CTSCustomTarget::Spawn — one-time entity initialization on map spawn.
 *
 *   • classname = "ts_custom_target"        (STRING-derived)
 *   • flags    |= 0x80                       (TS-mod flag; verify vs. HL SDK)
 *   • solid    = 0                           (SOLID_NOT)
 *   • movetype = 5                           (MOVETYPE_PUSH)
 *   • zero six internal CTSCustomTarget fields
 *       0x0c, 0x10, 0x14, 0x18, 0x870, 0x874
 *     (populated by KeyValue, read by GetTargets / FireTarget / Use).
 *
 * @param this  The CTSCustomTarget instance
 */
export function Spawn(this: CTSCustomTarget): void {
  const pev: any = this.pev;

  // disasm:  lea  eax, [ebx-0x6ed83]      ; addr("ts_custom_target")
  //           sub  eax, [gpGlobals+0x98]   ; minus pStringBase
  //           mov  [esi], eax               ; → pev.classname
  pev.classname = STRING('ts_custom_target');

  // disasm:  or [esi+0x118], 0x80
  pev.flags |= 0x80;

  // disasm:  mov [esi+0x10c], 0      ; SOLID_NOT
  pev.solid = 0;

  // disasm:  mov [esi+0x108], 0x5    ; MOVETYPE_PUSH
  pev.movetype = 5;

  // disasm:  zero six class fields. Offsets taken straight from the asm.
  //
  //          TODO(asm-ambiguous): the real field semantics come from
  //          CTSCustomTarget's full layout (D.4). 0x0c..0x18 looks like
  //          a small int array (target counts, next-to-fire, total fires,
  //          etc.); 0x870..0x874 are two adjacent 4-byte slots — possibly
  //          pointer/size fields inherited from a base class.
  this.field_0x14  = 0;     // matches disasm order
  this.field_0x18  = 0;
  this.field_0x0c  = 0;
  this.field_0x10  = 0;
  this.field_0x870 = 0;
  this.field_0x874 = 0;
}
