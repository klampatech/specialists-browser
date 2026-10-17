/**
 * CTSGroundAmmo::KeyValue — parse a map-entity keyvalue pair for a
 * ground-ammo pickup. Recognizes "ammo_type" (which ammo type this
 * pickup provides) and "ammo<N>" (max amount of ammo type N it can
 * dispense). Other keys fall through with fHandled = 0 so the base
 * class (CBaseEntity::KeyValue) can try.
 *
 * @param this  The CTSGroundAmmo entity (implicit `this` in C++).
 * @param pkvd  The parsed keyvalue record from the engine.
 * @returns     void
 */

// NOTE: only fields actually touched by this function are typed.
// m_iAmmoType sits at +0xa8; m_rgAmmoMax is an int array at +0x68
// (scaled by ammoIndex*4 in the disassembly).
type CTSGroundAmmo = {
  m_iAmmoType: number;     // +0xa8 — which ammo this pickup provides
  m_rgAmmoMax: number[];   // +0x68 — max amount per ammo type, indexed
};

// NOTE: KeyValueData_s is a GoldSrc engine struct (engine/eiface.h).
// Only the fields this function reads/writes are typed here.
type KeyValueData_s = {
  szKeyName: string;       // +0x04
  szValue: string;         // +0x08
  fHandled: number;        // +0x0c (BOOL/int in C)
};

// NOTE: ammo info struct shape is unknown outside of this single
// field access. The disassembly reads an int at offset +0x10 and
// multiplies the parsed keyvalue by it; the semantic field name
// is TBD pending D.4 (ammo info table decompile).
type AmmoInfo = { readonly [offset: string]: unknown };
declare function getAmmoInfo(ammoIndex: number): AmmoInfo;

export function KeyValue(this: CTSGroundAmmo, pkvd: KeyValueData_s): void {
  // Case 1: full-key match against "ammo_type"
  // (PIC string at [ebx-0x6b6ec] in the .so).
  // strcmp → strtol(szValue) → store at this+0xa8, fHandled = 1.
  if (pkvd.szKeyName === "ammo_type") {
    this.m_iAmmoType = parseInt(pkvd.szValue, 10);
    pkvd.fHandled = 1;
    return;
  }

  // Case 2: 4-char prefix match against "ammo"
  // (strncmp with n=4, PIC string at [ebx-0x6b6cf] in the .so).
  // "ammo5" → ammoIndex = 5, etc.
  if (pkvd.szKeyName.startsWith("ammo")) {
    const ammoIndex = parseInt(pkvd.szKeyName.substring(4), 10);
    const info = getAmmoInfo(ammoIndex);
    // info+0x10 is an int used as a per-pickup scalar (name TBD).
    const perPickup = info["0x10"] as number;
    // Store (value × perPickup) at this+0x68 + ammoIndex*4.
    this.m_rgAmmoMax[ammoIndex] = parseInt(pkvd.szValue, 10) * perPickup;
    // TODO(asm-faithful): the disassembly does NOT set fHandled in
    // this branch — it stores the result at 0x927cd and jumps
    // straight to the epilogue. Mirroring original behavior;
    // strongly suspect this is an original TS bug (the engine
    // will re-dispatch the key to CBaseEntity::KeyValue). File
    // as a D.4 follow-up.
    return;
  }

  // Default: unrecognized key, hand off to base class.
  pkvd.fHandled = 0;
}
