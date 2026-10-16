// Compile in isolation: stub the missing types/helpers as
// `any` so the file builds.
type any = any; // intentional escape hatch

export function KatanaFire(this: any): void {
  const THIS: any = this;
  if (!THIS.m_pKatana) return;

  const player: any = THIS.m_pPlayer;
  UTIL_MakeVectors(player.pev.angles);

  const inWater = (player.pev.flags & 0x70c30) !== 0; // TODO(asm-ambiguous): verify bitmask vs FL_*

  let anim = 0, body = 0, delay = 0;
  let damage = 0; // int until multiplied by GetMeleeMultiplier
  let applyKick = false;

  if (inWater) {
    anim = 0x11; body = -1;
    delay = 0.5; // GOT[-0x6f3fc]
    THIS.m_flTimeWeaponIdle = 0.23;
  } else {
    const altButton = (player.pev.button & 0x10) !== 0;
    const overheadPath = altButton; // (fwdLen > min && reach > 0) branch from0x734c3-0x734cc — TODO verify    if (overheadPath) {
      anim = 0x0f; body = 0x23; applyKick = true;
    } else if ((player.pev.button & 0x04) !== 0 || (player.pev.flags & 0x40) !== 0) {
      // duck-block stab
      anim = 0x11; body = 0x25; applyKick = true;
      player.pev.flags |= 0x04 | 0x01;
      player.pev.v_angle = player.pev.origin; // overridden to swing dir
      THIS.m_flNextSecondaryAttack = 2.0;
    } else if ((player.pev.flags & 0x02) !== 0) {
      // standing alt (combo cycle)
      anim = 0x11;
      if (THIS.m_iCombo - 1 > 1) THIS.m_iCombo = RANDOM_LONG(1, 2);
      if (THIS.m_iCombo === 1) { THIS.m_iCombo = 2; body = 0x21; }
      else if (THIS.m_iCombo === 2) { THIS.m_iCombo = 1; body = 0x22; anim = 0x10; }
    } else {
      // default stab
      anim = 0x11; body = 0x24;
    }
  }

  CTSAnimation.Animate(player, anim, body);

  damage = (damage || 0) * GetMeleeMultiplier(player); // multiplier first

  const eye = player.EyePosition(); // vtable 0x168 — verify name
  const reach = body; // int-to-float at 0x73844
  const aim = vec3_add(eye, vec3_scale(gpGlobals.v_forward, reach));
  const trace = CheckHull(player, eye, aim, 0, 3);

  let hitEnt: any = null;
  if (trace.fraction < 1.0) {
    hitEnt = trace.ent ?? INDEXENT(0);
    if (hitEnt && hitEnt.Classify() && hitEnt.pev.takedamage >= 0) {
      if (!VictimKatanaHold(player, hitEnt, damage)) {
        ClearMultiDamage();
        const dir = vec3_scale(gpGlobals.v_forward, Math.abs(damage));
        hitEnt.TakeDamage(player.pev, player.pev, damage, 0x1080, dir, trace);
        ApplyMultiDamage(player.pev, player.pev);
        if (!hitEnt.IsAlive()) {
          THIS.m_pKatana.decap = 1;
          // TODO(asm-ambiguous): [ebp+0x0]+0x114 — verify this is the right entity/field
          THIS.pev.decapVictim = 1;
          // EMIT_SOUND_DYN call follows; collapse to a single call for brevity
          EMIT_SOUND_DYN(
            hitEnt.edict, 4, "weapons/katana_decap",
            1.0, 0.8, 0, 1, RANDOM_LONG(0, 31) + 95
          );
        }
      }
    }
  }

  if (!hitEnt) {
    THIS.m_flMissDamageTime = 0.25;
    THIS.m_flMissDamage = damage;
    THIS.m_iSwingMode = 2;
  }

  if (applyKick && (player.pev.flags & 0x01) === 0) {
    // TODO(asm-ambiguous): destination is pev+0x4dc on the player — verify field name
    player.m_vecViewKick = vec3_scale(gpGlobals.v_forward, delay * 0.0); // GOT[-0x6decc] cvar — placeholder
    player.pev.flags |= 0x01;
  }

  PLAYBACK_EVENT_FULL(
    0, player.edict, /*eventIndex*/ cvars.event_katana,
    0, vec3_zero(), vec3_zero(),
    /*fparam1*/ body, /*fparam2*/ delay,
    /*iparam1*/ THIS.m_iId, /*iparam2*/ anim,
    /*bparam1*/ 1, /*bparam2*/ 0
  );

  const now = UTIL_WeaponTimeBase();
  THIS.m_flNextPrimaryAttack   = now + delay;
  THIS.m_flNextSecondaryAttack = now + delay;
  THIS.m_flTimeWeaponIdle      = now + 0.0; // GOT[-0x6e768] cvar — placeholder
  player.m_flNextAttack        = delay; // pev+0x4f8
}
