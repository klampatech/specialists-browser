/**
 * CTSGun::GetItemInfo(p ItemInfo) — populate the ItemInfo HUD/pickup struct
 * for this weapon. Returns 1 once the struct is filled out.
 *
 * Disassembly: 130 B at 0x00075dd0. Fills ~10 fields of ItemInfo and assigns
 * m_iId on `this`. The iMaxClip field at +0x18 is the only runtime-computed
 * one — its value depends on an engine singleton + a subobject pointer.
 */
export function GetItemInfo(this: CTSGun, pItemInfo: ItemInfo): number {
  // ----- HUD slot/position -----
  pItemInfo.iSlot     = 1;          // +0x00 — pistol slot
  pItemInfo.iPosition = 2;          // +0x04 — second weapon in slot

  // ----- ammo (no primary/secondary ammo declared) -----
  pItemInfo.iAmmoIndex  = 0;        // +0x08 — no primary ammo
  pItemInfo.iMaxAmmo    = -1;       // +0x0c
  pItemInfo.iAmmo2Index = 0;        // +0x10 — no secondary ammo
  pItemInfo.iMaxAmmo2   = -1;       // +0x14

  // ----- iMaxClip: runtime-computed (asm) -----
  // TODO(asm-ambiguous): the asm loads `*GOT[0x1600]` (a pointer to some
  // engine singleton), reads at byte offset 0x98 of the struct at that
  // address, and adds `*(*this)` (the first int of the struct pointed to
  // by this[0]). Until GOT[0x1600] is resolved against engine globals,
  // the exact value is unknown. Sentinel -1 keeps the placeholder distinct
  // from a valid count of 0; iMaxClip MUST be resolved before this weapon
  // ships.
  pItemInfo.iMaxClip = -1;          // +0x18 — runtime-computed (placeholder)

  // ----- flags + id -----
  pItemInfo.iFlags    = -1;         // +0x1c — no special flags
  pItemInfo.iId       = 0x10;       // +0x20 — TS weapon id 16
  pItemInfo.iReserved = 0;          // +0x24 — TS-specific (verify name)
  pItemInfo.iFlags2   = 1;          // +0x28 — TS-specific (verify name)

  // ----- mirrored on `this` (asm: [esi+0x88]) -----
  // m_iId is set before the iId write in the asm, but order doesn't matter
  // functionally; both writes happen before return.
  this.m_iId = 0x10;                // +0x88 — TS weapon id 16

  return 1;
}

// --- minimal type stubs so this compiles in isolation ---
class CTSGun {
  m_iId: number = 0;
}

interface ItemInfo {
  iSlot: number;
  iPosition: number;
  iAmmoIndex: number;
  iMaxAmmo: number;
  iAmmo2Index: number;
  iMaxAmmo2: number;
  iMaxClip: number;
  iFlags: number;
  iId: number;
  iReserved: number;
  iFlags2: number;
}
