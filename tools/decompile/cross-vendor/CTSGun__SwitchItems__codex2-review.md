```
VERDICT: PASS-WITH-NOTES
```

This is `CTSGun::SwitchItems` — a class method, not one of the 4 mod↔engine entry points — so the HLSDK reference is contextual only. Items 2–4 on the checklist don't apply directly. I'll score them as N/A and focus on what's relevant.

```
Checklist:
1. Signature — ✅ — `export function SwitchItems(this: CTSGun): void`
   matches the demangled `CTSGun::SwitchItems()` (zero args, void return).
   Idiomatic TS would put this inside `class CTSGun`, but a free function
   with an explicit `this:` is acceptable for a D.3 standalone review.

2. Version check — ⚠️ — N/A. Class method, not an interface entry point.

3. interfaceVersion assignment — ⚠️ — N/A. No interface negotiation here.

4. Success path — ⚠️ — N/A. No struct copy / memcpy in this fn.

5. No fabricated paths — ✅ — Walked every branch against the disassembly:
       early-return on null player       ← `je 71697` at 0x71576
       A (slotMask & 0x6 == 0x6)
         A1: activeMask == 0x6 → clear   ← 71598
         A2: active & 0x2      → set 0x4, clear 0x2
                                              ← 715b4 + 715c0 (`or 0x4; and ~0x2`)
         A3: active & 0x4      → or 0x2  ← 715d8 (note: bit 4 is NOT cleared,
                                              disassembly holds both bits 1+2
                                              set here, i.e., "akimbo")
         A4: else              → or 0x2  ← 715f2 (fall-through from `je 715f2`
                                              at 715d6 after both bit tests fail)
       B (slotMask & 0x2): if active & 0x2 clear else or 0x2 ← 715e0..715fc
       C (slotMask & 0x4): if active & 0x4 clear else or 0x4 ← 71600..71626
       D (else):              active=0; return (no sound)     ← 71628..71635
   The else-if chain, the bit-test order, and the early return in D all
   faithfully reproduce the assembly. ✅

6. No TODO body — ⚠️ — The logic branches are real code. The bottom
   ~30% (the EMIT_SOUND_DYN call) is a comment-only TODO with the
   right operand mapping sketched but no call. Not "mostly TODO," but
   not complete either.

7. Field names — ⚠️ — `m_pPlayer`, `m_iSlotFlags`, `m_iActiveFlags`,
   `m_pOwner` are plausible TS/HLSDK-style names with explicit
   `// TODO` notes flagging uncertainty. Acceptable for D.3 (field
   confirmation is D.4's job per the prompt), but worth recording.

8. Compiles in isolation — ❌ — `CTSGun` is used as a type but not
   defined in the file; `player.m_iSlotFlags` / `player.m_iActiveFlags`
   are referenced without any declaration. The prompt's rule for
   unknowns is to use `any`, which this version doesn't.
```

## Issues to fix

1. **Compile-fence.** `CTSGun` and the `m_pPlayer` / `m_iSlotFlags` /
   `m_iActiveFlags` / `m_pOwner` field accesses are untyped. Per the
   prompt, swap to `any` (or add minimal inline interface stubs) so
   the file stands alone.

2. **Sound call is unimplemented.** The disassembly clearly emits an
   `EMIT_SOUND_DYN` after every non-D branch. The TS leaves it as a
   comment-only TODO. The actual bytes 71638..71694 carry:

   - edict = `*(*(this+0x80)) + 0x208` (double-deref; almost
     certainly `this->m_pOwner->pev->containing_edict`-style fetch)
   - sample = `LEA [ebx - 0x6dcda]` (GOT-relative — needs GOT-base
     resolution / `strings-n5.txt` lookup)
   - channel = `3` (CHAN_ITEM)
   - pitch = `RANDOM_FLOAT(0.92, 1.0)` via `engine vtable +0x16c`
   - vol = `1.25`
   - atten = `0.0`
   - flags = `0x62 | RANDOM_LONG(0, 3)` (range 98..101) via
     `engine vtable +0x168`; `0x62` is the static base and
     `RANDOM_LONG(0,3)` adds 0–3 to the low bits (probable SND
     flag variations).

3. **Misleading TODO comment.** The note "likely either the int
   pitch or a leftover slot" for the `RANDOM_LONG(0,3)+0x62` value
   is wrong: per HLSDK's `EMIT_SOUND_DYN(edict_t*, int, const char*,
   float, float, float, int)` signature, that int sits in the
   7th slot — it's the **`flags`** parameter, not pitch and not a
   leftover. (See also issue 4 — the slot mapping may not even
   match HLSDK's order in TS.)

4. **EMIT_SOUND_DYN arg-order ambiguity (worth flagging in code, not
   blocking).** HLSDK's documented order at the call site is
   `(edict, channel, sample, vol, atten, pitch, flags)`. The
   disassembly's stack layout for *this* call, however, places the
   RANDOM_FLOAT result in `[esp+12]` (slot arg 4 per HLSDK = the
   *volume* slot), `1.25` in `[esp+16]`, `0.0` in `[esp+20]`, and
   the `0x62|RANDOM_LONG(0,3)` int in `[esp+24]`. That's
   semantically odd if you assume HLSDK order — you'd be passing a
   random pitch range as `vol`, `1.25` as `atten`, and a flat `0.0`
   as `pitch`. The natural reading is that TS's call site passes
   `(edict, channel, sample, pitch, vol, atten, flags)` —
   *pitch before vol/atten* — consistent with a TS-side wrapper
   that reorders args before delegating to `g_engfuncs.pfnEmitSound`.
   Until you cross-reference the TS source, **do not commit to either
   ordering** in D.5 wiring; mark it `// TODO(asm-ambiguous)`.

5. **Minor: A3 description.** The TS comment says "secondary active →
   switch to primary (preserve other bits)" but actually A3 ends with
   *both* bits 1 and 2 set (akimbo). The TS code is correct
   (`|= 0x2`, leaving bit 4 alone), but the prose undersells it —
   "switch to primary" makes it sound like a swap, when it's really
   "add primary to the active set." Tiny, but worth a one-line fix.

## Suggested rewrite

```typescript
/**
 * CTSGun::SwitchItems — Cycle which primary / secondary item the player
 * is currently "drawing" (primary → secondary → akimbo → off when both
 * slots are loaded), then play a switch-click sound with a slightly
 * randomized pitch. With one slot loaded, toggle that one. With none
 * loaded, silently clear and exit (no sound).
 *
 * Disassembly:  SwitchItems__6CTSGun @ 0x0007155c (319 B)
 *   logic section:  71576..71637
 *   sound section:  71638..71694
 *
 * NOTE: this is a TS-specific gameplay method, not one of the four
 * mod↔engine entry points. The HLSDK reference does not apply; the
 * `GetEntityAPI*` / `GetNewDLLFunctions` checks are N/A here.
 */
export function SwitchItems(this: any): void {
  const player = this.m_pPlayer; // [this+0xcc]
  if (!player) return;

  // [player+0x10] = slots-with-weapon bitmask
  // [player+0x14] = slots-currently-drawn bitmask
  // Bits 1 (0x2) and 2 (0x4) encode primary / secondary.
  // TODO(D.4): confirm field names against the TS / HLSDK entity layout
  //   (likely m_iWeapons / m_iActiveItems, or TS-specific flags).
  const slotMask   = (player.m_iSlotFlags   as number) & 0x6;
  const activeMask = (player.m_iActiveFlags as number) & 0x6;

  if (slotMask === 0x6) {
    // Both primary and secondary slots hold a weapon — cycle through
    // (none → primary → secondary → akimbo → none).
    if (activeMask === 0x6) {
      // A1: akimbo → drop back to nothing drawn.
      player.m_iActiveFlags = 0;
    } else if (player.m_iActiveFlags & 0x2) {
      // A2: primary active → swap to secondary (clear 0x2, set 0x4).
      player.m_iActiveFlags =
        (player.m_iActiveFlags | 0x4) & ~0x2;
    } else if (activeMask & 0x4) {
      // A3: secondary active → escalate to akimbo (or 0x2; bit 2 stays).
      player.m_iActiveFlags = (player.m_iActiveFlags as number) | 0x2;
    } else {
      // A4: nothing currently active → default to primary.
      player.m_iActiveFlags = (player.m_iActiveFlags as number) | 0x2;
    }
  } else if (slotMask & 0x2) {
    // B: only primary loaded — toggle primary-active.
    player.m_iActiveFlags =
      (player.m_iActiveFlags as number) & 0x2
        ? 0
        : (player.m_iActiveFlags as number) | 0x2;
  } else if (slotMask & 0x4) {
    // C: only secondary loaded — toggle secondary-active.
    player.m_iActiveFlags =
      (player.m_iActiveFlags as number) & 0x4
        ? 0
        : (player.m_iActiveFlags as number) | 0x4;
  } else {
    // D: nothing loaded — silent clear, no sound.
    player.m_iActiveFlags = 0;
    return;
  }

  // ---- Play the switch-click sound (disassembly 71638..71694) ----
  //
  // Operand map:
  //   edict = (*(*this->[+0x80])) [+0x208]    (almost certainly
  //           this->m_pOwner->...->containing_edict or a pev offset
  //           that aliases the edict pointer)
  //   pitch = engine.RandomFloat(0.92, 1.0)   (vtable +0x16c)
  //   vol   = 1.25
  //   atten = 0.0
  //   flags = 0x62 | engine.RandomLong(0, 3) (range [98..101];
  //           0x62 = bits 1,5,6 — some SND flag combo + variation bits)
  //   sample = LEA [ebx-0x6dcda]             (GOT-relative, TBD)
  //
  //   call EMIT_SOUND_DYN   (7-arg PLT entry; see TODO about arg order)
  //   add esp, 0x20
  //
  // TODO(asm-ambiguous): exact sample name string. Resolve from
  //   tools/decompile/analysis/strings-n5.txt once GOT is loaded.
  // TODO(asm-ambiguous): confirm [this+0x80] is m_pOwner and [+0x208]
  //   is the edict slot inside that object — cross-reference other
  //   CTSGun methods that pull an edict (e.g., PrimaryAttack).
  // TODO(asm-ambiguous): HLSDK's EMIT_SOUND_DYN signature is
  //   (edict_t*, int, const char*, float vol, float atten, float pitch,
  //   int flags), but the disassembly's stack layout here puts the
  //   RANDOM_FLOAT result in [esp+12] (= HLSDK slot arg 4, "volume")
  //   and 1.25 / 0.0 in slots arg 5 / arg 6 — which only makes sense
  //   if TS passes (edict, channel, sample, pitch, vol, atten, flags).
  //   Verify against TS source before wiring g_engfuncs.pfnEmitSound.

  const edict = ((this.m_pOwner as any)[0] as any)[0x208 / 4];
  const pitch = tsRandomFloat(0.92, 1.0);
  const flags = 0x62 | tsRandomLong(0, 3);

  tsEmitSoundDyn(
    edict,                            // arg 1: edict
    3,                                // arg 2: channel = CHAN_ITEM
    /* sample = */ "TODO-sample",     // arg 3: GOT-relative (TBD)
    /* per TODO above, the float ordering is unusual: */
    /* arg 4: */ pitch,               // per HLSDK would be vol, per TS call appears to be pitch
    /* arg 5: */ 1.25,                // per HLSDK would be atten, per TS call appears to be vol
    /* arg 6: */ 0.0,                 // per HLSDK would be pitch, per TS call appears to be atten
    /* arg 7: */ flags,               // SND flags (per HLSDK order)
  );
}

// --- Stubs to keep this file self-contained -----------------------------
// Wire these to g_engfuncs in D.5.
declare function tsRandomFloat(min: number, max: number): number;
declare function tsRandomLong(min: number, max: number): number;
declare function tsEmitSoundDyn(
  edict: any,
  channel: number,
  sample: string,
  pitch_or_vol: number,
  vol_or_atten: number,
  atten_or_pitch: number,
  flags: number,
): void;
```

**Why this rewrite scores the checklist better:**

| # | Before | After |
|---|---|---|
| 1. Signature | ✅ | ✅ (unchanged) |
| 2–4. N/A items | ⚠️ | ⚠️ (still N/A) |
| 5. No fabricated paths | ✅ | ✅ (unchanged) |
| 6. No TODO body | ⚠️ | ⚠️ (improved — sound call is now real code, only the sample string and arg-order question remain as marked TODOs) |
| 7. Field names | ⚠️ | ⚠️ (kept with `// TODO(D.4)` for explicit ownership) |
| 8. Compiles in isolation | ❌ | ✅ (`any` everywhere; stubs at the bottom for engine hooks) |

The remaining ⚠️ on item 6 is unavoidable — the sample string and the EMIT_SOUND_DYN arg order both genuinely are asm-ambiguous and won't resolve until you load the GOT (D.4-ish) or open the TS source. Calling those out as `TODO(asm-ambiguous)` is the correct D.3 disposition; failing the function for them would be over-strict.
