/**
 * CTSKnife::WaitTouch — fires when an entity touches a thrown CTSKnife.
 *
 * If the toucher is a player (pev->flags & FL_CLIENT), scales the
 * player's velocity by a scalar K, then checks the magnitude against
 * a threshold. If the scaled magnitude is below the threshold, zeroes
 * two pev fields (offsets 0x50 and 0x58 — likely basevelocity.x and .z)
 * and copies a stored global vec3 into the player's velocity.
 *
 * @param this    The CTSKnife entity instance
 * @param pOther  The entity that touched the knife
 * @returns       void
 */
export function WaitTouch(this: CTSKnife, pOther: CBaseEntity): void {
  // TODO: CTSKnife, CBaseEntity, and `globals` namespace defined by D.4.
  const pev = pOther.pev;

  // Only react if the toucher is a player.
  // pev+0x1a5 byte-test against mask 0x2 — in standard HL1 entvars_t
  // this is `flags & FL_CLIENT` (FL_CLIENT = 0x2).
  if ((pev.flags & 0x2) === 0) return;

  // Scale the toucher's velocity by a scalar (constant K at
  // [ebx-0x6ec2c]) and write it back. The FPU ops store
  // (K*vx, K*vy, K*vz) to a stack temp and copy them back to pev+0x20
  // — a uniform scalar multiply.
  // TODO(asm-ambiguous): the constant at [ebx-0x6ec2c] is unidentified;
  // plausibly a "slowamt" / ts_slowmotion factor.
  const K = globals.cvarMinus0x6ec2c;
  const newVx = pev.velocity.x * K;
  const newVy = pev.velocity.y * K;
  const newVz = pev.velocity.z * K;
  pev.velocity.x = newVx;
  pev.velocity.y = newVy;
  pev.velocity.z = newVz;

  // Recompute the magnitude of the (now-scaled) velocity.
  const magnitude = Math.sqrt(
    newVx ** 2 + newVy ** 2 + newVz ** 2
  );

  // If at or above the threshold, bail out.
  // TODO(asm-ambiguous): the constant at [ebx-0x6f064] is unidentified;
  // plausibly a slow-motion / recall-speed threshold.
  const threshold = globals.cvarMinus0x6f064;
  if (magnitude >= threshold) return;

  // Within range: zero two pev fields and copy a global vec3 into
  // pev->velocity.
  // TODO(asm-ambiguous): offsets 0x50 and 0x58 are likely
  // basevelocity.x and basevelocity.z in standard HL1 entvars_t (y is
  // left untouched — unusual but matches the assembly). The
  // destination global vec3 at [ebx+0x1888] is unidentified (likely a
  // stored recall / throw velocity).
  pev.field0x50 = 0;
  pev.field0x58 = 0;
  pev.velocity = globals.vec3At0x1888;
}
