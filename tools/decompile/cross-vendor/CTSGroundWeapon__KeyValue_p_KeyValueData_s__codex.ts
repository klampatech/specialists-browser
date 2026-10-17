Confirmed the five key strings against the binary. Now I can produce the decompiled TS.

Mapping from the disassembly:
- `[ebx-0x6b703]` = `"tsweaponid"` → `this+0xa4` (int)
- `[ebx-0x6b6ec]` = `"wduration"` → `this+0xa0` (int)
- `[ebx-0x6b6e2]` = `"wextraclip"` → `this+0xa8` (int)
- `[ebx-0x6b6d7]` = `"buyable"` → `this+0xb0` (byte, `setne` boolean)
- `[ebx-0x6eeee]` = `"attackerteam"` → `this+0xac` (int)

```typescript
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
 *   "buyable"      -> this.m_bBuyable       (byte,  +0xb0, boolean)
 *   "attackerteam" -> this.m_iAttackerTeam  (int,   +0xac)
 *
 * @param this  The CTSGroundWeapon entity instance
 * @param pkvd  The keyvalue pair from the BSP map
 */
export function KeyValue(this: CTSGroundWeapon, pkvd: KeyValueData_s): void {
  if (pkvd.szKeyName === "tsweaponid") {
    // Original: __strtol_internal(pkvd->szValue, NULL, 10, group=0)
    // (group=0 means no thousands-separator handling — glibc internal.)
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
    // Disassembly uses `test eax,eax; setne BYTE PTR [edi+0xb0]` —
    // any non-zero strtol result becomes 1, else 0. Stored as a byte.
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
```
