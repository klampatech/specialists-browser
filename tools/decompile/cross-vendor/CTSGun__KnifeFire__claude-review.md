```
VERDICT: FAIL

Checklist:
1. Signature — ✅ — `KnifeFire(this: CTSGun): void` matches
   the demangled `KnifeFire__6CTSGun` (no args). Return type
   is void (function ends in `ret`, no value computed).
2. Version check — N/A — not an engine interface function.
3. interfaceVersion — N/A — not an engine interface function.
4. Control flow / success path — ⚠️ — High-level shape is
   correct (early-return on null knife → throw/melee fork →
   post-fire bookkeeping → optional DropWeapon). Both
   branches terminate with `jmp 748f4` and that is honoured.
   Several slots inside the path are placeholders, so the
   actual call graph isn't wired up.
5. No fabricated paths — ❌ — Two real fabrications:
   a. The throw-branch Animate gate reintroduces `!fSlowMo`
      (74080-740ad is the slowmo check used only for the
      time/damage scaling at the top of the function). The
      disassembly's 7486d-748a9 gate is `flSlowMo`-free.
   b. The animate gate reads `(pev.flags & 0x200)`. The
      disassembly's 74881 reads
      `BYTE PTR [eax+0x1a5], 0x2` — a different field
      entirely (`m_pPlayer + 0x1a5`, not `pev->flags`),
      and a different mask (0x2 vs 0x200). They have been
      conflated into `pev.flags & 0x200`.
   c. The fumble-pose decision uses the persistent counter
      `!knife.m_iHit` where the disassembly uses a per-attack
      `edi` (engagement) flag that is reset to 0 only on the
      dead/disabled paths (742ee/742fd). If TakeDamage lands
      but ApplyTraceBleed returns 0, codex will fumble even
      though the disassembly skips fumble because `edi != 0`.
6. No TODO body — ❌ — Several outright stubs that prevent
   the function from compiling or running:
   a. `(50.0, 0.0, -50.0)` — Python tuple literal in a TS
      position; not valid syntax.
   b. `EMIT_SOUND_DYN(... /* filename */ /* ebx-0x6dc7e */,
      ...)` — two adjacent empty comments leave an argument
      slot empty; that's a too-few-args call. Same issue
      twice (throw + melee sound).
   c. `ENGINE.MESSAGE_BEGIN(/* MSG_ONE */, /* SVC_WEAPONANIM */,
      /* origin */, /* dest = player.edict */)` — all four
      arguments are empty placeholders.
   d. `const aimStart = /* eyepoint */;` — undefined
      identifier; will not compile.
   e. `const dir = /* assembled throw-dir */;` — undefined.
   f. `dart.pev.angles = /* VecToAngles result */;` — `UTIL_
      VecToAngles` writes through a reference, not via return;
      needs an output Vector declared and passed in.
   g. `dart.pev.angularVelocity = (50.0, 0.0, -50.0);` —
      tuple + decimal-bytes 0x42b40000/0xc4a28000 in a field
      assignment that wants three `number`s.
   h. `this.Recoil(/* m_iHSecondary=0, m_hSecondaryAnim /* ,
      etc */)` — multi-line comment leaves the entire call
      body empty.
   i. `player.m_iAmmoKnife += /* low byte of wepInfo+0xd0
      */ 0;` — adds 0; silently elides the ammo bonus.
   j. `this.m_flNextPrimaryAttack = UTIL_WeaponTimeBase() +
      /* qword at [ebx-0x6de50] */;` — second operand empty.
7. Field names — ⚠️ — Class-side names (m_pPlayer / m_pKnife /
   m_pWeaponInfo / m_flNextPrimaryAttack / m_iClip / m_iHits /
   m_pAnimation) are consistent with sibling CTSGun
   decompilations in `cross-vendor/`. Two field maps are
   wrong (item 5b above, plus the read at +0x1a5 being
   tagged as `pev.flags` instead of a CBasePlayer member).
   The +0x972 / +0x976 LOWORD reads are right.
8. Compiles in isolation — ❌ — Six or more blocking errors
   listed under item 6. Won't run past the typechecker.

Issues to fix:
- Drop the tuple `(a, b, c)` in favour of `[a, b, c]` (or a
  Vector literal). The 0x42b40000 / 0xc4a28000 angularVelocity
  comes through as `50.0` and `-50.0`.
- Replace every `/* ebx-N */` placeholder with the actual
  operand. The four recurring cvar offsets map to the
  slow-motion cvars (slowamt = firetime scale, ts_slowmotion =
  next-attack addend, ts_slowmotion_dmg = damage scale,
  ts_idle = fumble window). The two filename pointers resolve
  to the knife throw.wav and knife hit.wav strings (the audit
  looked those up — they're in the data table; resolve before
  coding). The KNIFE_SPEED and the 0x6f018 const (fraction
  =1.0) and the 0x6de50 / 0x6e768 followup-attack addends
  need literals, not comments.
- Replace the placeholder `MESSAGE_BEGIN` body with the real
  HL push sequence from 74449-74491: MSG_ONE=1, msg_id
  =SVC_WEAPONANIM, origin={gpGlobals.v_forward based vec};
  dest=player.edict; then WRITE_BYTE(knife.m_iHit);
  WRITE_SHORT(this.m_iHits); MESSAGE_END.
- Replace `RANDOM_LONG(0,31)+95` with the actual call: the
  disassembly calls `[ebx+0x1aa8]+0x168` with `push 0,
  push 0x1f, push eax(=gpGlobals)`, returns `eax`. That's
  the engine's RANDOM_LONG helper; treat as a function call
  with args `(0, 0x1f)` and add the sequence-base offset
  inline. Same for the hit-sound 95+0x5f offset.
- Fix the throw-branch Animate gate:
  ```typescript
  if (   (player + 0x250) /* DWORD test */ (0x30c30) === 0
      && (player + 0x1a5) /* BYTE test */ (0x2)         !== 0)
    this.m_pAnimation.Animate(player, 32); // THROW seq
  ```
  No `!fSlowMo` here — that gate does not exist in this
  position in the disassembly.
- Fix the melee-branch Animate gate same way (no `!fSlowMo`,
  distinct +0x250 / +0x1a5 reads).
- Replace `if (!knife.m_iHit) { fumble }` with `if (!engaged)
  { fumble }`, where `engaged` is set inside the victim's
  IsAlive+!Parry block the moment the damage call is made,
  independent of ApplyTraceBleed's return. Mirror the
  disassembly's `edi` flow exactly.
- Replace `player.m_iAmmoKnife += 0` with `player.m_iAmmoKnife
  += wepInfo + 0xd0 (low byte)` — that's the disassembly's
  `movzx eax, [eax+0xd0]; add [edx+0x548], eax`. The reader
  needs the right field of the weapon info struct, not a 0.
- Use `[g_x, g_y, g_z]` or a `Vector` literal for
  dart.pev.angularVelocity, and pass an out-parameter to
  UTIL_VecToAngles (its first arg is `const Vector&`,
  returns angles via reference).
- The hit-vector assembly at 74338-7434f copies three
  `gpGlobals->v_forward` floats into a local Vector that is
  then passed as the `vecDir` argument to TakeDamage.
  Show that explicitly: build `aimLocal = [v_forward.x,
  v_forward.y, v_forward.z]`, pass to TakeDamage as
  `attackDir`.
- The hit-flag updates at 743a5-743b5 set both `knife->m_iHit`
  and `this->m_iHits`. Don't conflate them — the disassembly
  writes both.

Suggested rewrite (replacement body for the buggy sections
only — the rest of the structure is correct):

```typescript
export function KnifeFire(this: CTSGun): void {
  const player  = this.m_pPlayer;
  const wepInfo = this.m_pWeaponInfo;
  const knife   = this.m_pKnife;
  if (knife === null) return;

  const pev = player.pev;

  // ---- 1. Slow-motion decision (used for damage / times only) ----------
  const fSlowMo   = (player + 0x250 /* FL_* */) (0x70c30) !== 0;
  const cSlowAmt  = cvarFloat(/* slowamt */);   // firetime scale
  const cSlowNext = cvarFloat(/* ts_slowmotion_delay */); // [+0x6e768]
  const cSlowDmg  = cvarFloat(/* ts_slowmotion_dmg */);   // [+0x6def0]
  const cIdle     = cvarFloat(/* ts_knife_idle */);       // [+0x6df78]

  // ---- 2. Schedule next attack / idle / anim times ----------------------
  let flDelay = wepInfo.m_flPrimaryAttack;  // [wepInfo+0x18]
  if (fSlowMo) flDelay *= cSlowAmt;

  const flBase = UTIL_WeaponTimeBase();
  this.m_flNextPrimaryAttack   = flBase + flDelay;        // [this+0xa0]
  this.m_flTimeWeaponIdle      = flBase + flDelay;        // [this+0x9c]
  this.m_flNextSecondaryAttack = flBase + cSlowNext;      // [this+0xa8]
  (player + 0x4f8)/* m_flWeaponAnimTime */ = flDelay;

  // Refresh forward / right / up from the player's view angle.
  UTIL_MakeVectors(pev + 0x74 /* v_angle.x */);

  let bFired = false;
  let engaged = false;

  // =====================================================================
  // THROW branch — knife.m_bThrow != 0
  // =====================================================================
  if (knife.m_bThrow !== 0) {
    // Predicted eyepoint: origin + velocity (lead the target).
    const aimStart: Vec3 = [pev.x,            pev.y,            pev.z           ];
    const aimEnd:   Vec3 = [(pev + 0x174).x,   (pev + 0x174).y,   (pev + 0x174).z ]; // velocity
    const tr = UTIL_TraceLine(aimStart, aimEnd, 0, player.edict);

    const iThrowMode = wepInfo.m_iMode;  // [wepInfo+0x20]

    // mode 6 picks one damage scale, others pick the default.
    const spawnEnd: Vec3 = (iThrowMode === 6) ? aimEnd : tr.vecEndPos;
    const dart = CTSKnife.CreateKnife(player, aimStart, spawnEnd, iThrowMode);

    if (dart !== null) {
      // Build the throw direction; the disassembly forms it from
      // v_forward +/- v_right/v_up (offsets +0x28 / +0x40 from gpGlobals),
      // then divides by its length and a KNIFE_SPEED scale.
      const dir: Vec3 = [vForward.x, vForward.y, vForward.z];
      const len = Math.hypot(dir.x, dir.y, dir.z);
      let ux: number, uy: number, uz: number;
      if (len <= 1e-6) {
        ux = 0; uy = 0; uz = -1;
      } else {
        const inv = KNIFE_SPEED / len;
        ux = dir.x * inv; uy = dir.y * inv; uz = dir.z * inv;
      }

      const angles: Vec3 = [0, 0, 0];
      UTIL_VecToAngles([ux, uy, uz], angles);

      dart.pev.angles = [angles[0], angles[1], angles[2]];
      dart.pev.angularVelocity = [50.0, 0.0, -50.0]; // 0x42b40000 / 0xc4a28000
    }

    bFired = true;

    // Animate if NOT in slowmo-style FL_* bits AND the player has its
    // anim-flag byte set. NB: this gate does NOT re-test fSlowMo.
    if ( ( (player + 0x250) (0x30c30) ) === 0
        && ((player + 0x1a5) /* BYTE */ & 0x2) !== 0) {
      this.m_pAnimation.Animate(player, 32);             // THROW seq
    }

    // Sound: filename = "weapons/knife_throw.wav" (resolved at [ebx-0x6dc7e]).
    EMIT_SOUND_DYN(
      player.edict,
      RANDOM_LONG(0, 0x1f) + 95 + 0x5f,
      SOUND_KNIFE_THROW,         // (ebx - 0x6dc7e)
      /* vol    */ 1.0,
      /* attn   */ 0.4,                                  // 0x3f4ccccd
      /* pitch  */ 0.7,                                  // 0x3f000000
      /* chan   */ 4,
    );

  // =====================================================================
  // MELEE branch — knife.m_bThrow == 0
  // =====================================================================
  } else {
    // Pick swing anim 29..31. NB: gate does NOT check +0x250 either; it
    // just re-tests fSlowMo at the top of this branch.
    if ( !fSlowMo && ((player + 0x1a5) /* BYTE */ & 0x2) !== 0) {
      this.m_pAnimation.Animate(player, RANDOM_LONG(0, 2) + 29);
    }

    // Damage: slowmo cvar * per-player melee multiplier.
    let flDamage = wepInfo.m_flDamage;                   // [wepInfo+0x1c]
    if (fSlowMo) flDamage *= cSlowDmg;
    flDamage *= player.GetMeleeMultiplier();

    // Hull-trace in the player's view direction (clip-monster hull = 3).
    const aimStart: Vec3 = [
      pev.x + (pev + 0x110).x, pev.y + (pev + 0x110).y, pev.z + (pev + 0x110).z,
    ];
    const aimEnd:   Vec3 = [
      aimStart[0] + vForward.x /* *reach */,
      aimStart[1] + vForward.y /* *reach */,
      aimStart[2] + vForward.z /* *reach */,
    ];
    const tr = player.CheckHull(aimStart, aimEnd, /* hull */ 3);

    if (tr.flFraction < 1.0 /* the [ebx-0x6f018] == 1.0qword */) {
      let victim: CBaseEntity | null = tr.pHit ?? null;
      if (victim === null) victim = player.FindUseTarget(null);

      if (victim !== null
          && victim.IsAlive()
          && !VictimKnifeHold(player, victim, flDamage)) {
        engaged = true;
        ClearMultiDamage();
        const aimLocal: Vec3 = [vForward.x, vForward.y, vForward.z];
        victim.TakeDamage(
          player.pev, player.pev, flDamage,
          0x1004 /* DMG_SLASH | DMG_NEVERGIB */,
          aimLocal,
        );
        ApplyMultiDamage(player.pev, player.pev);

        // vtable 0xc8 is CBaseEntity::ApplyTraceBleed-ish; its return
        // decides whether the cosmetic hit-sfx fires. NB: even when it
        // returns 0 we still leave `engaged = true` here — the fumble
        // decision is about whether we hit, not whether the sfx played.
        const bHitSfx = victim.ApplyTraceBleed(/* params */);
        if (bHitSfx) {
          knife.m_iHit = 1;          // [knife+0x8]
          this.m_iHits = 1;          // [this+0x114]
          EMIT_SOUND_DYN(
            player.edict,
            RANDOM_LONG(0, 0x1f) + 95 + 0x5f,
            SOUND_KNIFE_HIT,        // (ebx - 0x6df30)
            /* vol   */ 1.0,
            /* attn  */ 0.4,
            /* pitch */ 0.5,
            /* chan  */ 4,
          );
        }
      }
    }

    if (!engaged) {
      // Miss: drive fumble-pose times back onto the player.
      (player + 0x79c) /* m_flAnimTime2 */ = cIdle * wepInfo.m_flPrimaryAttack;
      (player + 0x7a0) /* m_flAnimTime  */ = flDamage;
      (player + 0x7a4) /* m_bAnimating  */ = 1;
    }

    bFired = true;

    // Broadcast the swing to everyone.
    ENGINE.MESSAGE_BEGIN(1, SVC_WEAPONANIM, null, player.edict);
    ENGINE.MESSAGE_WRITE_BYTE(knife.m_iHit);
    ENGINE.MESSAGE_WRITE_SHORT(player + 0x972 /* LOWORD */);
    ENGINE.MESSAGE_END();
  }

  // =====================================================================
  // Post-fire bookkeeping (THROW and MELEE both land here).
  // =====================================================================
  if (bFired) {
    if (!InfiniteClips(player)) {
      (player + 0x548) /* m_iAmmoKnife */ += ((wepInfo + 0xd0) & 0xff);
      SetPlayerSpeed(player, player.GetSpeedBySlots());
      knife.m_iClip--;                                  // [knife+0x4]
    }

    if (knife.m_iClip > 0) {
      // Recoil / follow-up anim — vtable 0x174 using m_hOwner (knife+0x28).
      const hOwner = (knife + 0x28) !== null
        ? (knife + 0x28)
        : 0;
      this.Recoil(hOwner, /* model idx */ player + 0x976);

      // Re-schedule next primary and broadcast the follow-up animation
      // (a second MESSAGE_BEGIN with the secondary model index).
      ENGINE.MESSAGE_BEGIN(1, SVC_WEAPONANIM, null, player.edict);
      ENGINE.MESSAGE_WRITE_BYTE(knife.m_iClip);
      ENGINE.MESSAGE_WRITE_SHORT(player + 0x976);
      ENGINE.MESSAGE_END();
      this.m_flNextPrimaryAttack =
        UTIL_WeaponTimeBase() + /* qword at [ebx-0x6de50] */ 0.0 /* TODO resolve */;
    } else {
      this.DropWeapon(this.m_iId /* [this+0xc8] */, 1);
    }
  }
}
```

Net: keep the function's spine (early-return, throw/melee fork,
post-fire), but plug every `/* … */` placeholder with the real
operand (cvars, filenames, sound-channel numbers, kill-bits,
MESSAGE_BEGIN argument sequence), replace the `!knife.m_iHit`
fumble test with `!engaged` so the per-attack semantics match
the disassembly's `edi`, and split the +0x250 / +0x1a5 flag
gate cleanly.
```
