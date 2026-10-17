/**
 * CTSSMGWeapon::Spawn — initializes the SMG weapon entity.
 *
 * Source: `tools/decompile/chunks/Spawn__12CTSSMGWeapon.chunk.md`
 * Address: 0x000b98e0 (54 bytes)
 *
 * Disassembly behavior:
 *   1. Load `this`.
 *   2. Read a function-table pointer from `this+0x60`.
 *   3. Call the table entry at byte offset 0x11c (= vtable slot 0x47 if
 *      entries are 4 bytes), passing `this` as the sole argument.
 *   4. Store the returned int at `this+0xa4`.
 *   5. Tail-call `Spawn__15CTSGroundWeapon(this)`.
 *
 * The subsystem owning the table at `this+0x60` and the meaning of the
 * int stored at `this+0xa4` are not yet recovered — see D.4.
 */
export function Spawn(this: any): void {
  // TODO(asm-ambiguous): the function table at this+0x60 + slot 0x11c
  //   and the int-sized field at this+0xa4 are not yet cross-referenced
  //   to a TS mod symbol. Until D.4 lands, treat both as opaque
  //   pointers / int slots. Likely candidates: a model-index lookup
  //   cached on the entity, but unverified.
  const vtable: any = (this as any)[0x60];
  (this as any)[0xa4] = vtable[0x11c](this);

  // Delegate the rest of spawn to the base class.
  (Spawn__15CTSGroundWeapon as any)(this);
}
