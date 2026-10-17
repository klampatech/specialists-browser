```typescript
/**
 * CTSStunt::CheckForBreakables — Per-tick forward-trace damage check
 * against breakable props. Runs every server frame while the close-attack
 * button is held, traces forward (along v_angle for fresh attacks, along
 * unit velocity for charged attacks), filters out non-breakable hits,
 * dispatches to the per-mode victim-hold handler (kung fu / knife /
 * katana), applies damage scaled by the attacker's velocity, plays the
 * impact sound, and pushes the victim with a reflection-style impulse.
 *
 * @param this  The CTSStunt entity instance (this in the original C++)
 */
export function CheckForBreakables(this: CTSStunt): void {
  const gameTime = globals.time;

  // ----- First-call-per-tick guard -----------------------------------
  // Re-sync on the first invocation within a tick; subsequent calls in
  // the same tick short-circuit. The secondary sync target (the chunk
  // loads globals.v_forward.x as a stand-in) is unclear from the asm.
  if (this.timeCheck === gameTime) {
    this.timeCheck = globals.v_forward.x; // TODO(asm-ambiguous): semantic of secondary sync
  } else {
    return;
  }

  const player = this.player;
  const pev = player.pev;

  // ----- Frozen + button-held combo bail -----------------------------
  if ((pev.flags & FL_FROZEN) && player.flBreakableHeldTime > 0) {
    player.lastBreakableHit = null;
    return;
  }

  // ----- Player velocity magnitude -----------------------------------
  // Standard 3-product sqrt pattern.
  const v = pev.velocity;
  const speed = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);

  // Need either non-trivial velocity, or a sustained button hold.
  if (speed < CVAR_MIN_SPEED) {
    if (player.flBreakableHeldTime <= 0) return;
  }

  // ----- Build the trace endpoint (two flavours) ---------------------
  let forward: Vec3;
  let traceDist: number;
  if (player.flBreakableHeldTime <= 0) {
    UTIL_MakeVectors(pev.v_angle);
    forward = globals.v_forward;
    traceDist = CVAR_TRACE_DIST_NOT_HELD;
  } else {
    if (speed > 0) {
      forward = v.mul(1 / speed);
    } else {
      // Sustained hold but zero velocity: a hard-coded Z-axis fallback
      // (the disassembler writes 0, 0, CVAR_FALLBACK_VELOCITY_Z).
      forward = new Vec3(0, 0, CVAR_FALLBACK_VELOCITY_Z);
    }
    traceDist = CVAR_TRACE_DIST_HELD;
  }
  const traceEnd = pev.origin.addScaled(forward, traceDist);

  // ----- Player-hull swept trace -------------------------------------
  const tr = UTIL_TraceHull(
    /* start     */ pev.origin,
    /* end       */ traceEnd,
    /* ignoreMon */ 0,
    /* hullNumber*/ 3,                  // HULL_PLAYER
    /* ignoreEnt */ player.edict(),
  );
  if (tr.fraction >= 0.5) return;

  // ----- Resolve entity hit ------------------------------------------
  // Some engines return tr.entIndex == 0 for "no edict"; fall back to
  // tr.ent (a CBaseEntity* cached on the trace).
  let hitEnt: CBaseEntity | null = null;
  if (tr.entIndex === 0) {
    hitEnt = engine.entityOfIndex(0);  // vtable[0x114] PRIMARY_LOOKUP
  }
  if (hitEnt === null) hitEnt = tr.ent as CBaseEntity;
  if (hitEnt === null) return;

  // ----- Damageability filter ---------------------------------------
  if (!hitEnt.TakeDamage(hitEnt)) return;
  if (player.flBreakableHeldTime > 0) return;
  if (hitEnt.pev.health > 0) return;        // offset 0x16c
  if (hitEnt.pev.flags & 0x2) return;
  if (hitEnt.pev.frozenFlag !== 0) return;  // offset 0x1a7 — TS-specific
  if (hitEnt.pev.deadflag < DF_NO) return;  // offset 0x118 — already dead

  // ----- Already destroyed this one ----------------------------------
  if (player.lastBreakableHit === hitEnt) return;

  // ----- Damage scale = speed × tuned multiplier --------------------
  const flDamage = speed > 0
    ? speed * CVAR_DAMAGE_MULT
    : 0;  // TODO(asm-ambiguous): exact zero-vel branch

  // ----- Damage bitfield; extended for kung fu -----------------------
  let damageBits = 0x1080;       // DMG_GENERIC | DMG_CLUB-ish
  let willApplyDamage = true;

  // ----- Mode 0: KUNG FU --------------------------------------------
  if (this.attackMode === ATTACK_KUNGFU) {
    // If the victim's health is negative (hit will kill), save their
    // primary weapon (-2 = keep it, do not throw).
    if (hitEnt.pev.health <= 0) {
      DropWeapon(hitEnt, /*dropFlag*/ -2);
    }

    // Skip-think sentinel: other systems should suppress their hit sounds
    // while the kung fu impulse is landing.
    globals.bKungfuActive = 1;  // [ebx+0x1920] — TODO: field name TBD

    // Reflection-style pushback along the line victim→attacker, scaled
    // and clamped (the disassembly does two normalisations: sqrt then
    // fdiv with a "1.0" sentinel).
    const push = computeReflectionPush(
      pev.origin, hitEnt.pev.origin, forward,
    );
    hitEnt.pev.velocity = push.mul(CVAR_DAMAGE_FORCE_SCALE);
    if (hitEnt.pev.velocity.x < CVAR_MAX_VEL) {
      hitEnt.pev.velocity.x = 0;
    }

    // Kung fu also routes through VictimKungfuHold, but only to mark
    // "skip engine damage application" when it consumes the hit itself.
    if (VictimKungfuHold(player, hitEnt, flDamage, &tr)) {
      willApplyDamage = false;
    }
    damageBits |= 0x4000000;     // kung fu extension — TODO: name this bit

    // Play the kung fu impact sound (vol 1.0, attn 0.7, pitch 0.8,
    // channel 4 dynamic).
    EMIT_SOUND_DYN(
      hitEnt.edict(), /*channel*/ 0, CVAR_SOUND_KUNGFU_PATH,
      1.0, 0.7, 0, 4,
    );
  }
  // ----- Mode 2: KATANA --------------------------------------------
  else if (this.attackMode === ATTACK_KATANA) {
    if (VictimKatanaHold(player, hitEnt, flDamage)) {
      willApplyDamage = false;
    }
    EMIT_SOUND_DYN(
      hitEnt.edict(), /*channel*/ 0, CVAR_SOUND_KATANA_PATH,
      1.0, 0.7, 0, 4,
    );
  }
  // ----- Default (mode 1): KNIFE -----------------------------------
  else {
    if (VictimKnifeHold(player, hitEnt, flDamage)) {
      willApplyDamage = false;
    }
    EMIT_SOUND_DYN(
      hitEnt.edict(), /*channel*/ 0, CVAR_SOUND_KNIFE_PATH,
      1.0, 0.7, 0, 4,
    );
  }

  // ----- Screen-punch the victim if they track one ------------------
  if (hitEnt.pev.bScreenPunchable !== 0   // offset 0xa10 — TODO: field name
      && hitEnt.pev.bScreenDirty === 0    // offset 0xc8 — TODO: field name
      && /* zero-vel or held condition, see asm */ true) {
    const punchVec = pev.origin.sub(hitEnt.pev.origin)
                          .mul(CVAR_PUNCH_SCREEN_SCALE);
    PunchScreen(hitEnt, punchVec);
  }

  // ----- Apply damage (or skip if mode consumed it) -----------------
  if (willApplyDamage) {
    ClearMultiDamage();
    const damageDir = globals.v_forward.mul(flDamage);
    hitEnt.TakeDamage(
      /* inflictor    */ pev,
      /* damage       */ flDamage,
      /* damageDir    */ damageDir,
      /* damageOrigin */ pev.origin,
      /* traceResult  */ tr,
    );
    ApplyMultiDamage(pev, pev);
  }

  // ----- Cleanup ----------------------------------------------------
  globals.bKungfuActive = 0;       // [ebx+0x1920] byte cleared
  player.lastBreakableHit = hitEnt;
}
```
