/**
 * CTSGun::VKickback — applies weapon kickback (recoil) to the
 * gun's owner.
 *
 * Picks a per-weapon kickback cvar based on `weaponMode`,
 * scales it by `baseAmount` (and optionally by an "alt mode"
 * cvar and a "double fire rate" cvar), then mutates two
 * adjacent floats on the owning player's state (offsets
 * 0x68 / 0x6c, likely velocity or view-angle components) when
 * a flag byte (offset 0x1a5, mask 0x20) is set.
 *
 * NOTE: the demangled symbol lists five explicit args (and a
 * `?` suffix). The asm body references only `this` plus the
 * first three — the two trailing float args are dropped on
 * the floor by this method, not by us. (TODO(D.4): confirm
 * via caller-side audit whether the trailing args are ever
 * forwarded to anything.)
 *
 * @param this         The CTSGun instance that fired.
 * @param baseAmount   Base scalar / direction value (float).
 * @param weaponMode   Weapon mode index (int). Switches over
 *                     {1, 4, 5, 6, 7, 8, 9}; anything else
 *                     falls back to a default kickback cvar.
 * @param altModeFlag  Boolean. When truthy, multiplies both
 *                     kickback values by an "alt mode" cvar.
 * @returns            void
 */
// TODO(D.4): replace `any` annotations with `CTSGun`,
//             `CBasePlayer`, `entvars_t`, and named cvar
//             references once the class is reconstructed.
//             Resolve KICKBACK_*_CVAR names from
//             tools/decompile/analysis/strings-n5.txt.

// Cvar placeholders. Real values live in the .data section at
// the GOT-relative offsets in the asm. Typed as `any` so this
// compiles in isolation; resolve in D.4.
const KICKBACK_BASE_CVAR:         any = undefined; // [ebx-0x6df08]
const KICKBACK_MODE_8_CVAR:       any = undefined; // [ebx-0x6df04]
const KICKBACK_MODE_4_5_CVAR:     any = undefined; // [ebx-0x6df00]
const KICKBACK_MODE_1_CVAR:       any = undefined; // [ebx-0x6defc]
const KICKBACK_MODE_6_7_CVAR:     any = undefined; // [ebx-0x6def8]
const KICKBACK_MODE_9_CVAR:       any = undefined; // [ebx-0x6def4]
const KICKBACK_DEFAULT_CVAR:      any = undefined; // [ebx-0x6f408]
const KICKBACK_ALT_MODE_CVAR:     any = undefined; // [ebx-0x6df0c]
const KICKBACK_DOUBLE_FIRE_CVAR:  any = undefined; // [ebx-0x6def0]

// External: defined in tools/decompile/chunks/... in D.4.
// Signature matches the @plt call site (cdecl, returns int).
declare function DoubleFireRate(p: any): number;

export function VKickback(
  this: any,
  baseAmount: number,
  weaponMode: number,
  altModeFlag: boolean
): void {
  // -- Step 1: baseValue = baseCvar * baseAmount.
  //     [esp+0xc] in the asm frame.
  let baseValue = KICKBACK_BASE_CVAR * baseAmount;

  // -- Step 2: perWeaponValue.
  //     The asm keeps the partial product of step 1 on the FPU
  //     stack and either multiplies it by a mode-specific cvar,
  //     or (default case) discards it via `fstp st(0)` and loads
  //     the default cvar directly — i.e. perWeaponValue is
  //     NOT multiplied by baseAmount in the default branch.
  //     [esp+0x10] in the asm frame.
  let perWeaponValue: number;
  switch (weaponMode) {
    case 8:
      perWeaponValue = baseValue * KICKBACK_MODE_8_CVAR;
      break;
    case 4:                                            // fallthrough
    case 5:
      perWeaponValue = baseValue * KICKBACK_MODE_4_5_CVAR;
      break;
    case 1:
      perWeaponValue = baseValue * KICKBACK_MODE_1_CVAR;
      break;
    case 6:                                            // fallthrough
    case 7:
      perWeaponValue = baseValue * KICKBACK_MODE_6_7_CVAR;
      break;
    case 9:
      perWeaponValue = baseValue * KICKBACK_MODE_9_CVAR;
      break;
    default:
      perWeaponValue = KICKBACK_DEFAULT_CVAR;
      break;
  }

  // -- Step 3: alt-mode boost. Multiplies BOTH values by the
  //     alt-mode cvar. Asm pattern is `fld X; fld baseValue;
  //     fmul st,st(1); fstp baseValue; fmul [esp+0x10];
  //     fstp [esp+0x10]` — same cvar X used twice.
  if (altModeFlag) {
    baseValue      *= KICKBACK_ALT_MODE_CVAR;
    perWeaponValue *= KICKBACK_ALT_MODE_CVAR;
  }

  // -- Step 4: DoubleFireRate owner-side scaling.
  //     [esi+0x80] is asserted to be `m_pPlayer` per HLDSDK
  //     CBasePlayerItem layout (TODO(D.4): verify offset).
  //     `test eax,eax; je` in the asm corresponds to !== 0.
  const owner: any = (this as any).m_pPlayer;          // [esi+0x80]
  if (DoubleFireRate(owner) !== 0) {
    baseValue      *= KICKBACK_DOUBLE_FIRE_CVAR;
    perWeaponValue *= KICKBACK_DOUBLE_FIRE_CVAR;
  }

  // -- Step 5: conditional apply to the player state.
  //     The asm does TWO dereferences of `[esi+0x80]`:
  //         mov eax, [esi+0x80]   ; eax = owner (CBasePlayer*)
  //         mov eax, [eax]        ; eax = *owner  ← second deref
  //     and then reads offsets 0x1a5 / 0x68 / 0x6c from eax.
  //     The original TS comment said "implicit double-deref"
  //     but no code did it — that was a bug. Reflect it
  //     literally here so the offsets apply to the right object.
  //
  // TODO(asm-ambiguous): whether the literal `*owner` (which
  //     in HLDSK lands on CBasePlayer's vtable ptr at offset 0)
  //     is the intended target, or whether `[esi+0x80]` is
  //     actually `pev` / some other pointer field, is open.
  //     Resolve in D.4 via cross-reference with CBasePlayer's
  //     layout in this exact build.
  const playerState: any = owner && (owner as any)[0]; // double-deref
  if (((playerState as any)[0x1a5] /* flag byte */ & 0x20) !== 0) {
    (playerState as any)[0x68] -= baseValue;
    (playerState as any)[0x6c] += perWeaponValue;
  }
}
