/**
 * CTSShotgunWeapon::GetWeapon — pickup handler invoked when an entity picks
 * up a shotgun weapon from the ground.
 *
 * Calling convention: GCC thiscall-on-stack (x86-32 Linux). `this` is the
 * first stack arg = `ebp` for the whole function. The picker (`pEntity`)
 * is the second stack arg; it is *not* read directly by this function —
 * it is only forwarded to the parent CTSGroundWeapon::GetWeapon.
 *
 * All `[ebp+0x…]` accesses in the disassembly are on `this` (the weapon
 * being picked up), not on `pEntity` (the picker).
 */
export function GetWeapon(this: any /* CTSShotgunWeapon */, pEntity: any /* CBaseEntity */): void {
  // pev is the first data member of CBaseEntity (inherited as the vptr is
  // typically at offset 0 in single-inheritance, and the disassembly does
  // [ebp+0] to load it). Use `any` because the offset inside the C++ object
  // is a compiler-layout detail.
  const pev: any = this[0];

  // 1. Early-out: skip the pickup if a TS-specific flag at pev+0x118 has
  //    its high bit set. The disassembly does `cmp BYTE PTR [pev+0x118], 0`
  //    followed by `js end` (jump-on-sign fires when a signed byte < 0,
  //    i.e. the 0x80 bit is set). This is NOT `pev->flags` (which sits at
  //    offset 0xc4 in HLSDK's entvars_t). The field at 0x118 is unidentified.
  // TODO(asm-ambiguous): identify pev+0x118. Bit 0x80 = "skip pickup".
  if ((pev[0x118] & 0x80) !== 0) {
    return;
  }

  // 2. Delegate to CTSGroundWeapon::GetWeapon with the same (this, pEntity)
  //    pair. The parent's demangled signature only lists 1 explicit arg,
  //    but the disassembly pushes two stack args before the PLT call —
  //    i.e. it forwards both `this` and the caller's `pEntity`.
  groundWeaponGetWeapon(this, pEntity);

  // 3. Re-check the same flag. If now set, dispatch a virtual method on
  //    `this` (via a function-pointer table at object offset 0x60, entry
  //    at 0x11c) and cache the returned weapon-type id at object offset
  //    0xa4. The vtable being at offset 0x60 (not 0) is unusual for single
  //    inheritance and suggests multiple inheritance, a TS-specific vptr
  //    placement, or a non-virtual function-pointer table.
  if ((pev[0x118] & 0x80) !== 0) {
    // TODO(asm-ambiguous): the "vtable" at this[0x60] and its 0x11c-th
    // entry (index 0x47) are unidentified.
    const vtable = this[0x60] as {
      [offset: number]: (self: any) => number;
    };
    this[0xa4] = vtable[0x11c](this);
  }

  // 4. Always: look up the TS weapon-info struct for the cached weapon-type
  //    id, then dispatch through a global function table (PIC base + 0x1aa8,
  //    function index 2) passing (this->pev+0x208, info+0x1f2). 0x1f2 is
  //    an offset into the TSWeaponInfo struct (likely a sound or string
  //    field; unidentified).
  const receiver = pev[0x208]; // TODO(asm-ambiguous): pev+0x208 unidentified
  const funcTable = (globalThis as any)[0x1aa8] as Array<
    (receiver: any, info: number) => void
  >;
  const info = getWeaponInfo(this[0xa4]) + 0x1f2;
  funcTable[2](receiver, info);
}
