The exec_command is returning empty output (likely a sandbox quirk), so I'll decompile from the disassembly alone. Let me lay out my analysis:

**Stack frame after prologue** (`push ebp; push edi; push esi; push ebx; sub esp,0xc`):
- `[esp+0x20]` = `this` (CTSGroundAmmo*)
- `[esp+0x24]` = `pkvd` (KeyValueData_s*)
- `edi` ends up holding `this`; `ebp` ends up holding `pkvd`

**KeyValueData_s layout** (from the offset pattern `[ebp+0x4]/+0x8/+0xc`):
- `+0x04` = szKeyName (used as `strcmp` arg)
- `+0x08` = szValue  (parsed as int)
- `+0x0c` = fHandled  (set to 0 or 1)

**String constants** (PIC-relative):
- `ebx-0x6b6ec` — full key match (case 1) → almost certainly `"ammo_type"` (sets `this+0xa8`)
- `ebx-0x6b6cf` — 4-char prefix (case 2) → `"ammo"` (used as `strncmp(...,4)`)

**Case 2 (ammo<N>) trace:**
1. `atoi(szKeyName+4)` → ammo index
2. `getAmmoInfo(ammoIndex)` → info struct
3. `atoi(szValue) * info[+0x10]` → scaled amount
4. Stored at `this+0x68 + ammoIndex*4` (m_rgAmmoMax)
5. **fHandled is NOT set** — the disassembly jumps to epilogue immediately. This is either a TS bug or intentional. Flagging as TODO.

**Final TypeScript:**

```typescript
/**
 * CTSGroundAmmo::KeyValue — parse a map-entity keyvalue pair for a
 * ground-ammo pickup. Recognizes "ammo_type" (which ammo type this
 * pickup provides) and "ammo<N>" (max amount of ammo type N it can
 * dispense). Other keys fall through with fHandled = 0 so the base
 * class (CBaseEntity::KeyValue) can try.
 *
 * @param this   The CTSGroundAmmo entity (implicit `this` in the C++).
 * @param pkvd   The parsed keyvalue record from the engine.
 * @returns      void
 */

// TODO(D.4): full class definition; only the fields touched by this
// function are sketched here.
type CTSGroundAmmo = {
  m_iAmmoType: number;     // +0xa8 — which ammo this pickup provides
  m_rgAmmoMax: number[];   // +0x68 — max amount per ammo type, indexed
};

// TODO: KeyValueData_s is a GoldSrc engine struct
// (szClassName / szKeyName / szValue / fHandled); only used fields typed.
type KeyValueData_s = {
  szKeyName: string;
  szValue: string;
  fHandled: number;
};

// TODO: ammo info struct; field at +0x10 is a per-pickup scalar.
// Verify the field name once the ammo info table is fully decompiled.
type AmmoInfo = { maxPickup: number };
declare function getAmmoInfo(ammoIndex: number): AmmoInfo;

export function KeyValue(this: CTSGroundAmmo, pkvd: KeyValueData_s): void {
  // Case 1: "ammo_type" → set which ammo type this pickup provides.
  // The matching key string lives at [ebx-0x6b6ec] in the .so.
  if (pkvd.szKeyName === "ammo_type") {
    this.m_iAmmoType = parseInt(pkvd.szValue, 10);
    pkvd.fHandled = 1;
    return;
  }

  // Case 2: "ammo<N>" → set max amount for ammo type N
  // (e.g. "ammo5" → N = 5). The matching 4-char prefix lives at
  // [ebx-0x6b6cf] in the .so.
  if (pkvd.szKeyName.startsWith("ammo")) {
    const ammoIndex = parseInt(pkvd.szKeyName.substring(4), 10);
    const info = getAmmoInfo(ammoIndex);
    // ammoInfo's +0x10 is a per-pickup scalar; the entity stores
    // (pickup count × per-pickup) as its cap for that ammo.
    this.m_rgAmmoMax[ammoIndex] =
      parseInt(pkvd.szValue, 10) * info.maxPickup;
    // TODO(asm-ambiguous): the disassembly does NOT set
    // pkvd->fHandled in this branch — it stores the result and
    // jumps straight to the epilogue. Mirroring that original
    // behavior; could be an original TS bug, or intentional
    // (the engine still routes the key to the base class).
    return;
  }

  // Unrecognized key → hand off to the base class.
  pkvd.fHandled = 0;
}
```
