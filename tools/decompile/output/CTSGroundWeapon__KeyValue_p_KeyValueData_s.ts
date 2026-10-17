// Minimal type stubs (would normally live in the project's HLSDK
// type declarations — added here so the snippet compiles standalone).

/** HLSDK `extdll.h` — KeyValueData_s. */
interface KeyValueData_s {
  szKeyName: string;
  szValue: string;
  fHandled: number;
}

/**
 * Inferred field layout of CTSGroundWeapon, derived from the
 * disassembly of `KeyValue__15CTSGroundWeaponP14KeyValueData_s`.
 * Names use HLSDK Hungarian convention; will be verified against
 * the actual class header in D.4.
 */
class CTSGroundWeapon {
  m_iWDuration: number = 0;     // +0xa0 (int)
  m_iWeaponId: number = 0;      // +0xa4 (int)
  m_iExtraClip: number = 0;     // +0xa8 (int)
  m_iAttackerTeam: number = 0;  // +0xac (int)
  m_bBuyable: number = 0;       // +0xb0 (byte; 0 or 1)
}

/**
 * CTSGroundWeapon::KeyValue — handle entity key/value pairs set on a
 * CTSGroundWeapon by the level designer. Five CTS-specific keys are
 * recognized: their parsed integer (or boolean) values are stored in
 * the entity's instance fields and pkvd->fHandled is set to 1.
 * Unrecognized keys fall through with fHandled = 0 so the base class
 * (CTSWeapon / CBasePlayerWeapon / CBaseEntity) can try them.
 *
 * Recognized keys, in disassembly order:
 *   "tsweaponid"   -> this.m_iWeaponId      (int,   +0xa4)
 *   "wduration"    -> this.m_iWDuration     (int,   +0xa0)
 *   "wextraclip"   -> this.m_iExtraClip     (int,   +0xa8)
 *   "buyable"      -> this.m_bBuyable       (byte,  +0xb0, 0 or 1)
 *   "attackerteam" -> this.m_iAttackerTeam  (int,   +0xac)
 *
 * @param this  The CTSGroundWeapon entity instance
 * @param pkvd  The keyvalue pair from the BSP map
 */
export function KeyValue(this: CTSGroundWeapon, pkvd: KeyValueData_s): void {
  if (pkvd.szKeyName === "tsweaponid") {
    this.m_iWeaponId = parseInt(pkvd.szValue, 10);
    pkvd.fHandled = 1;
    return;
  }

  if (pkvd.szKeyName === "wduration") {
    this.m_iWDuration = parseInt(pkvd.szValue, 10);
    pkvd.fHandled = 1;
    return;
  }

  if (pkvd.szKeyName === "wextraclip") {
    this.m_iExtraClip = parseInt(pkvd.szValue, 10);
    pkvd.fHandled = 1;
    return;
  }

  if (pkvd.szKeyName === "buyable") {
    // Disassembly: strtol(...) → test eax,eax → setne BYTE PTR [edi+0xb0]
    // → 1 if non-zero strtol result, else 0.
    this.m_bBuyable = parseInt(pkvd.szValue, 10) !== 0 ? 1 : 0;
    pkvd.fHandled = 1;
    return;
  }

  if (pkvd.szKeyName === "attackerteam") {
    this.m_iAttackerTeam = parseInt(pkvd.szValue, 10);
    pkvd.fHandled = 1;
    return;
  }

  // No key matched — let the base class try.
  pkvd.fHandled = 0;
}
