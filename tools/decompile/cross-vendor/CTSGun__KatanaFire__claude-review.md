```
VERDICT: FAIL

Checklist:
1. Signature — ✅ — `KatanaFire(this: CTSGun): void` matches the
   demangled `CTSGun::KatanaFire()` and the disassembly's
   `push ebp` / `push edi` / `push esi` / `push ebx` prologue
   (no args in regs, `this` implied). Void matches — there's no
   `eax` writeback before `ret`.

2. Version check — n/a — not one of the four interface functions.

3. interfaceVersion assignment — n/a — n/a.

4. Success path — n/a — n/a.

5. No fabricated paths — ⚠️ — The high-level branching (in-water
   / overhead / crouch-block / combo / default) is faithful to
   the disassembly's 0x7343e / 0x735c4 / 0x73604 / 0x736d0 /
   0x7375c clusters. The `m_iCombo` 1→2 / 2→1 cycling is correct
   for `[ebp+0xa04]`. BUT: the function invents a `clamp(...)`
   expression for the default-stab damage that doesn't appear in
   the asm (the asm at 0x73764 does `fmul [-0x6debc]` then a
   `fcomp` against [-0x6deb8] then a conditional `fld
   [-0x6deb8]`, and finally a `fcomp` against [-0x6dee8] with a
   conditional `fld [-0x6dee8]` — i.e. clamp(min, max) but in a
   specific order that is NOT `clamp(scaled, min, max)`). The
   TS has the formula shape wrong. Also: the trace `aim` is
   computed as `eye + v_forward * body` — the asm actually does
   `v_forward * damage` (multiplied at0x73844-0x73863), not
   `v_forward * body`. The `body` value never enters the trace
   vector in the disassembly. The weapon-kick block at
   0x73abd-0x73ad5 is `pev->something * delay * cvar` but the
   destination field is at `[edx+0x4dc]` where `edx = *(this)`,
   i.e. pev+0x4dc, NOT a `someField` on player. The TS writes
   to `(player as any).someField` which is the wrong entity
   entirely.

6. No TODO body — ❌ — The body has FOUR explicit placeholder
   comments — `(this as any).someField /* +0x0 */`, `((this
   as any).someField /* +0x1a5 */ & 0x40)`, `(player.pev as
   any).someField2 /* +0x1a5 */`, `(player as any).someField
   /* +0x4dc */` — that are comments, not code. Per the
   checklist, a body that is mostly `// TODO` / `someField`
   placeholders is a fail. The asm actually tells us what   these fields are (the disassembly comments in   `tools/decompile/chunks/CTSGun__KatanaFire.chunk.md` give
   the offset table); the rewrite needs to put real names in,
   not `someField`.

7. Field names — ⚠️ — `m_pKatana`, `m_pPlayer`, `m_iCombo`,
   `m_flMissDamage`, `m_flMissDamageTime`, `m_iSwingMode`,
   `m_flNextPrimaryAttack`, `m_flNextSecondaryAttack`,
   `m_flTimeWeaponIdle`, `m_iId`, `m_flNextAttack` are
   plausible CTSGun fields and consistent with the offsets
   seen in `TakeWeapon__6CTSGun` / `UpdateClientData__6CTSGun`.
   `m_pKatana` mapping to `[ebp+0xcc]` is consistent with the
   early bail at 0x7340d. `m_iCombo` at `+0xa04` is consistent
   with 0x736e4/7370c/7373b. `decap` at `[m_pKatana+0x8]` is
   consistent with 0x73a07-0x73a14 (the `[eax+0x8]` write
   where `eax = [ebp+0xcc] = m_pKatana`). The `(this as   any).someField` placeholders are unjustified — they need
   real names. Also: `gpGlobals.v_forward.mul(body)` is wrong;
   the asm at 0x73844 multiplies by the damage scalar (the
   int-to-float conversion at 0x73844 converts `[esp+0x10]`
   which is the damage constant0x23/0x25/0x32/etc., i.e.
   the chosen **body** is being used as the trace-length   scalar — so the TS got the right input but described it
   backwards: it's `body` (the int) used as a distance
   multiplier on v_forward, not `body` field-of-record).

8. Compiles in isolation — ❌ — References `CTSGun`, `vec3`,
   `vecLength`, `gpGlobals`, `cvars`, `RANDOM_LONG`, `INDEXENT`,
   `CTSAnimation`, `ClearMultiDamage`, `ApplyMultiDamage`,
   `EMIT_SOUND_DYN`, `PLAYBACK_EVENT_FULL`,
   `UTIL_WeaponTimeBase`, `GetMeleeMultiplier`, `CheckHull`,
   `VictimKatanaHold`, `DMG_CLUB`, `DMG_NEVERGIB` — none are
   defined in the function or its enclosing scope. Per the
   checklist, unknowns should be `any`. The class type itself
   should be `any` (or an inline `interface CTSGun { ... }`).

Issues to fix:
- Replace `(this as any).someField /* +0x0 */` and `(player as
  any).someField /* +0x4dc */` with real field names inferred
  from the asm. `[ebp+0x0]` is `this->pev` (CBaseEntity has
  `pev` as first field). `[pev+0x4dc]` is way past entvars_s
  but is on the CBasePlayer-derived class — most likely
  `m_vecPunchAngle` or a TS-specific kick vector. Read
  `tools/decompile/chunks/CTSGun__KatanaFire.chunk.md` and
  `tools/decompile/chunks/CTSGun__VKickback.chunk.md` (the
  sibling method exists for exactly this purpose) to get the
  right field name.

- The default-stab damage formula: the asm at 0x73764 is
  `damage *= cvar_damage_scale; if (damage < cvar_min)
  damage = cvar_min; if (damage > cvar_max) damage = cvar_max;`
  i.e. clamp(scaled, min, max). The TS has the formula right
  in shape but calls `clamp` rather than implementing the
  conditional writes. That's a style call — fine to keep `clamp`
  if the helper exists, but document it.

- Trace direction: the asm at 0x73844 converts
  `[esp+0x10]` (the body int, e.g. 0x23 / 0x25 / 0x32 / 0x24
  etc.) to float and multiplies `gpGlobals->v_forward` by it.
  TS comment says "scaled by body" which is right, but the
  code does `gpGlobals.v_forward.mul(body)` against `vec3` —
  `gpGlobals.v_forward` is a `vec3_t`, and the multiply needs
  to be scalar `body`. If `vec3.mul` here means scalar mul,
  fine; if it's component-wise, it's wrong.

- In-water bitmask `0x70c30`: this isn't a standard FL_*
  combination. Standard FL_INWATER = 0x100, FL_INRAIN = 0x200,
  FL_FROZEN = 0x800, FL_SWIM = 0x100000. `0x70c30` decomposes
  to 0x70000 | 0xc00 | 0x30. The TS comment correctly flags
  this as TODO, but the bitmask itself needs verification —
  check `pev->flags` definitions in the TS-specific engine
  header. Don't ship with `0x70c30` as a magic number.

- `m_pKatana.decap` at offset `+0x8`: the asm does
  `[eax+0x8] = 1` where `eax = [ebp+0xcc] = m_pKatana`. The
  `+0x8` offset is suspicious — `m_pKatana` is itself a
  pointer, so `decap` would be a field of the pointed-to
  entity. Check whether `m_pKatana` is `edict_t*` or
  `CBaseEntity*` — if pointer, then `decap` is a member of
  the pointed class at offset 0x8 (very plausible: many
  CBaseEntity subclasses have a small member at offset 0x8).

- The PLAYBACK_EVENT_FULL call at 0x73ae4-0x73b1f is a
  straight vtable call (`call DWORD PTR [ecx+0x1ec]`). TS
  should call it as a vfunc, not a free function. The
  signature in HLSDK is `void (PLAYBACK_EVENT_FULL)(int
  flags, const edict_t *invoker, unsigned short eventindex,
  float delay, const Vector *origin, const Vector *angles,
  float fparam1, float fparam2, int iparam1, int iparam2,
  int bparam1, int bparam2)`. The TS has the arg order
  wrong — `item` and `anim` are `int iparam1/iparam2`, not
  what the TS calls them.

- The TS uses `player.GetEyePosition()` but the asm at
  0x737f4-0x737ff is `call DWORD PTR [edx+0x168]` (a
  virtual on the player, returning whether-trace-result-fraction
  data, NOT eye position). Look at the actual vtable — this
  is `CBasePlayer::EyePosition()` or  `CBaseEntity::EyePosition()` returning a vec3.

- `cvars.katana_*` — these cvar names are invented. The asm
  uses raw GOT offsets; the TS should annotate them as
  `GOT[-0x6dee8]` (matching the chunk's annotation style)
  and let D.4 wire them up to actual cvar pointers. Don't
  invent cvar names that aren't in `strings-n5.txt`.

- Define `CTSGun` as an inline interface, or use `any`:
  ```typescript
  interface CTSGun { /* fields with `any` types */ }
  ```
  Per the checklist, the function must compile in isolation.

- The `GetMeleeMultiplier` call at 0x737d1 — the asm calls
  it with `ebp+0x80` (m_pPlayer), then multiplies the
  returned float by `[esp+0x24]` which is the int-to-float
  result of the chosen damage constant. The TS has
  `damage *= GetMeleeMultiplier(player)` AFTER the damage
  constant is already a float — that's wrong order. The
  multiplier should apply to the int-to-float damage before
  any other scaling.

Suggested rewrite (sketch — the heavy lifting is field-name
resolution and the trace/damage math; not rewriting the whole
function here):
```typescript
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
```

Once the field names are resolved (cross-reference against
`tools/decompile/chunks/CTSGun__VKickback.chunk.md` and
`tools/decompile/chunks/CTSGun__UpdateClientData.chunk.md`
which read/write the same offsets), and the cvar bitmasks
are validated against `strings-n5.txt`, this becomes
PASS-WITH-NOTES. Until then it's FAIL because of the
`someField` placeholders.
