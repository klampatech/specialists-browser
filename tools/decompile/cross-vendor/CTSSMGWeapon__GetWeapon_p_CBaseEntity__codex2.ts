/**
 * CTSSMGWeapon::GetWeapon — handle a CBaseEntity (the picker) picking
 * up this SMG. GCC thiscall: `this` is the first stack arg
 * ([esp+0x20], loaded into `ebp`); `pEntity` is the second stack arg
 * ([esp+0x24]).
 *
 * Flow:
 *   1. Guard on `this->pev+0x118 < 0` (a TS-added sign-tested byte,
 *      past HLSDK entvars_t — likely a "dead" / invalid-state flag).
 *   2. Delegate to CTSGroundWeapon::GetWeapon(this, pEntity).
 *   3. On the same negative-arm after the base call, hit a virtual
 *      on the weapon itself: `this->vtable[0x11c](this)` →
 *      `this->m_iId` (offset 0xa4).
 *   4. Resolve `get_weapon_info(this->m_iId)`, take its string at
 *      info+0x1f2 (probably a model/name buffer inside the weapon
 *      info), then call the engine singleton's slot 8 with
 *      `(this->pev+0x208, info_string)` to (re)apply the SMG model.
 */
export function GetWeapon(this: CTSSMGWeapon, pEntity: CBaseEntity): void {
  const self = this as any;

  // 1. Guard: pev+0x118 is a TS-specific byte — bail.
  // TODO(asm-ambiguous): exact semantic of pev+0x118.
  if (((self.pev as any)[0x118] as number) < 0) {
    return;
  }

  // 2. Inner call pushes BOTH `this` (ebp) and pEntity ([esp+0x24])
  //    — standard GCC thiscall member invocation.
  //    (Previous decompilation passed `undefined` for pEntity; that
  //    is the bug this rewrite is fixing.)
  (CTSGroundWeapon as any).GetWeapon(self, pEntity);

  // 3. Re-check the guard. The asm jumps OVER this block on the
  //    non-negative arm.
  if (((self.pev as any)[0x118] as number) < 0) {
    // Virtual call: load vtable from self+0x60, invoke slot 0x11c
    // with self as the arg, store the result at self+0xa4 (m_iId).
    const vtable = (self as any)[0x60] as any;
    (self as any)[0xa4] = vtable[0x11c](self);
  }

  // 4. Look up the SMG's weapon_info by id; +0x1f2 is its string
  //    field (likely a fixed-size model/name buffer).
  // TODO(asm-ambiguous): info+0x1f2 role.
  const info = get_weapon_info((self as any)[0xa4] as any);
  const infoString = (info as any)[0x1f2] as string;

  // 5. Apply via the engine singleton ([ebx+0x1aa8] under PIC, i.e.
  //    g_engfuncs or similar): slot 8 with (pev+0x208, info_string).
  //    pev+0x208 is also a TS-added string field past HLSDK entvars_t.
  // TODO(asm-ambiguous): pev+0x208 role, engine singleton identity.
  const pevString = (self.pev as any)[0x208] as string;
  const engine = (globalThis as any).g_Engine as any;
  (engine[8] as any)(pevString, infoString);
}
