```
VERDICT: PASS-WITH-NOTES

Important framing note: This function (`CTSWorldGun::Fall`) is a
gameplay method, not one of the four engine↔mod interface entry
points covered by the HLSDK reference (`GiveFnptrsToDll`,
`GetEntityAPI`, `GetEntityAPI2`, `GetNewDLLFunctions`). HLSDK
doesn't define `CTSWorldGun::Fall` — it's TS-specific mod code, so
checklist 1–4 don't apply in their reference-implementation sense.
I'm adapting them: signature is checked against the demangled
symbol, and items 2–4 are marked N/A.

Checklist:
1. Signature — ✅ — TS `Fall(this: CTSWorldGun): void` matches the
   demangled `Fall__11CTSWorldGun` (no args, void return). The
   caller-pushed `this` at `[esp+0xa0]` after the prologue is
   consistent with i386 `-fno-this-is-ecx` thiscall, which the
   code captures as the `this` parameter.
2. Version check — N/A — not an interface function.
3. interfaceVersion assignment-back — N/A — not an interface
   function.
4. Success path / struct copy — N/A — not an interface function.
5. No fabricated paths — ⚠️ — All 8 control-flow branches from   the disassembly are preserved (flag-0x1a5 test, fcompp speed
   threshold, fcomp slowmo expiry, fcomp flFraction, pHit-vs-
   engine-lookup, take-damage check, damage-threshold fcomp,
   fall-through to WaitThink). **But** the TS uses
   `this.parent.WAITThink()` to model the `CTSPhysicObject::
   WaitThink(this)` call — `parent` is not a TS member, this is
   invalid TypeScript syntax. It's also used three times when the
   disassembly has the same PLT call three times.
6. No TODO body — ✅ — The body has substantial real code for
   every branch. TODO comments mark genuinely ambiguous parts
   (field offsets, cvar identities, vtable methods), which is
   the right discipline.
7. Field names — ⚠️ — Honest `field0xNN` placeholders are used
   for most unknowns (good). But several interpretive names are
   weakly justified or wrong:
     • `byte0x1a5` labeled "bounce flag" — plausible but
       unverified; no string/symbol evidence cited.
     • `[edx+0x50]`, `[edx+0x58]` cleared on bounce, with a
       comment saying "in HL1 SDK these map to vecAngles
       pitch/yaw" — this is wrong. In this build (where
       velocity is at +0x20, origin at +0x08, no `globalname`),
       the layout is origin@0x08, oldorigin@0x14, velocity@0x20,
       basevelocity@0x2c, punchangle@0x38, angles@0x44,
       avelocity@0x50. So +0x50 is `avelocity.x` and +0x58 is
       `avelocity.z` (with `.y` at +0x54 left untouched). The
       "stop spin on bounce" semantics make sense for avelocity,
       not angles. The comment is misleading.
     • `[ebp+0xc4]` labeled `m_flSlowmoTimer` — plausible given it's compared to `gpGlobals->flTime`, but it's a guess.
     • `[ebp+0x88]` labeled `m_iWeaponType` — plausible given
       it's passed to `get_weapon_info(tsweapon_t)`, but the
       `tsweapon_t` arg type isn't verified.
     • `[edx+0x208]` labeled `pEdictField` — that's a pointer       passed to `EMIT_SOUND_DYN` as the edict; in HLSDK this
       would be `ent->edict()` derived from the engine side, not
       an entvars field. The name is fine as a placeholder.
   None of these need to be deleted, but the "bounce flag" and
   "vecAngles pitch/yaw" comments should be corrected/hedged.
8. Compiles in isolation — ❌ — The function references   `CTSWorldGun`, `CBaseEntity`, `pev.velocity.x` (typed `Vector`
   access), `gpGlobals`, `sv_gravity`, `tsBounceScale`,
   `tsSndVolume`, `tsSndAtten`, `tsSndFlags`, `tsTraceScale`,
   `tsDmgScale`, `EMIT_SOUND_DYN`, `RemoveEntityFromSlowedArray`,
   `UTIL_Remove`, `UTIL_TraceLine`, `engfuncLookup`,
   `get_weapon_info`, `ClearMultiDamage`, `ApplyMultiDamage`,
   `VectorAdd`, `VectorScale`, `IGNORE_MONSTERS`, `DMG_NERVEGAS`,
   `DMG_ACID`, `parent` — none defined locally. To pass this
   check, all external types should be `any` or stubbed.

Issues to fix:
- EMIT_SOUND_DYN call: 8 pushes in the disassembly vs. 7-arg
  HLSDK signature. The TS uses7 args with literals in the
  wrong positions (see detailed breakdown below).
- `this.parent.WAITThink()` is not valid TS — `parent` isn't a
  member, and TS has no implicit parent-method-call operator.
  Either inline a `// CTSPhysicObject::WaitThink(this)` comment
  and call the imported `WaitThink_Physic` function directly,
  or expose a `super_WaitThink()` helper.
- Field name "vecAngles pitch/yaw" for +0x50/+0x58 is wrong;
  should be `avelocity.x` / `avelocity.z` (and acknowledge
  `.y` at +0x54 is intentionally untouched).
- Doesn't compile in isolation.
- The gravity-accumulation line `pev.flFallVelocity = pev.flFallVelocity +
  sv_gravity.value` is structurally right, but the QWORD load
  at `[ebx-0x6ecd8]` is unusual (loading8 bytes from a global,
  then storing as a DWORD). Worth a `// TODO(asm-ambiguous)` on
  that line — the original may be a precision-promoted
  double-precision const + DWORD add, not a straight increment.

EMIT_SOUND_DYN argument-by-argument review

The disassembly pushes, in execution order (last push = first arg):

| # | Push | Maps to (arg position from left) | What it is |
|---|---|---|---|
| 1 | `[ebx-0x6ec2c]` | 8th arg (extra cvar) | unknown — TODO |
| 2 | `0x64` (100) | 7th arg | pitch = 100 |
| 3 | `0x0` | 6th arg | fFlags = 0 |
| 4 | `[ebx-0x6e7e4]` | 5th arg | attn cvar |
| 5 | `[ebx-0x6f3fc]` | 4th arg | volume cvar |
| 6 | `eax` (string) | 3rd arg | sample |
| 7 | `0x6` | 2nd arg | channel |
| 8 | `[edx+0x208]` | 1st arg | entity |

The TS maps literals to wrong positions: it has `100` as the 5th
arg (pitch slot in the TS's positional order) instead of 7th,
and `0` is dropped. The `[ebx-0x6ec2c]` push is unaccounted
for. The 8 pushes also imply the TS-mod `EMIT_SOUND_DYN` either
has an8-arg signature or is called via a wrapper that consumes
one push differently; this should be a `TODO(asm-ambiguous)`,
not a confident7-arg call.
```

Suggested rewrite (full TS function):

```typescript
/**
 * CTSWorldGun::Fall — per-physics-tick update for a thrown world gun.
 *
 * Accumulates gravity into the fall-velocity tracker, plays a bounce SFX
 * and grounds the entity when its current speed stays below a per-gun
 * threshold, expires the gun if its slow-motion timer has run out,
 * traces ahead in the velocity direction to detect entity impacts,
 * applies weapon damage scaled by impact speed when an entity is hit,
 * then defers to CTSPhysicObject::WaitThink for pickup/respawn work.
 *
 * NOTE: All external types and globals are typed `any` so this
 * function compiles in isolation. Field names flagged * `// TODO(asm-ambiguous)` are interpretive — see the comments
 * for the disassembly evidence and uncertainty.
 */
export function Fall(this: any): void {
  const pev: any = this.pev;

  // ---- 1. Accumulate gravity into pev->flFallVelocity. ----
  // Disassembly: fld QWORD [ebx-0x6ecd8]; fadd DWORD [eax];
  //              fstp DWORD [edx+0x104].
  // The QWORD load from a global is unusual — may be a double-precision
  // const + DWORD add rather than a plain increment. Interpreted as
  // the standard HL1 gravity accumulator pending D.7 cvar-id work.
  // TODO(asm-ambiguous): confirm [ebx-0x6ecd8] identity (sv_gravity
  //                      loaded as double?) and double-deref target.
  pev.flFallVelocity = pev.flFallVelocity + sv_gravity.value;

  // ---- 2. Bounce: only when the flag byte at +0x1a5 bit 0x2 is set. ----
  // TODO(asm-ambiguous): byte0x1a5 is read with mask 0x2 — its identity
  //                      (a custom TS field, an iuser3 bitfield, etc.)
  //                      is not confirmed. "Bounce flag" is interpretive.
  if ((pev.byte0x1a5 & 0x2) !== 0) {
    const speed = Math.sqrt(
      pev.velocity.x * pev.velocity.x +
      pev.velocity.y * pev.velocity.y +
      pev.velocity.z * pev.velocity.z,
    );
    // Bounce threshold = vtable method * cvar. The method at    // [this+0x60]+0x10 is unknown; it returns a per-gun scalar    // (perhaps a "bounce dampening" or "settle speed" baseline).
    // TODO(asm-ambiguous): [this+0x60] is a vtable-like table;
    //                      [this+0x60]+0x10 is the call target.
    // TODO(asm-ambiguous): identify the cvar at [ebx-0x6de98].
    const bounceThreshold = this.fnTable0x60.method_0x10() * tsBounceScale.value;
    if (speed < bounceThreshold) {
      // EMIT_SOUND_DYN call — disassembly has 8 pushes, but the
      // HLSDK signature is 7 args. Mapping below uses the HLSDK
      // 7-arg shape; the 8th push ([ebx-0x6ec2c], a cvar) is
      // unaccounted for and flagged.
      // TODO(asm-ambiguous): 8 pushes vs HLSDK 7-arg signature.
      //                      Either TS adds an 8th arg or a wrapper
      //                      consumes one push differently.
      // TODO(asm-ambiguous): identify cvars at [ebx-0x6f3fc]
      //                      (volume), [ebx-0x6e7e4] (attenuation),
      //                      [ebx-0x6ec2c] (extra).
      EMIT_SOUND_DYN(
        pev.pEdictField,                 // arg1: entity (+0x208)
        6,                               // arg2: channel
        "weapons/gun_bounce.wav",        // arg3: sample
        tsSndVolume.value,               // arg4: volume cvar ([ebx-0x6f3fc])
        tsSndAtten.value,                // arg5: attenuation cvar ([ebx-0x6e7e4])
        0,                               // arg6: fFlags = 0
100,                             // arg7: pitch = 100
        // arg8: extra cvar ([ebx-0x6ec2c]) — see TODO above
      );
      // Clear two of the three avelocity floats to stop spin on bounce.
      // In this build (velocity@0x20, no globalname): avelocity is at
      // +0x50 (x, y, z). Writes are +0x50 (x) and +0x58 (z); +0x54
      // (y) is deliberately left intact.
      pev.avelocity_x = 0; // +0x50
      pev.avelocity_z = 0;   // +0x58 (note: NOT +0x54 = avelocity.y)
      this.OnGround();
    }
  }

  // ---- 3. Slow-motion expiration. ----
  // fcomp [gpGlobals->flTime]; jae skip — compares this->+0xc4 to flTime.
  // TODO(asm-ambiguous): identify +0xc4 (likely m_flSlowmoTimer, but
  //                      unverified).
  if (this.m_flSlowmoTimer < gpGlobals.flTime) {
    RemoveEntityFromSlowedArray(this);
    UTIL_Remove(this);
    WaitThink_PhysicObject(this);  // CTSPhysicObject::WaitThink(this)
    return;
  }

  // ---- 4. Trace ahead along the velocity vector to detect impacts. ----
  // TODO(asm-ambiguous): identify the cvar at [ebx-0x6f078] (the
  //                      velocity scale used for the trace endpoint).
  const tr: any = UTIL_TraceLine(
    pev.origin,
    VectorAdd(pev.origin, VectorScale(pev.velocity, tsTraceScale.value)),
    IGNORE_MONSTERS,
    pev.pEdictField,
  );
  // fcomp 1.0; jae skip — if the trace completed (flFraction >= 1.0),
  // there was no hit; jump to WaitThink.
  if (tr.flFraction >= 1.0) {
    WaitThink_PhysicObject(this);
    return;
  }

  // ---- 5. Resolve the hit entity. ----
  // Prefer tr.pHit (offset into TraceResult). If null, fall back to
  // an engine lookup at engfuncs+0x114 (probably ENT_FROM_INDEX or
  // similar) with arg 0, then unwrap via [resolved+0x7c].
  // TODO(asm-ambiguous): identify [ebx+0x1aa8] (engfuncs ptr?) and
  //                      the function at +0x114.
  let hitEntity: any = tr.pHit;
  if (hitEntity === null) {
    const resolved = engfuncLookup(0);
    if (resolved !== null) {
      // TODO(asm-ambiguous): [resolved+0x7c] — possibly the
      //                      CBaseEntity* field of an edict wrapper.
      hitEntity = resolved.field0x7c;
    }
  }
  if (hitEntity === null) {
    WaitThink_PhysicObject(this);
    return;
  }

  // Take-damage check at [hitEntity+0x60]+0xc8 — if non-zero, the
  // victim is in a state where it refuses damage.
  if (hitEntity.fnTable0x60.method_0xc8() !== 0) {
    WaitThink_PhysicObject(this);
    return;
  }

  // ---- 6. Compute impact damage = speed × weapon damage byte × cvar. ----
  // get_weapon_info(this->+0x88) returns a struct with damage byte at +0xd0.
  // TODO(asm-ambiguous): identify +0x88 (likely m_iWeaponType, but the
  //                      tsweapon_t arg type for get_weapon_info is unverified).
  const wpnInfo: any = get_weapon_info(this.m_iWeaponType);
  const dmgByte: number = wpnInfo.damageByte0xd0;
  const impactSpeed = Math.sqrt(
    pev.velocity.x * pev.velocity.x +
    pev.velocity.y * pev.velocity.y +
    pev.velocity.z * pev.velocity.z,
  );
  const damage = impactSpeed * dmgByte * tsDmgScale.value;

  // Threshold guard: if damage < [hitEntity->pev+0x160], skip.
  // TODO(asm-ambiguous): meaning of [hitEntity->pev+0x160] — could be
  //                      a per-victim armor value, a damage cap, etc.
  if (damage < hitEntity.pev.field0x160) {
    WaitThink_PhysicObject(this);
    return;
  }

  // ---- 7. Apply damage to the hit entity. ----
  ClearMultiDamage();
  // Position struct (es1 = velocity copy, 12 bytes) and damage-ptr
  // arg (eax = &[stack+0x3c], points to a caller-supplied struct)
  // both pushed; TS collapses them as positional args.
  // TODO(asm-ambiguous): the 5th arg (eax) is a pointer into the
  //                      caller's stack — its identity is unclear.
  hitEntity.method_0x54( // CBaseEntity::TakeDamage (vtable +0x54)
    pev,                                  // arg1: inflictor
    damage,                               // arg2: damage (float)
    VectorScale(pev.velocity, 1.0),       // arg3: direction (esi = velocity copy)
    damagePosStruct,                      // arg4: position ptr (eax)
0x1080,                               // arg5: dmg bits (DMG_NERVEGAS | DMG_ACID)
  );
  ApplyMultiDamage(pev, pev);             // (pevInflictor = pevAttacker = self)

  // ---- 8. Defer to base-class WaitThink for pickup/respawn. ----
  WaitThink_PhysicObject(this);  // CTSPhysicObject::WaitThink(this), via PLT
}

// ---- External symbol stubs (to be removed in D.5 wiring) ----
//
// In a real build these come from engine + TS-mod bindings.
// `any`-typed so the function compiles in isolation per checklist #8.
declare const sv_gravity: any;
declare const gpGlobals: any;
declare const tsBounceScale: any;
declare const tsSndVolume: any;
declare const tsSndAtten: any;
declare const tsTraceScale: any;
declare const tsDmgScale: any;
declare const IGNORE_MONSTERS: any;
declare const damagePosStruct: any;

declare function EMIT_SOUND_DYN(
  ent: any, channel: number, sample: string,
  volume: number, attn: number, fFlags: number, pitch: number,
  extra?: any,  // see TODO above — disassembly has 8 pushes
): void;
declare function RemoveEntityFromSlowedArray(e: any): void;
declare function UTIL_Remove(e: any): void;
declare function UTIL_TraceLine(
  start: any, end: any, igmon: any, ent: any,
): any;
declare function engfuncLookup(arg: any): any;
declare function get_weapon_info(t: any): any;
declare function ClearMultiDamage(): void;
declare function ApplyMultiDamage(inflictor: any, attacker: any): void;
declare function VectorAdd(a: any, b: any): any;
declare function VectorScale(v: any, s: number): any;
declare function WaitThink_PhysicObject(e: any): void;
```
