// --- minimal forward decls so this snippet compiles in isolation ---
type CTSKatanaWeapon = any;
declare class CTSGroundWeapon {
  static Spawn(self: CTSKatanaWeapon): void;
}

/**
 * CTSKatanaWeapon::Spawn — stamps the TS katana weapon ID (0x22)
 * into the CBasePlayerItem weapon-ID slot, then tail-calls
 * CTSGroundWeapon::Spawn for engine-driven entity initialization.
 *
 *   Demangled symbol : Spawn__15CTSKatanaWeapon
 *   Address / size   : 0x000b9eec / 44 B (ts/dlls/ts_i386.so)
 *   Calling conv.    : cdecl (callee-cleans via `add esp, 0x18`)
 */
export function Spawn(this: CTSKatanaWeapon): void {
  // disasm: mov DWORD PTR [eax+0xa4], 0x22
  // [this+0xa4] is the m_iId slot on the CBasePlayerItem
  // chain; 0x22 is the TS katana weapon identifier.
  this.m_iId = 0x22;

  // disasm: sub esp, 0xc; push eax; call
  //         Spawn__15CTSGroundWeapon@plt; add esp, 0x18
  // Direct (non-virtual, PLT) call to CTSGroundWeapon::Spawn
  // with `this` as the sole argument.
  CTSGroundWeapon.Spawn(this);
}
