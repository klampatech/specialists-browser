// Stubs for compile-in-isolation (replace with real types/symbols in D.4).
type CTSAmmoPack = any;
type CBaseEntity = any;
type s_ammo_info = any;

declare const GetClassPtr: <T>(hint: any) => T | null;
declare const UTIL_ClientPrintAll: (
  printLevel: number,
  msg: string,
  ...rest: any[]
) => void;
declare const memcpy: (dst: any, src: any, bytes: number) => void;
declare const memset: (dst: any, val: number, bytes: number) => void;
declare const MAKE_STRING: (s: any) => any;
declare const AMMO_PACK_CLASSNAME: any;
declare const ERR_ALLOC_FAILED: any;

/**
 * CTSAmmoPack::CreateAmmoPack — Factory that allocates and initializes
 * a new CTSAmmoPack entity.
 *
 * @param this       CTSAmmoPack* — receiver; body does not read `this`
 * @param pOwner     CBaseEntity* — pev source for one copied field;
 *                   nullable (copy skipped if null)
 * @param ammoInfo   s_ammo_info* — 64-byte source block copied into
 *                   the new pack at offset +0x64; nullable (slot zeroed
 *                   if null)
 * @param unusedInt  int — present in the demangled symbol, never read
 *                   in this function body
 * @returns          CTSAmmoPack* on success, null on allocation failure
 */
export function CreateAmmoPack(
  this: CTSAmmoPack,
  pOwner: CBaseEntity | null,
  ammoInfo: s_ammo_info | null,
  unusedInt: number
): CTSAmmoPack | null {
  // 1. Allocate the new entity via the engine's class factory.
  //    The `0` arg is a standard NULL-entity hint for GetClassPtr<>.
  const newPack = GetClassPtr<CTSAmmoPack>(0);

  // 2. On allocation failure, broadcast an error to all clients and bail.
  if (newPack == null) {
    // Error string lives at [PIC - 0x6b7b0] in the binary; the trailing
    // 4 zeros are UTIL_ClientPrintAll's param1..param4 slots.
    // TODO(asm-ambiguous): exact error string content unknown.
    UTIL_ClientPrintAll(3, ERR_ALLOC_FAILED, 0, 0, 0, 0);
    return null;
  }

  // 3. Set pev->classname via the standard HL1 MAKE_STRING() pattern:
 //    (string_addr - gpGlobals->pStringBase).
  //    The classname string lives at [PIC - 0x6b6b7] in the binary.
  newPack.pev.classname = MAKE_STRING(AMMO_PACK_CLASSNAME);

  // 4. Copy 64 bytes (16 dwords) of ammo info into the pack, or zero
  //    the slot if no source was given.
  if (ammoInfo != null) {
    // rep movsd: ecx=16 dwords, src=ammoInfo (esi), dst=newPack+0x64.
    memcpy(newPack.ammoInfo, ammoInfo, 64);
  } else {
    // rep stosd: ecx=16 dwords, val=0, dst=newPack+0x64.
    memset(newPack.ammoInfo, 0, 64);
  }

  // 5. Invoke the virtual function at vtable offset 0x24 (vtable[9]).
  //    For a CBaseEntity-derived class this is most likely Spawn() —
  //    a unary init hook that takes the new pack as its sole arg.
  newPack.vtable[9](newPack);

  // 6. If an owner was provided, copy one pev field from owner to pack.
  if (pOwner != null) {
    // TODO(asm-ambiguous): pev offsets 0x198 and 0x208 are not in
    // the standard HL1 entvars_t (which ends around 0x180). Likely
    // TS mod extensions appended to the struct, or a pvPrivateData
    // reach-through optimized to a direct offset.
    (newPack.pev as any)[0x198] = (pOwner.pev as any)[0x208];
  }

  return newPack;
}
