I'll review the Codex decompilation of `CTSGun::KatanaThrow` against the disassembly chunk.

Note up front: this is **not** an HLSDK interface function — it's a `CTSGun` gameplay method. The HLSDK reference in the prompt covers `GiveFnptrsToDll` / `GetEntityAPI*` / `GetNewDLLFunctions`, none of which apply here. I'll adapt items 2–4 to "N/A" and evaluate against the disassembly and TS conventions instead.

---

```
VERDICT: PASS-WITH-NOTES

Checklist:
1. Signature — ✅ — `KatanaThrow(this: CTSGun): void` matches the demangled
   `CTSGun::KatanaThrow()` (no args beyond `this`, void return; the epilogue
   pops ebx/esi/edi/ebp and `ret`s without an EAX consumer). The catch is
   that `CTSGun` is not declared in this snippet — see item 8.
2. Version check — N/A (not an interface function).
3. interfaceVersion assignment-back — N/A.
4. Success path (struct copy) — N/A.
5. No fabricated paths — ⚠️ — the velocity blend around `[esi+0x28]`,
   `[esi+0x40]`, player velocity and GOT-relative cvars (0x1600, 0x6F064,
   0x6F3FC) is collapsed into `vx = ex - ox + pvx + tv.x`. That formula is
   not in the chunk. The TODO comments acknowledge this, but the lines
   themselves read like real arithmetic and would mislead a reader.
6. No TODO-only body — ✅ — body is real code with embedded TODO comments,
   not a stub.
7. Field names — ⚠️ — most are plausible HLSDK conventions (`m_pPlayer` for
   `[this+0x80]`, `m_flNextPrimaryAttack` for `[this+0x9c]`,
   `m_flNextSecondaryAttack` for `[this+0xa0]`, `m_flTimeWeaponIdle` for
   `[this+0xa8]`, `pev.v_angle`/`pev.view_ofs` for `0x74`/`0x174`).
   Speculative: `m_pKatanaItem` (0xcc), `m_iDropData` (0xc8),
   `g_katanaThrowSpeed`. **Concrete error below:** the const `0xC42F0000`
   is misdecoded.
8. Compiles in isolation — ⚠️ — `CTSGun` is referenced as the `this` type
   without being declared; the strictly-isolated form would be `this: any`.
   Everything else is via `any` or untyped identifiers, so it'll pass under
   `noImplicitAny: false`. Also: `UTIL_TraceLine` is called with 4 args;
   the C signature is `(Vector, Vector, IGNORE_MONSTERS, edict_t*,
   TraceResult&)` (5 args). The trace result is filled through the hidden
   5th pointer and the TS pretends the call returns it.

Issues to fix:

- **`0xC42F0000 ≠ -1000`.** That bit pattern is **-700.0** (sign=1, exp=9,
  mantissa 0x2F0000 → fraction 1.3671875 → 1.3671875 × 2⁹ = 700). The
  comment claims "sign-flip of 0x42F00000 (=120.0)" — wrong twice over:
  (a) 0xC42F0000 is not the sign-flip of 0x42F00000 (the byte at index 0
  differs in two bits, not one), and (b) `-1000.0` is `0xC447A000`, `-120.0`
  is `0xC2F00000`, neither matches. The actual avelocity.z being set is
  -700.0 — a large negative spin, consistent with a knife tumbling as it
  flies. Leave a TODO to verify against `CTSKnife`'s intended tumble rate
  during D.4.

- **`0x42B40000 = +90.0`** is correct (no change).

- **Velocity blend is fabricated.** Replace the current `vx = ex - ox + pvx
  + tv.x` style with a clear `// TODO(asm-ambiguous)` block until D.4 names
  the cvars at GOT-relative 0x1600 / 0x6F064 / 0x6F3FC and the
  `[esi+0x28]`/`[esi+0x40]` vector roles.

- **`UTIL_TraceLine` signature.** Pass an explicit trace-result buffer as
  the 5th arg; don't read a returned `trace.vecEndPos`.

- **`[this+0xc8]` (the int arg to `DropWeapon(int, bool)`).** Name is a
  guess. Confirm against other `DropWeapon` call sites in `CTSGun` during
  D.4 before locking in a field name.

- **Animation guard.** `(player.pev.flags & 0x30c30) === 0` is structurally
  right (`test [eax+0x250],0x30c30` → `jne` = "skip if any bit set"), but
  drop the comment that names specific `FL_*` constants — they're not
  derivable from this chunk alone.

- **`m_pKatanaItem` early-return guard** (`[this+0xcc]` null-check) is
  defensible but speculative. Name it `m_pActiveMelee` or similar once we
  cross-reference with the class layout in D.4.

Suggested rewrite:

```typescript
/**
 * CTSGun::KatanaThrow — spawn a flying CTSKnife along the player's view,
 * then drop the katana from the player's inventory.
 *
 * Decompiled from CTSGun__KatanaThrow.chunk.md (1241 B, 0x73b68–0x74044).
 */
export function KatanaThrow(this: any): void {
  // Guard: only proceed if a katana is actually attached to this gun.
  // TODO(asm-ambiguous): [this+0xcc] is a dword null-checked here; its meaning
  //   (active melee item vs. "ready to throw" flag) is unclear without the
  //   D.4 class layout.
  if ((this as any).m_pKatanaItem === null) return;

  const player: any    = this.m_pPlayer;         // [this+0x80]
  const katanaItem: any = this.m_pActiveItem;    // [this+0xd0]

  // ---- Cooldowns ---------------------------------------------------------
  const throwDelay: number = katanaItem.m_flTime; // [katanaItem+0x28]
  const now: number        = UTIL_WeaponTimeBase();
  this.m_flNextSecondaryAttack = now + throwDelay; // [this+0xa0]
  this.m_flNextPrimaryAttack   = now + throwDelay; // [this+0x9c]
  this.m_flTimeWeaponIdle      = now + 0.5;       // [this+0xa8] (GOT-0x6e768)

  // ---- Eye position (origin + view_ofs) ---------------------------------
  UTIL_MakeVectors(player.pev.v_angle);            // [player+0x74]
  const ox = player.pev.origin.x + player.pev.view_ofs.x; // [+0x08 + +0x174]
  const oy = player.pev.origin.y + player.pev.view_ofs.y; // [+0x0C + +0x178]
  const oz = player.pev.origin.z + player.pev.view_ofs.z; // [+0x10 + +0x17C]

  // ---- Trace-end + knife-velocity blends --------------------------------
  // TODO(asm-ambiguous): the chunk carries three vmul chains over [esi+0x28]
  //   (forward), [esi+0x40] (a "spread" vector), player velocity, and cvars
  //   at GOT-relative 0x1600, 0x6F064, 0x6F3FC. The disassembly is too
  //   interleaved to recover the exact formula here; the lines below are a
  //   placeholder blend and should be revised in D.4 once those cvars are
  //   identified in strings-n5.txt.
  const throwSpeed: any = g_katanaThrowSpeed.value; // GOT-relative 0x1600
  const ex = ox + gpGlobals.v_forward.x * throwSpeed.x;
  const ey = oy + gpGlobals.v_forward.y * throwSpeed.y;
  const ez = oz + gpGlobals.v_forward.z * throwSpeed.z;

  // Trace the throw line, ignoring monsters.
  // NOTE: the real signature is (start, end, IGNORE_MONSTERS, edict*,
  //       TraceResult&); the 5th arg is the destination buffer.
  const tr: any = {};
  UTIL_TraceLine({ x: ox, y: oy, z: oz },
                 { x: ex, y: ey, z: ez },
                 IGNORE_MONSTERS,                 // 0
                 player.edict,
                 tr);
  // TODO(asm-ambiguous): chunk copies tr.vecEndPos and endPos into locals
  //   and blends them per-axis with GOT-relative 0x6F064; treated here as
  //   "use the hit point".
  const hx = tr.vecEndPos.x;
  const hy = tr.vecEndPos.y;
  const hz = tr.vecEndPos.z;

  // TODO(asm-ambiguous): knife initial velocity is a blend of (forward *
  //   cvar) + (player velocity * cvar) + (spread * cvar). Treat the local
  //   vec3 at [esp+0x30] as "velocity"; exact weights TBD.
  const pvx = player.pev.velocity.x;
  const pvy = player.pev.velocity.y;
  const pvz = player.pev.velocity.z;
  const vx  = ex - ox + pvx + throwSpeed.x;       // placeholder blend
  const vy  = ey - oy + pvy + throwSpeed.y;
  const vz  = ez - oz + pvz + throwSpeed.z;

  // ---- Spawn the knife projectile ---------------------------------------
  // Signature: CTSKnife::CreateKnife(CBasePlayer*, const Vector& origin,
  //                                  const Vector& velocity, int).
  const knife: any = CTSKnife.CreateKnife(
    player,
    { x: hx, y: hy, z: hz },                      // origin
    { x: vx, y: vy, z: vz },                      // velocity
    katanaItem.m_iModelIndex,                     // int [katanaItem+0x20]
  );

  if (knife !== null) {
    // Orient along its velocity vector.
    const kvx = knife.pev.velocity.x;
    const kvy = knife.pev.velocity.y;
    const kvz = knife.pev.velocity.z;
    const speed = Math.sqrt(kvx * kvx + kvy * kvy + kvz * kvz);
    let dir: { x: number; y: number; z: number };
    if (speed < 0.00001) {
      dir = { x: 0, y: 0, z: 1 };
    } else {
      // Divisor (GOT-relative 0x6F3FC) is treated as a throw-speed cvar;
      // exact identity TBD in D.4.
      const inv = throwSpeed.x / speed;
      dir = { x: kvx * inv, y: kvy * inv, z: kvz * inv };
    }
    UTIL_VecToAngles(dir);

    // Set facing + angular velocity. The two immediates are IEEE 754
    // constants; verify against CTSKnife's intended tumble rate during D.4.
    knife.pev.angles    = dir;                              // [pev+0x50]
    knife.pev.avelocity = { x: 90.0, y: 0.0, z: 0.0 };      // [pev+0x58] = 0x42B40000
    // 0xC42F0000 decodes to -700.0 (sign=1, exp=9, mantissa 0x2F0000
    // → 1.3671875 × 2⁹). NOT -1000.0 and NOT a sign-flip of 0x42F00000.
    knife.pev.avelocity.z = -700.0;                         // [pev+0x5C] = 0xC42F0000
  }

  // ---- Animation (skipped if player is in a restricted state and pressing
  // IN_ATTACK). 0x30C30 = mask of state-restricted flags (exact mapping TBD
  // against engine.h); 0x2 = IN_ATTACK.
  const playerEdict: any = (player as any).pev;
  if ((playerEdict.flags & 0x30c30) === 0 && (playerEdict.button & 0x2) !== 0) {
    CTSAnimation.Animate(player, /* seq */ 0x20, /* mode */ 0);
  }

  // ---- Throw sound. Sample name placeholder; verify in data-section strings.
  EMIT_SOUND_DYN(
    player.edict,
    /* channel */ 4,
    /* sample  */ "weapons/katana_throw.wav",
    /* volume  */ 1.0,
    /* attn    */ 0.8,
    /* flags   */ 0,
    /* pitch   */ RANDOM_LONG(0, 31) + 95,
    /* radius  */ 0.5,
  );

  // ---- Refund + drop (only when infinite-clips cheat is off) -----------
  if (!InfiniteClips(player)) {
    player.m_rgAmmo[katanaItem.m_iAmmoType] += katanaItem.m_iClip;
    SetPlayerSpeed(player, GetSpeedBySlots(player));
    // [this+0xc8] = int arg to DropWeapon; exact meaning TBD in D.4.
    this.DropWeapon(this.m_iDropData, true);
  }
}
```

One observation for the record: this is the first Codex decompile of `KatanaThrow` — there's no `CTSGun__KatanaThrow__claude.ts` companion in `tools/decompile/cross-vendor/`. If we want a cross-vendor diff before locking it in, run a second pass on the same chunk.
