/**
 * CTSMapGlobals::KeyValue — stub key/value handler. Doesn't interpret
 * any keys; reports every key/value pair as unhandled by clearing
 * pkvd.fHandled to 0.
 *
 * Disassembly (12 B):
 *   mov  eax, [esp+0x8]      ; pkvd (thiscall-style: this at [esp+4])
 *   mov  [eax+0xc], 0x0      ; pkvd->fHandled = 0  (offset 0xc under
 *                             ;   the char*-string KeyValueData_s
 *                             ;   layout: szClassName @ +0, szKeyName
 *                             ;   @ +4, szValue @ +8, fHandled @ +0xc)
 *   ret
 *
 * No base-class dispatch — the original C++ overrides
 * CBaseEntity::KeyValue with an empty body, so the compiler emitted
 * just the fHandled-clear. There is no `call CBaseEntity::KeyValue`
 * in the 12-byte body.
 *
 * @param this  CTSMapGlobals instance (unused; kept for signature fidelity)
 * @param pkvd  Engine-supplied key/value descriptor. On return, the
 *              engine inspects pkvd.fHandled: 0 = not handled.
 */
export function KeyValue(this: any, pkvd: any): void {
  pkvd.fHandled = 0;
}
