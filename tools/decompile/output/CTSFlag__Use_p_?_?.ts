/**
 * CTSFlag::Use — forward the activator + use-type to PlayerTakeFlag.
 *
 * Demangled from `Use__7CTSFlagP11CBaseEntityT18USE_TYPEf`:
 *   CTSFlag::Use(CBaseEntity* pActivator, USE_TYPE useType, float value)
 *
 * Disassembly (37 B, straight-line, no branches):
 *   push ebx
 *   sub esp, 0x8
 *   call $+0        ; PIC: get EIP
 *   pop ebx
 *   add ebx, 0xd782b ; ebx = 0xbc410 (GOT base for [ebx+off] addressing *                    ; inside PlayerTakeFlag; Use itself reads no globals)
 *   sub esp, 0x8
 *   push [esp+0x1c] ; pActivator  (under cdecl-this: first stack arg)
 *   push [esp+0x1c] ; useType     (esp shifted, next arg slot)
 *   call PlayerTakeFlag@plt
 *   add esp, 0x18
 *   pop ebx
 *   ret
 *
 * Only `value` is *not* forwarded (no third push). PlayerTakeFlag's
 * mangled symbol `PlayerTakeFlag__7CTSFlagP11CBaseEntity` shows one
 * arg; the second push strongly implies it actually takes
 * `(CBaseEntity*, USE_TYPE[, float])` — D.4 will resolve by reading
 * PlayerTakeFlag's own disassembly chunk.
 */
export function Use(
  this: any, // CTSFlag — class context only, no fields touched
  pActivator: any,      // CBaseEntity
  useType: any,         // USE_TYPE
  value: number,        // float — accepted per signature, dropped before the call
): void {
  this.PlayerTakeFlag(pActivator, useType);
}
