// Field offset reference (from disassembly b9e1c..b9ea5):
//   pEntity->pev             = [ebp+0x0]
//   pev.button               = [eax+0x118]   // sign-bit flag (TODO: confirm against entvars_t)
//   pEntity.field_0x60       = [ebp+0x60]    // sub-object with fn ptr at +0x11c
//   pEntity.field_0xa4       = [ebp+0xa4]    // weapon-id slot; written by sub-object vfn
//   pev.at_0x208             = [eax+0x208]   // model / weapon-related ptr (TODO semantics)
//   modBase[0x1aa8]          = [ebx+0x1aa8]  // singleton (engine interface?)
//   fn ptr in singleton      = [esi+0x8]     // NOT a vtable, direct function pointer

type AnyFn = (...args: any[]) => any;
type AnyPtr = any;

// Placeholders so the function compiles in isolation.
// Replace with real types in D.4 when CTSKnifeWeapon is modelled.
declare const superGetWeapon: AnyFn;          // CTSGroundWeapon::GetWeapon
declare const get_weapon_info: (id: any) => AnyPtr;
declare const modBase: any;                    // PIC base for [ebx+...] globals

/**
 * CTSKnifeWeapon::GetWeapon(p CBaseEntity) — knife-specific weapon pickup / sync.
 *
 * 1. If `pev.button & 0x80` is set on entry, bail out without doing anything.
 * 2. Delegate to the parent class (CTSGroundWeapon::GetWeapon), which may
 *    transition the entity into the "weapon held" state and flip `pev.button`.
 * 3. If `pev.button & 0x80` is now set, invoke the sub-object's
 *    function pointer at offset 0x11c with `this = subObject` and
 *    `pEntity` as the argument, and stash the result in `pEntity.field_0xa4`.
 * 4. Unconditionally: look up weapon info by `pEntity.field_0xa4` and
 *    hand a `(modelRef, &weaponInfo + 0x1f2)` pair to the module
 *    singleton's function pointer at offset 0x8.
 */
export function GetWeapon(this: any, pEntity: any): void {
  // [b9e33..b9e3d]  read pev; if button's sign bit is set, jump to epilogue.
  const pev = pEntity.pev;
  if (((pev.button as number) & 0x80) !== 0) {
    return;
  }

  // [b9e3f..b9e4c]  sub esp,0x8 ; push arg ; push this ; call CTSGroundWeapon::GetWeapon
  // Note: TS hides `this` for an inherited method, so call it on `this`.
  // TODO(asm-ambiguous): order of arg pushes vs. `this`-in-ecx in the parent call.
  superGetWeapon(this, pEntity);

  // [b9e4c..b9e52]  compiler reloads pEntity->pev after the parent call.
  const pevReload = pEntity.pev;

  // [b9e52..b9e59]  re-check the same sign bit. If still 0, skip the vfn block.
  if (((pevReload.button as number) & 0x80) !== 0) {
    // [b9e5b..b9e6e]  sub esp,0xc ; load sub-object ; call its fn ptr at +0x11c ;
    //                  store return value in pEntity.field_0xa4 ; add esp,0x10
    // TODO(asm-ambiguous): the disassembler omits `mov ecx, eax` for
    //                      the `this` of this vfn; almost certainly present in binary.
    const subObject: any = pEntity.field_0x60;
    const result: any = subObject["0x11c"](pEntity); // `this` = subObject
    pEntity.field_0xa4 = result;
  }

  // [b9e71..b9e9e]  unconditional tail: read the per-entity model/extension
  //                  pointer, look up weapon info, hand it to the singleton.
  //
  // [b9e74]   edi = pev[0x208]            — model / weapon-entity ref.
  // [b9e7d]   esi = modBase[0x1aa8]      — module singleton (engine iface?).
  const modelRef: any = pevReload["0x208"];
  const weaponIfaceSingleton: any = modBase["0x1aa8"];

  // [b9e83..b9e8e]  get_weapon_info(pEntity.field_0xa4) ; cleanup 8 bytes
  //                  (disassembly `add esp,0x8` after a single 4-byte push
  //                   is odd; captured as a 1-arg call to match the
  //                   Itanium-mangled signature `get_weapon_info__F10tsweapon_t`).
  const weaponInfo: AnyPtr = get_weapon_info(pEntity.field_0xa4);

  // [b9e91..b9e9b]  call singleton's direct function pointer at offset 0x8
  //                  with args (modelRef, &weaponInfo->offset_0x1f2).
  // This is a direct function pointer in the singleton struct,
  // NOT a vtable slot.
  weaponIfaceSingleton["0x8"](modelRef, weaponInfo + 0x1f2);
}
