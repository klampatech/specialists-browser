```
VERDICT: FAIL

Note on scope: the review checklist (version check, *interfaceVersion
assignment-back, struct copy) is built for the four engine↔mod
interface functions (GiveFnptrsToDll, GetEntityAPI, GetEntityAPI2,
GetNewDLLFunctions). WeaponIdle is a gameplay method on a C++
weapon class — those three checks are N/A. I'm evaluating items
1, 4–8 as adapted to a gameplay-method decompile, plus a few
class-specific items (control flow, virtual call targets, field
labels) that are the equivalents for this function.

Checklist:
1. Signature — ✅ — disassembly reads `this` from `[esp+0x10]` with no other args, return is void. TS `WeaponIdle(this: CTSGun): void`
   matches.
2. Version check — N/A — not an engine↔mod interface function.
3. interfaceVersion assignment-back — N/A.
4. Success path — N/A — no struct-copy behavior in this function.
5. No fabricated paths — ❌ — multiple inventions:
   (a) `this.m_pOwnerInterface.playFireAnim(this)` and `this.m_pOwnerInterface.playReloadAnim(this)` for the two
       vtable calls at [esi+0x60]+0x188. Both go through the same
       vtable slot and the same `this`; the TS invents a separate
       owner interface and gives them different method names. The
       disassembly does not distinguish them — they call the same
       function under different preconditions.
   (b) `this.m_pOwnerInterface.playIdleAnim(this, animId, 0,
 this.someField[0x114])`. The fourth arg is loaded from
        `[*esi + 0x114]`, i.e. a vtable-relative offset of the
        base-class vtable pointer. The TS invents a field named
        "someField" and indexes into it, which is both fabricated
        and syntactically broken (see #8).
   (c) The "ammo source as part of an ammo array" reinterprets
       raw byte offsets (0x252 / 0x28c) into the player struct
       as `m_rgAmmo[0x252]` indices, which is wrong both as a
       C++ reading and as a TypeScript expression (see #8).
6. No TODO body — ✅ — body has real code, not just TODOs.
7. Field names — ⚠️ mostly plausible, two real problems:
   (a) `m_pWeaponInfo.m_pAnimSeq` at offset 0x28 is the same field
       that was assigned `m_pAmmoSource` a few instructions earlier
       (5553d: `[edx+0x28] = &m_pPlayer + offset`). It is read as
       "first short of the ammo-source struct," not a separate
       animation-sequence pointer. Renaming it `m_pAnimSeq` in
       the same function it just stored a player pointer into is
       a contradiction.
   (b) `m_flTimeWeaponIdle <= 0` for the burst-timer check is
       wrong — the disassembly compares m_flTimeWeaponIdle
       against `[ebx-0x6de68]`, a double constant loaded via
       PIC. The comparison is in the right direction (`je` jumps
       when ST(0) > src → fire when <= threshold) but the value0 is invented.
8. Compiles in isolation — ❌ — at least two syntax errors:
   (a) `&this.m_pPlayer.m_rgAmmo[0x252]` — TypeScript has no
       address-of operator, and you can't take the address of
       an indexed expression. Even if you replaced `&` with
       a cast, `m_rgAmmo[0x252]` is indexing a `number[]` with
       a byte offset (0x252 = 594), not an element index.
   (b) `this.someField[0x114]` — same problem; you can't
       subscript an integer/pointer like that. The disassembly
       reads `*(*esi + 0x114)`, which is a vtable slot of the
       base class, not a field of this.

Additional issues (not in the 8-point checklist but worth flagging):

A. Burst-mode ordering is mostly right but the wrong constant is
   used, as noted in 7(b). The TS also reads as if the timer
   check happens *after* the ShotsRemaining check (the `if/else`
   nests ShotsRemaining inside the timer check), which happens   to match the disassembly but reads ambiguously — worth
   reordering for clarity.

B. The two virtual calls at [esi+0x60]+0x188 are the *same*
   function call site. The TS renamed them differently   (playFireAnim vs playReloadAnim) based on the surrounding
   condition, but the binary doesn't distinguish them. The
   correct thing is to call the same method and mark it
   `// TODO(asm-ambiguous):` — the project will figure out
   what it actually is in D.4.

C. The `[ebx-0x6de68]` and `[ebx-0x6e768]` constants are PIC
   accesses to globals (probably cvars or static floats like
   `ts_idleplus`, `sv_idleinterval`, etc.). The TS invents
   `TS_IDLE_RANDOM_INTERVAL` for one of them but ignores the
   other entirely (uses literal 0). Both should be flagged
   as TODO with a note to grep `strings-n5.txt` and the
   cvar table for likely candidates.

D. The function uses `[esi+0x60]` as a "vtable ptr" but
   the TS never establishes what struct owns that offset.
   In HLSDK CBaseEntity, 0x60 is not the vtable — the vtable
   is at offset 0 (the typical `__vfptr` first member). 0x60
   is more likely an interface pointer (e.g., m_pLink, m_pGoalEnt,
   or similar). The TS should not invent a generic
   `m_pOwnerInterface` until the field's identity is established.

E. `[esi+0x114]` in the final arg is read from `[*esi]`, i.e.
   the vtable of whatever `[esi]` points to. In a single-
   inheritance C++ class, `[esi]` is the vtable pointer of the
   base class. So this is `vtable_base[0x114 / 4]`. That's a
   pointer to a function or data — not a field of `this`.
   Treating it as `this.someField[0x114]` is structurally
   wrong.

Issues to fix:
- Replace the fabricated `m_pOwnerInterface` plumbing with
  honest virtual calls through the vtable, and acknowledge  both call sites go through the same slot.
- Stop taking addresses with `&expr`; introduce a pointer
  helper on the player (e.g. `m_pPlayer.ammoPtr(slot): AmmoPtr`)
  or a typed byte-offset reader.
- Rename the read at `[m_pWeaponInfo + 0x28]` to `m_pAmmoSource`,
  and read its first short (which is what the disassembly does
  in the second use). Document that it's an alias for the
  same field, not a separate `m_pAnimSeq`.
- Use the actual `[ebx-0x6de68]` constant (or a TODO named
  constant with a `grep` hint) for the burst-timer threshold  instead of literal 0.
- For the fourth arg of the final virtual call, model it as
  `(*this.__vtable_base)[0x114]` or similar — not as a field
  of `this`.

Suggested rewrite:
```typescript
/**
 * CTSGun::WeaponIdle — per-frame weapon idle behavior.
 *
 * Flow (from the disassembly):
 *   1. If m_pWeaponInfo is null, delegate to CCombatIdle() and
 *      return.
 *   2. Mirror m_pWeaponInfo.m_iAmmo into this->m_iClip, then
 *      point m_pWeaponInfo.m_pAmmoSource at one of two slots
 *      in the player struct based on m_pWeaponInfo.m_bUseAmmo2.
 *   3. Burst-mode auto-fire: if m_pWeaponInfo.m_bFireMode == 2
 *      AND m_flTimeWeaponIdle <= [ebx-0x6de68] (a static double,
 *      TODO), and m_pWeaponInfo.m_iShotsRemaining > 0, call
 *      Fire() and decrement. Otherwise clamp the counter to 0.
 *   4. If UTIL_WeaponTimeBase() < this->[esi+0xa8] (likely
 *      m_flNextPrimaryAttack), return without idling.
 *   5. If m_pPlayer.[0x348] (likely m_iWeaponState) == 2,
 *      call GrenadeIdle(0) and return.
 *   6. If InfiniteClips(m_pPlayer) == 0 AND m_iAmmo <= 0,
 *      invoke the [this+0x60]+0x188 virtual (with this as the
 *      single arg) and return.
 *   7. If m_iAmmo == 0, return.
 *   8. Schedule the next idle tick: m_flNextPrimaryAttack =
 *      UTIL_WeaponTimeBase() + [ebx-0x6e768].
 *   9. Pick an anim ID: (short)(*m_pAmmoSource) if non-null,
 *      else 0. (m_pAmmoSource was set in step 2; this reuses
 *      it as a pointer to a short.)
 *  10. Invoke the [this+0x60]+0x174 virtual with4 args:
 *      (this, animId, 0, (*this.__vtable_base)[0x114]).
 *
 * Ambiguities are marked TODO(asm-ambiguous) below.
 */
export function WeaponIdle(this: CTSGun): void {
  // 1. No weapon info → generic combat idle.
  if (this.m_pWeaponInfo === null) {
    this.CCombatIdle();
    return;
  }

  // 2. Mirror ammo count; point ammo source at the right player slot.
  this.m_iClip = this.m_pWeaponInfo.m_iAmmo;
  // TODO(asm-ambiguous): identify the player fields at offsets0x252
  // and 0x28c. They are likely two distinct int counters (e.g. primary
  // vs secondary ammo counters, or m_rgAmmo[ammoType] for two different
  // ammo types). Don't pretend they're elements of one ammo array.
  const ammoSlot = this.m_pWeaponInfo.m_bUseAmmo2 === 0 ? 0x252 : 0x28c;
  this.m_pWeaponInfo.m_pAmmoSource =
    this.m_pPlayer.ammoPtrAt(ammoSlot /* byte offset */);

  // 3. Burst auto-fire tick.
  if (this.m_pWeaponInfo.m_bFireMode === 2) {
    // TODO(asm-ambiguous): the threshold is a static double at
    // [ebx-0x6de68], not 0. Cross-reference strings-n5.txt for cvar
    // candidates (likely sv_burstthreshold or similar).
    const BURST_THRESHOLD =0.0; // placeholder; see TODO above
    if (this.m_flTimeWeaponIdle <= BURST_THRESHOLD) {
      if (this.m_pWeaponInfo.m_iShotsRemaining > 0) {
        this.Fire();
        this.m_pWeaponInfo.m_iShotsRemaining--;
      } else {
        this.m_pWeaponInfo.m_iShotsRemaining = 0;
      }
    }
  }

  // 4. Don't idle if next primary attack hasn't elapsed.
  const currentTime = UTIL_WeaponTimeBase();
  if (currentTime < this.m_flNextPrimaryAttack /* [esi+0xa8] */) {
    return;
  }

  // 5. Grenade state → delegate and exit.
  // TODO(asm-ambiguous): [m_pPlayer+0x348] ==2 — likely m_iWeaponState.
  if (this.m_pPlayer.m_iWeaponState === 2) {
    this.GrenadeIdle(0);
    return;
  }

  // 6. Out of ammo + not infinite-clips → virtual call.
  // Note: this is the SAME vtable slot as step 9 below, just with
  // different args. The TS must not rename them differently.
  if (
    InfiniteClips(this.m_pPlayer) === 0 &&
    this.m_pWeaponInfo.m_iAmmo <= 0
  ) {
    // TODO(asm-ambiguous): [this+0x60]+0x188 with one arg = this.
    // The target function is not yet identified — D.4 work.
    this.callVtable(/* offset */ 0x188, /* args */ [this]);
    return;
  }

  // 7. No ammo → bail.
  if (this.m_pWeaponInfo.m_iAmmo === 0) {
    return;
  }

  // 8. Schedule next idle tick.
  // TODO(asm-ambiguous): [ebx-0x6e768] is a static double, likely
  // sv_idleinterval or ts_idleplus. Not yet resolved.
  this.m_flNextPrimaryAttack = currentTime + TS_IDLE_RANDOM_INTERVAL;

  // 9. Pick an anim ID. m_pAmmoSource was set in step 2; we read
  // its first short here.
  const animId =
    this.m_pWeaponInfo.m_pAmmoSource !== null
      ? this.m_pWeaponInfo.m_pAmmoSource.readShort(0)
      : 0;

  // 10. Final virtual call.
  // TODO(asm-ambiguous): [this+0x60]+0x174, 4 args. The fourth arg
  // is loaded from *(*this + 0x114) — a vtable-relative read of the
  // base-class vtable, NOT a field of this.
  this.callVtable(/* offset */ 0x174, /* args */ [
    this,
    animId,
    0,
    this.__vtable_base.readDword(0x114) /* vtable slot */,
  ]);
}
```

Notes for the project:

- The biggest red flag in this TS is the fabrication of
  `m_pOwnerInterface` with differently-named methods for the
  same vtable slot. The author is projecting intent from the
  surrounding code, but the binary treats both call sites
  identically. Until D.4 identifies the actual function, both
  should be the same named helper (e.g. `this.callVtable(0x188, [this])`)
  with a single TODO. Renaming them differently now will cause
  D.4 to chase two ghosts instead of one method.

- `&expr` is a C++-ism leaking into the TS. There is no
  address-of in TS. The project should either expose typed
  pointer helpers on `CTSGun` / `CBasePlayer` (`ammoPtrAt`,
  `byteOffset`, `readShort`, etc.) or accept a `Pointer<T>`
  wrapper. The current form (`&this.m_pPlayer.m_rgAmmo[0x252]`)
  won't compile and signals that the decompiler is still
  thinking in raw C.

- The two `[ebx-...]` constants in this function are very
  likely TS-specific cvars (`ts_idleplus`, `sv_burstthreshold`,
  or similar). Grep `tools/decompile/strings-n5.txt` for
  nearby symbols before guessing names. The TS guessed
  `TS_IDLE_RANDOM_INTERVAL` for one and literal 0 for the
  other — both guesses need to be cross-checked.

- Item 7(b) (m_pAnimSeq vs m_pAmmoSource) is a contradiction
  inside a single function: the same field is written as a
  pointer-to-int and then read as a pointer-to-short. The most
  plausible reading is "m_pAmmoSource is a pointer to a struct
  whose first member is a short" — i.e. the animation ID is a
  property of the ammo source, not a separate field. Worth
  cross-referencing with how other CTSGun methods (e.g.
  StandardFire, Reload) read this same field.
```
