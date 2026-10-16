```
VERDICT: PASS-WITH-NOTES

Checklist:
1. Signature — ✅ — `GrenadeFire(this: CTSGun): void` matches the demangled
   `GrenadeFire__6CTSGun`. Return type `void` matches the lack of `eax`
   propagation before `ret`. The asm reads `esi` from `[esp+0x10]`
   (this looks like the compiler spilled `this` onto the stack rather
   than keeping it in ECX for the whole body — a quirk worth flagging
   but not a bug).
2. Version check — ⚠️ N/A — Not an API entry point (no   `INTERFACE_VERSION` / `NEW_DLL_FUNCTIONS_VERSION` involved).
3. interfaceVersion assignment — ⚠️ N/A — Same reason.
4. Success path — ✅ — The "success" logic (guards → ammo consume →
   broadcast → flag set → timers → accumulator) is faithfully captured
   in order. The early-exit at `0x733ea` maps to the four guard `return`s
   plus the implicit fall-through at function end.
5. No fabricated paths — ⚠️ — Two small additions: (a) `?? 0` fallbacks on
   `gpGlobals.time` and `grenadeCookStep`. The asm dereferences
   unconditionally (`fld DWORD PTR [eax]`); a null `gpGlobals` would
   crash, not yield 0. These are defensive-TS additions rather than
   fabricated control flow, but they don't appear in the asm. (b) More
   important: the `ammoDef.dwAmmoIndex` access is a structural
   misread — see Issues.
6. No TODO body — ✅ — Body is fully expressed in code. The three
   `TODO(asm-ambiguous):` comments annotate specific lines, they don't
   *replace* logic.
7. Field names — ⚠️ — Most field names are well-grounded
   (`m_pPlayer` at +0xcc, `m_bGrenadeInFlight` at +0x8,
   `m_iGrenadeAmmo` at +0x4, `m_flTimeWeaponIdle` at +0xa0,
   `m_flNextAttack` at +0x9c, `m_flNextReload` at +0xa8 all line up
   with HLSDK CBasePlayerWeapon layout). But three names are
   speculative and one is wrong:
   - `m_pAmmoDef` at +0x80 — speculative name, but the deeper issue
     is the access pattern (see below).
   - `dwAmmoIndex` at +0x208 — WRONG pattern (see Issues).
   - `m_iGrenadeAnimIndex` at +0x978 — speculative, but a uint16 read
     at that deep offset is consistent with a CTSGun-specific anim
     field, so naming is plausible.
   - `m_flGrenadeCook` at +0xa0c — speculative but plausible (deep
     offset, float-typed, accumulator semantics).
8. Compiles in isolation — ✅ — All cross-references are via `any`
   casts or documented as "assumed declared elsewhere." `CTSGun`,
   `CBasePlayer`, `globalGOT`, `UTIL_WeaponTimeBase` need to exist
   externally but the function body itself type-checks.

Issues to fix (if any):

**Issue A (substantive) — `ammoDef.dwAmmoIndex` misread.**
The asm at 0x73358–0x73384 reads:
```
mov eax, [esi+0x80]      ; eax = *(this + 0x80)
mov edx, [eax]           ; edx = *eax
...
mov eax, [edx+0x208]     ; eax = *(edx + 0x208)  ; pushed as 11th arg
```
That is `*[ *[this+0x80] + 0x208 ]` — **three** memory loads to get to
the value. The TS treats it as `ammoDef.dwAmmoIndex`, which is only
two loads (`ammoDef = *(this+0x80)`, then `*(ammoDef + 0x208)`). The
extra `[eax]` load on line 7335e is not represented in the TS — TS
drops the indirection through whatever the first dword of the ammoDef
object is. Most likely that first dword is a vtable pointer (so the
pushed value is a *function pointer* dispatched from a slot 0x208,
not an `int` ammo index), or it's a pointer to an internal lookup
table that has a field at +0x208. Either way, the TS is reading the
wrong expression.

**Issue B (minor) — `?? 0` fallbacks added by TS.**
Lines that do `((globalGOT as any).gpGlobals.time as number) ?? 0` and
`((globalGOT as any).grenadeCookStep as number) ?? 0` add null
coalescing that the asm does not have. The asm dereferences
unconditionally (`fld DWORD PTR [eax]`, `fld DWORD PTR [ebx-0x6e818]`).
If the GOT entry is ever null at runtime, the asm crashes; the TS
silently produces 0. The behavior diverges. Not catastrophic for a
decompilation scaffold (and arguably defensive), but worth flagging.

**Issue C (minor) — helper-call target.**
`(helper as any).vtable_0x174(this, consume, 1, 0)` — the TS labels
+0x60 as `m_pEntity`. In HLSDK, CBasePlayerWeapon doesn't have a
`m_pEntity` field at +0x60; that offset is more plausibly
`m_pPlayer` or a similar owner pointer (though we already see
`m_pPlayer` at +0xcc). The TS may be double-using `m_pPlayer` (once
at +0xcc as `player`, again at +0x60 as `helper`). A field rename to
something like `m_pOwner` or `m_pWeaponHost` would be more honest
about the uncertainty; the vtable slot 0x174 should also get a TODO
identifying it.

**Issue D (note) — `[esp+0x10]` this-load is unusual.**
Standard MSVC `__thiscall` keeps `this` in ECX; the compiler here
apparently spilled it onto the stack. Either the caller pushed `this`
explicitly, or MSVC emitted it this way for some optimization reason
(thunk / interface dispatch). Worth a comment in the TS noting this
isn't the textbook `mov esi, ecx` prologue.

**Issue E (note) — `m_iGrenadeAnimIndex` at +0x978 / `m_flGrenadeCook` at +0xa0c.**
Both are deep into the CTSGun class layout, well past CBasePlayerWeapon.
Names are speculative. The asm strongly supports float at +0xa0c and
uint16 at +0x978, but the semantic names will need confirmation from
the source-of-truth comparison in D.4.

Suggested rewrite (full TS function, addressing Issues A–C):

```typescript
/**
 * CTSGun::GrenadeFire — arm and throw a grenade: validate ammo and owner
 * state, consume ammo via a virtual call, broadcast a "grenade thrown"
 * network anim event, set the post-throw timers, and bump a per-mode
 * "cook" accumulator.
 *
 * NOTE: The asm spills `this` to the stack via `[esp+0x10]` rather
 * than keeping it in ECX — unusual for MSVC __thiscall, but the
 * field offsets that follow (player ptr at +0xcc, timers at +0x9c/a0/a8)
 * are all consistent with `this == CTSGun`.
 */
export function GrenadeFire(this: CTSGun): void {
  // ---- state guard -------------------------------------------------------
  // Bail early if there's no owner, the owner already has a grenade in
  // flight, or the owner is out of grenades.
  const player = this.m_pPlayer;                  // +0xcc
  if (player === null) return;
  if (player.m_bGrenadeInFlight !== 0) return;    // +0x8 — flipped to 1 below
  if (player.m_iGrenadeAmmo <= 0) return;         // +0x4

  // ---- determine consumption amount -------------------------------------
  // Take a signed 16-bit "ammo to consume" out of the player's weapon
  // sub-state struct, falling back to 0 if that struct pointer is null.
  let consume = 0;
  if (player.m_pWeaponState !== null) {           // player+0x28 (nullable)
    consume = player.m_pWeaponState.field_0x26;   // int16 at sub+0x26
  }

  // ---- consume the grenades via virtual call ----------------------------
  // helper = *(this+0x60); call helper->vtable[0x174] with
  //   (this, consume, 1, 0).
  // TODO(asm-ambiguous): +0x60 is most plausibly m_pPlayer/m_pOwner
  // (we already use m_pPlayer at +0xcc — verify whether these alias
  // or whether +0x60 is a separate helper interface); slot 0x174 needs
  // a real name (likely a TakeAmmo/RemoveAmmo variant).
  const helper = this.field_0x60;                 // +0x60 (name TBD)
  (helper as any).vtable_0x174(this, consume, 1, 0);

  // ---- broadcast "grenade thrown" network anim event --------------------
  // Twelve dwords pushed right-to-left for an engine-side message
  // dispatcher. Args in call order (last push = first arg):
  //   (1, ammoArg, weaponAnim, 0, buf, buf, 0, 0, 0x13, 0, 0, 0)
  //
  // ammoArg derivation (FIXED from prior version):
  //   asm:  eax = *(this+0x80)        ; eax = some object ptr P
  //         edx = *(eax)              ; edx = *P (first dword of P,
  //                                     almost certainly a vtable or
  //                                     inner-table pointer)
  //         eax = *(edx+0x208)        ; eax = *(*P + 0x208)
  //   i.e. a triple-deref, not a flat field read. Treat +0x208 as a
  //   vtable slot / inner-table offset, NOT as `dwAmmoIndex`.
  // TODO(asm-ambiguous): resolve what `*[this+0x80]` is (m_pAmmoDef?
  // m_pWeaponInfo?) and what *(*it + 0x208) returns. The TS previously
  // called it `ammoSlot`/`dwAmmoIndex` — that's a misread.
  const ammoArg   = this.field_0x80_deref_deref_0x208(); // FIXME: model the triple-deref
  const weaponAnim = this.m_iGrenadeAnimIndex;    // uint16 at +0x978
  const msg        = (globalGOT as any).engineMessages;     // GOT+0x1aa8
  const buf        = (globalGOT as any).messageBuffer;      // GOT+0x1888

  msg.dispatch(
    /* dest       */ 1,
    /* ammoArg    */ ammoArg,
    /* weaponAnim */ weaponAnim,
    /* ? */ 0,
    /* buf        */ buf, buf,
    /* ?          */ 0, 0,
    /* msg-type   */ 0x13,
    /* ?          */ 0, 0, 0
  );

  // ---- mark player as having a grenade in flight ------------------------
  player.m_bGrenadeInFlight = 1;                  // player+0x8

  // ---- schedule post-throw timing windows -------------------------------
  // m_flTimeWeaponIdle (+0xa0) and m_flNextAttack (+0x9c) are both set
  // to the SAME value: UTIL_WeaponTimeBase() + [GOT-0x6de48]. m_flNextReload
  // (+0xa8) is reset to the same expression but with a FRESH
  // UTIL_WeaponTimeBase() call (a second `@plt` invocation at 0x733c1).
  // [GOT-0x6de48] is a small float/double constant (likely 0.1–0.3 s —
  // a "post-throw idle" delay).
  const postThrowDelay = (globalGOT as any).grenadePostThrowDelay; // GOT-0x6de48
  const nextFire       = UTIL_WeaponTimeBase() + postThrowDelay;
  this.m_flTimeWeaponIdle = nextFire;             // +0xa0
  this.m_flNextAttack    = nextFire;              // +0x9c
  this.m_flNextReload    = UTIL_WeaponTimeBase() + postThrowDelay; // +0xa8

  // ---- bump the per-throw "cook" accumulator ----------------------------
  // *(this + 0xa0c) = (*(GOT[0x1600])) + (GOT-0x6e818).
  // GOT[0x1600] dereferenced is the engine-side time pointer
  // (almost certainly gpGlobals->time); GOT-0x6e818 is another
  // float constant (the "cook step" / per-throw damage ramp).
  // NOTE: asm dereferences unconditionally — no null check. The TS
  // should not add `?? 0` fallbacks here unless we want behavior to
  // diverge from the original.
  // TODO(asm-ambiguous): name this field properly. "cook" is a working
  // hypothesis based on grenade semantics; could also be aim damping,
  // pull-pin timer, etc.
  const gpTime   = (globalGOT as any).gpGlobals_deref_time;   // *(*GOT[0x1600])
  const cookStep = (globalGOT as any).grenadeCookStep;        // GOT-0x6e818
  this.m_flGrenadeCook = gpTime + cookStep;       // +0xa0c
}

// External call targets assumed declared elsewhere in the project:
//   - UTIL_WeaponTimeBase(): () => number     // returns gpGlobals->time
//   - CTSGun, CBasePlayer, etc. structs (this + helpers)
//   - globalGOT: { [key: string]: any }       // PIC-offset globals map
```

Quick note on items not flagged: every early-return guard, the
ammo-consume virtual call (incl. arg order), the 12-arg broadcast
(incl. arg order), the in-flight flag set, the two timer assignments
(including the fact that +0xa0 and +0x9c share a value while +0xa8
gets a fresh timebase), and the final accumulator store all match the
disassembly. The substantive concern is Issue A; Issues B and C are
style/honesty nits worth fixing before this lands as the D.4 baseline
for GrenadeFire.
