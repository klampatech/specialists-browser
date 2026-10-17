```typescript
/**
 * CTSRifleAmmo::Spawn — initialize the rifle-ammo pickup entity.
 *
 * Delegates to the parent CTSGroundAmmo::Spawn for shared
 * ground-ammo setup, then sets the per-bucket give-amount fields
 * to half of each ammo bucket's max carry capacity (ammo buckets
 * 6 and 4).
 *
 * @param this  The CTSRifleAmmo entity instance
 * @returns     void
 */
export function Spawn(this: CTSRifleAmmo): void {
  // Base class does shared ground-ammo setup (model, BVs, sounds, ...).
  // TODO(decompile): CTSGroundAmmo.Spawn is declared in the parent
  //   class decomp — kept as `any` here until that file is generated.
  (CTSGroundAmmo as any).Spawn.call(this);

  // The "give amount" per ammo bucket is half of that bucket's max
  // carry capacity. MSVC emits ((x>>31) + x) >> 1 — a signed
  // div-by-2 with truncation toward zero, which matches
  // Math.trunc(x / 2) in TS. The ammo_info struct exposes the
  // max-carry dword at offset 0xc (see fields read at +0xc in the
  // disassembly).
  // TODO(asm-ambiguous): confirm which TS ammo-enum values 4 and 6
  //   correspond to (likely AMMO_RIFLE and a secondary bucket), and
  //   name the fields stored at this+0x78 (bucket 4) and this+0x80
  //   (bucket 6) once the CTSRifleAmmo layout is known.

  // Ammo bucket 6 -> this+0x80
  const ammo6 = (getAmmoInfo as any)(6);
  (this as any).m_iGiveAmount6 = Math.trunc(ammo6.maxCarry / 2);

  // Ammo bucket 4 -> this+0x78
  const ammo4 = (getAmmoInfo as any)(4);
  (this as any).m_iGiveAmount4 = Math.trunc(ammo4.maxCarry / 2);
}
```
