  const predicted: Vector = {
    x: pev.origin.x + pev.velocity.x * dt,
    y: pev.origin.y + pev.velocity.y * dt,
    z: pev.origin.z + pev.velocity.z * dt,
  };
  const trace = UTIL_TraceLine(
    pev.origin, // +0x08
    predicted,
    0, // IGNORE_MONSTERS = NO
    pev.engineEdict, // +0x208
  );

  //   fcomp QWORD [ebx-0x6f018]; sahf; jae 8e19e
  //   jae skips when flFraction >= 1.0 (trace cleared). Do damage when below.
  if (trace.flFraction < 1.0) {
    // (4a) Resolve trace hit to a CBaseEntity*:
    //      flFraction == 0 means no hit; resolve worldspawn via    //      enginefuncs.pfnPEntityOfEntIndex(0). Otherwise read
    //      pvPrivateData (edict +0x7c).
    let victim: CBaseEntity | null = null;
    if (trace.flFraction === 0) {
      const worldEdict = engineApi.edictFromIndex?.(0);
      victim =
        (worldEdict &&
          ((worldEdict as Record<number, unknown>)[0x7c] as
            | CBaseEntity
            | undefined)) ??
        null;
    } else if (trace.ent) {
      const ent = (trace.ent as Record<number, unknown>)[0x7c];
      victim = (ent as CBaseEntity | undefined) ?? null;
    }

    // (4b) Gate on vtable+0xc8/4.
    //   asm: test eax,eax; jne 8e19e (skip)
    //   jne jumps when NON-ZERO; fall-through (do damage) when ZERO.
    if (victim) {
      const vtable = (victim as Record<number, unknown>)[0x60] as
        | Record<number, unknown>
        | undefined;
      const damageCheck = vtable?.[0xc8 / 4] as
        | ((this: CBaseEntity) => unknown)
        | undefined;
      if (!damageCheck?.call(victim)) {
        // (4c) Compute impact damage proportional to falling speed.
        const speed = Math.sqrt(
          pev.velocity.x * pev.velocity.x +
            pev.velocity.y * pev.velocity.y +
            pev.velocity.z * pev.velocity.z,
        );
        const damage = speed * FLAG_DAMAGE_SCALE;

        // asm: fcomp [ecx+0x160]; test ah,0x1; jne 8e19e
        //   ecx = [esi] = victim->pev (first dword of victim = m_pent).
        //   `test ah,0x1` reads C0; jne jumps when C0=1 (ST<operand).
        //   So do damage when damage >= cap.
        // TODO(asm-ambiguous): what `victim->pev + 0x160` is.
        const cap =
          ((((victim as Record<number, unknown>)[0] as
            | Record<number, unknown>
            | undefined) ?? {})[0x160] as number | undefined) ?? 0;
        if (damage >= cap) {
          ClearMultiDamage();
          // TraceAttack(victim, pevAttacker, flDamage, vecDir, trace, dmgBits)
          //   at victim's vtable [+0x54]. asm re-stores raw velocity
          //   (pev+0x20) at esp+0x10/14/18 for vecDir BEFORE this call,
          //   NOT predicted (which lives at esp+0x20/24/28 = vecEndPos).
          const traceAttackFn = vtable?.[0x54 / 4] as
            | ((
                this: CBaseEntity,
                pevAttacker: entvars_s,
                flDamage: number,
                vecDir: Vector,
                traceResult: TraceResult,
                bitsDamageType: number,
              ) => void)
            | undefined;
          traceAttackFn?.call(
            victim,
            pev, // pevAttacker (the flag's own pev)
            damage * FLAG_DAMAGE_FINAL_MULTIPLIER,
            { x: pev.velocity.x, y: pev.velocity.y, z: pev.velocity.z },
            trace,
            0x1080, // DMG_CLUB (0x80) | DMG_NEVERGIB (0x1000)
          );
          ApplyMultiDamage(pev, pev);
        }
      }
    }
  }

  // ---- (5) Hand control to the parent class for the next tick ----
  CTSPhysicObject.WaitThink(this);
}
