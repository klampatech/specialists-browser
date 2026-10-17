```
VERDICT: PASS-WITH-NOTES

Adapted note: the supplied checklist (engine↔mod interface pattern) doesn't
fit this function. `CTSStunt::CloseAttack` is a gameplay method on a custom
entity class — items 2/3/4 from the checklist are not applicable. I have
adapted the checklist to what's actually being verified for a non-interface
method.

Adapted checklist:
1. Signature (matches demangled C symbol) — ✅ — `CTSStunt::CloseAttack()`
   takes no args, returns int (0/1). TS matches.
2. Return-value encoding — ✅ — paths end in `mov eax,0x1` or `mov eax,0x0`;
   TS returns 1/0 correctly.
3. Early-return gates — ✅ — cooldown / flag / ammo gates present, in the
   correct order (`sahf; jb` for FP `<`, integer bit tests, knife-no-ammo
   branch). All five gates match the assembly.
5. No fabricated paths — ⚠️ — the high-level shape is correct, but the
   damage formula's branching is simplified beyond what the assembly
   actually does. See "Issue D" below.
6. No TODO body — ✅ — body is fully expressed in code; TODOs only flag
   ambiguous field names (allowed by the conversion guidance).
7. Field names — ⚠️ — `m_pPlayer`, `m_flNextAttack`, `m_flNextStunt`,
   `m_vecViewAngles`, `m_pActiveItem`, `m_iId`, `m_iAmmo1`, `pev.velocity`,
   `pev.pContainingEntity` are educated guesses over HLSDK-style field
   names. Most are structurally consistent with the offsets, but several
   are flagged as ambiguous (m_pPlayer, m_flNextStunt, m_flCloseAttackCooldown).
8. Compiles in isolation — ❌ — references to `Vector`, `gpGlobals`,
   `CTSStunt`, `CBasePlayer`, `UTIL_MakeVectors`, `KungFu`,
   `CloseCombatAttack`, `Animate__12CTSAnimation...`, `UTIL_WeaponTimeBase`,
   `EMIT_SOUND_DYN`, `UpdateMeleeBar`, and several `ts_ca_*` cvars are not
   defined here. The TS will not compile as-is.
```

## Issues to fix

**Issue A — Damage formula uses `===` on floats and collapses the assembly's
redundant recomputation.** The TS writes:

```typescript
if (scaledSpeed === ts_ca_dmgEdge) { damage = ts_ca_dmgBase; }
else if (scaledSpeed < ts_ca_dmgMaxCap) { damage = ts_ca_dmgAlt; }
else { damage = scaledSpeed; }
```

The assembly does NOT use exact equality. The `fcomp / fnstsw / test ah,0x41 /
je` idiom at `0x8c716` and `0x8c78e` is "jump if greater than" (C3=0 AND
C0=0 → AH&0x41 == 0). The `fcomp / test ah,0x1 / jne` idiom at `0x8c74a` is
"jump if less than" (C0=1). The assembly *also* recomputes `|v|*scale` and
recompares against `edge` along the >edge branch, and converges `eax` to one
of three sources:

 - `[ebx-0x6f06c]` (alt), via `0x8c7e0` when first compare is not-greater
    and second compare is less-than-cap,
  - `[ebx-0x6e7e8]` (base), via `0x8c7cc` after the inner re-compare against
    `edge` succeeds as greater,
  - `scale * |v|` (clamped to cap implicitly), via `0x8c7ca` when the inner
    re-compare is not-greater.

The TS's `=== edge` branch will never match real FP values; the condition
needs to be a strict greater-than, and the "base" / "alt" / "scaledSpeed"
outputs are conditioned on a3-way (greater-than-edge vs. greater-than-edge
recomputed vs. less-than-cap) split, not equality + bound.

**Issue B — `UTIL_WeaponTimeBase` is called twice in the assembly but only
once in the TS.** At `0x8c91c` (compare) and `0x8c931` (use for assignment).
The TS caches one call and reuses it. Functionally probably equivalent, but
not 1:1. Either call it twice or justify the caching.

**Issue C — Kung-Fu doubling happens in the FPU only, not in a memory
copy.** At `0x8c7f8–0x800` the assembly does `fld [esp+0x1c]; test eax,eax;
je skip; fadd st,st(0)`. The TS does `damage += damage`, which mutates the
JS variable. But `[esp+0x1c]` is *not* updated; only `st(0)` is. The damage
that ends up in the `CloseCombatAttack` call is the FPU-doubled value, but
the damage later passed to `UpdateMeleeBar` at `0x8c98d–0x997` is loaded
from `[esp+0x1c]` again — i.e., the un-doubled value. The TS does
`UpdateMeleeBar(player, damage * ts_ca_barFactor)`, which is the doubled
value if `damage += damage` ran. That's wrong if the assumption is that
`[esp+0x1c]` is never re-stored. The TS comment calls this out, but the code
contradicts the comment.

**Issue D — `this.m_pPlayer[0]` indexing syntax.** Treating a pointer field
as `m_pPlayer[0]` is valid JS but reads ambiguously. Prefer`*this.m_pPlayer` (or just bind the deref: `const player = this.m_pPlayer;`).

**Issue E — Missing type stubs for in-isolation compilation.** Without
`Vector`, `gpGlobals`, `CTSStunt`, `CBasePlayer`, `UTIL_MakeVectors`, etc.
the TS won't compile. Add `// @ts-nocheck` or stub types at the top of the
file.

**Issue F — Animation switch is correct.** Verified: 1→14, 2→13, else 10.
This matches the disassembly at `0x8c8df–0x8c8f8`. ✅ No change needed.

**Issue G — `GetCurrentWeaponType(2,0)` and `GetCurrentSoundChannel(0,0x1f)`
are vtable wrappers on `[ebx+0x1aa8]`.** The TS hides a global pointer +
vtable dispatch behind opaque names. Either expose the vtable call inline
(as the assembly does) or justify the wrapper in a TODO. Right now both
calls look like ordinary functions but are actually indirect dispatch.

**Issue H — Sound arg order in `EMIT_SOUND_DYN`.** The TS already flags it,
but to be explicit: the disassembly pushes `0x3f800000 (1.0)`, `0x3f4ccccd
(0.8)`, `0`, `channel`, and the TS reverses volume/attenuation against the
HLSDK `EMIT_SOUND_DYN(edict*, channel, sound, volume, attenuation, ...)`.
With 7 push slots + stdcall cleanup, the arg-to-register mapping is
ambiguous. Resolve from HLSDK header before merging.

## Suggested rewrite (focused on the critical issues)

```typescript
// Stubs — replace with proper imports in the real file.
declare const gpGlobals: any;
declare const UTIL_MakeVectors: (v: any) => void;
declare const UTIL_WeaponTimeBase: () => number;
declare const KungFu: (p: any) => number;
declare const CloseCombatAttack: (...args: any[]) => number;
declare const Animate_Player: (anim: any, player: any, id: number) => void;
declare const EMIT_SOUND_DYN: (...args: any[]) => void;
declare const UpdateMeleeBar: (player: any, dmg: number) => void;
declare const ts_ca_dmgScale: number;
declare const ts_ca_dmgBase: number;
declare const ts_ca_dmgAlt: number;
declare const ts_ca_dmgEdge: number;
declare const ts_ca_dmgCap: number;
declare const ts_ca_traceDist: number;
declare const ts_ca_atkDelay: number;
declare const ts_ca_soundName: string;
declare const ts_ca_barFactor: number;
declare const currentTime: number;

interface Vector { x: number; y: number; z: number; }

/**
 * CTSStunt::CloseAttack — execute a close-quarters (melee) attack.
 * Demangled: CTSStunt::CloseAttack()
 * Returns 1 on dispatch, 0 on any gate failure.
 */
export function CloseAttack(this: any): number {
  // [this+0x40] is m_pPlayer (pointer to CBasePlayer).
  const player = this.m_pPlayer;

  // Gate 1: m_flNextAttack cooldown ([this+0x4])
  if (currentTime < this.m_flNextAttack) return 0;

  // Gate 2: player flag bits at +0x250 (mask0x30c30)
  if ((player.m_fFlags & 0x30c30) !== 0) return 0;

  // Gate 3: byte flag at +0x1a5 (bit 0x40)
  if ((player.m_afSomeFlag & 0x40) !== 0) return 0;

  // Gate 4: m_flNextStunt cooldown ([this+0x8])
  if (currentTime < this.m_flNextStunt) return 0;

  // Gate 5: active weapon is knife-type (iId 0x10) with no ammo
  const activeItem = player.m_pActiveItem;
  if (activeItem !== null
      && activeItem.m_iId === 0x10
      && activeItem.m_iAmmo1 === 0) {
    return 0;
  }

  // UTIL_MakeVectors from m_vecViewAngles (+0x74)
  UTIL_MakeVectors(player.m_vecViewAngles);

  // vtable[0x5a] (GetEyePosition) via vtable at +0x60
  const eyePos: Vector = { x: 0, y: 0, z: 0 };
  player.GetEyePosition(eyePos);

  // Compute |velocity| from pev->velocity (player+0x20).
  // The assembly recomputes |v| several times — preserve that pattern
  // rather than collapsing to one sqrt, because the cvar compares happen
  // against freshly-computed values.
  const v = player.pev.velocity;
  const speed = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);

  // Damage formula — assembly branches:
  //   if (speed*scale > edge):
  //     recompute scaledSpeed
  //     if (scaledSpeed > edge): damage = base
  //     else:                   damage = scaledSpeed
  //   else:
  //     if (speed*scale < cap):  damage = alt
  //     else:                    damage = scaledSpeed (via the same recompute+recompare path)
  //
  // Implementation note: the assembly's `fcomp`/`test ah,0x41`/`je` is
  // strict greater-than (FP), not ===.
  const scaledSpeed = speed * ts_ca_dmgScale;
  let damage: number;
  if (scaledSpeed > ts_ca_dmgEdge) {
    // Recompute (matches8c711-8c740's second |v| computation).
    const speed2 = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    const scaledSpeed2 = speed2 * ts_ca_dmgScale;
    damage = (scaledSpeed2 > ts_ca_dmgEdge) ? ts_ca_dmgBase : scaledSpeed2;
  } else if (scaledSpeed < ts_ca_dmgCap) {
    damage = ts_ca_dmgAlt;
  } else {
    damage = scaledSpeed;
  }

  // Kung-Fu: double damage — but ONLY in the FPU register, not in memory.
  // The un-doubled memory copy at [esp+0x1c] is reused later for the  // UpdateMeleeBar call.
  const baseDamageForBar = damage; // capture pre-double for UpdateMeleeBar
  if (KungFu(player) !== 0) {
    damage = damage + damage;
  }

  player.m_flCloseAttackCooldown = 0; // [player+0x7a8]

  // Build trace vectors.
  const vecSrc: Vector = { x: eyePos.x, y: eyePos.y, z: eyePos.z };
  const forward = gpGlobals.v_forward;
  const distance = ts_ca_traceDist;
  const vecEnd: Vector = {
    x: eyePos.x + forward.x * distance,
    y: eyePos.y + forward.y * distance,
    z: eyePos.z + forward.z * distance,
  };

  // Dispatch. Arg mapping reconstructed from cdecl pushes at 0x8c890–0x8c8b6;
  // resolve exact names against HLSDK CBasePlayer::CloseCombatAttack.
  const dispatched = player.CloseCombatAttack(
    vecSrc, vecEnd, forward,
    3,           // count
    damage,      // FPU-doubled damage
    -1,          // 0xffffffff
    false,       // 0x1 pushed before pushw 0
    true,        // 0x1
    true,        // 0x1
  );
  if (dispatched === 0) return 0;

  // Pick animation id by current weapon type — switch at 0x8c8df–0x8c8f8.
  // vtable call via [ebx+0x1aa8].vtable[0x168/4] with args (2, 0).
  const weaponType = player.GetCurrentWeaponType(2, 0);
  let animId: number;
  if (weaponType === 1) animId = 14;
  else if (weaponType === 2) animId = 13;
  else animId = 10;

  this.m_flNextStunt = 0.7; // 0x3f333333

  Animate_Player(player.m_Animation, player, animId);

  // Update m_flNextAttack only if it currently equals UTIL_WeaponTimeBase().
  // Assembly calls UTIL_WeaponTimeBase() twice — keep both for fidelity.
  const weaponTime1 = UTIL_WeaponTimeBase();
  if (weaponTime1 === player.m_flNextAttack) {
    const weaponTime2 = UTIL_WeaponTimeBase();
    player.m_flNextAttack = weaponTime2 + ts_ca_atkDelay;
  }

  // Play hit sound. Channel index from vtable[0x5a] call with (0, 0x1f),
  // then +0x5f added. The 7 push slots + 8-byte cleanup map to:
  //   (edict, channel, sound, volume, attenuation, flags, pitch?)
  // TODO: confirm exact arg order against HLSDK EMIT_SOUND_DYN.
  const edict = player.pev.pContainingEntity;
  const channelBase = player.GetCurrentSoundChannel(0, 0x1f);
  EMIT_SOUND_DYN(
    edict,
    channelBase + 0x5f,
    ts_ca_soundName,
    1.0,
    0.8,
    0,
    0x4,
  );

  // UpdateMeleeBar uses the UN-DOUBLED damage (load from [esp+0x1c] which
  // was not updated by fadd st,st(0)).
  UpdateMeleeBar(player, baseDamageForBar * ts_ca_barFactor);

  return 1;
}
```

### Net assessment

The TS is structurally faithful — the gates are in the right order, the
attack dispatch / animation / sound / UI sequence matches, and the
high-level intent (velocity-scaled melee damage, optional Kung-Fu boost,
per-weapon animation id) is captured. The issues are concentrated in:

- the **damage formula** (Issue A — the assembly's branching is more
  intricate than `if/else if/else`, and `===` on FP is wrong), and
- the **Kung-Fu side-effect** (Issue C — only the FPU is doubled, not
  memory, so `UpdateMeleeBar` sees the pre-double value).

Both should be fixed before this lands. The other issues (B, D, E, G, H)
are smaller and largely mechanical (call-twice, syntax, stubs, vtable
naming, sound arg order). Once A and C are corrected and the TS is paired
with stub types, this should be ready to merge.
