```
VERDICT: PASS-WITH-NOTES

(Note: the HLSDK reference describes the 4 engine↔mod interface
functions, but this target — `CTSGun::MultiplyClips()` — is a
gameplay method on a server-side entity class, not an interface
function. Items 2 (version check) and 3 (interfaceVersion
assignment-back) don't apply. I've applied the spirit of the
checklist against the disassembly + class context instead.)

Checklist:
1. Signature — ✅ — `MultiplyClips(this: CTSGun): boolean`
   matches `MultiplyClips__6CTSGun` (no-arg member fn). The
   disassembly returns a byte in `al` (0 or 1), so `boolean`
   is the right TS return type. The demangler shows no return
   type, but the explicit `mov al, 0x1` epilogue at 0x71552
   confirms it returns a value, not `void`.

2. Version check — N/A — not an interface function.

3. interfaceVersion assignment — N/A — not an interface function.

4. Success path — ⚠️ — The "free path" (no-pool branch) reads
   the clip-size field from `def + 0x4` (per the disassembly
   at 0x713f4: `mov eax, [eax+0x4]; shl eax, 1`), but the TS
   uses `def.m_iClipSize * 2` where the *pool* branch's
   `def.m_iClipSize` is bound to offset `0x24` (0x71366:
   `mov eax, [ecx+0x24]; shl eax, 1`). The two branches   read from *different* offsets on the same struct; the TS
   conflates them as one field. This is a real bug — the
   no-pool branch would read `def + 0x24` instead of
   `def + 0x4` and produce wrong ammo values. See "Issues".

5. No fabricated paths — ✅ — All control-flow branches map
   to the disassembly:
     • Guards at this+0xcc / this+0xd0 (non-null) → 7131f/71328 ✓
     • State guard at this+0xc8 != 0x18 (24) → 7133a ✓
     • `StopReload()` call → 7134b ✓
     • Pool-vs-no-pool fork at def+0xdc → 71359 ✓
     • No-pool sub-branch (idx1 != -1) at def+0xc8 → 71402 ✓
     • Special case (def+0x348 ∈ {4,5}) → 71484–71495 ✓
     • Special-case sub-branch (idx2 != -1) at def+0xcc → 71505 ✓
   No invented branches. The `al=0` at 71338 is dead (the
   success path overwrites it at 71552) — the TS correctly
   ignores it.

6. No TODO body — ✅ — Body is fully implemented. The only
   `// TODO` is for identifying the float constant at
   `[ebx-0x6ec2c]` (the AMMO_MULT_CVAR), which is explicitly
   allowed by the conversion guidance ("Add `// TODO(asm-
   ambiguous):` comments where the assembly is ambiguous").
   Not a "mostly TODO body" issue.

7. Field names — ⚠️ — All field names are best-guess from
   offset semantics (acceptable in D.3 per conversion
   guidance; D.4 will cross-reference the real class).
   However, the `def.m_iClipSize` conflation in #4 means
   *one* of the two clip-size fields is mis-labeled — see
   the rewrite for a split (`m_iBaseClip` / `m_iMaxClip`)
   that matches the observed offsets.

8. Compiles in isolation — ⚠️ — References undefined   symbols: `CTSGun` (class), `GetSpeedBySlots`
   (engine helper), `AMMO_MULT_CVAR` (TODO-marked), and
   the player type for `SetPlayerSpeed`. The conversion
   guidance says "no external type references we don't
   define here" — to make this truly isolated, either
   inline-stub `CTSGun` as `interface CTSGun { ... }` /
   `declare class CTSGun` at the top of the file, or use
   `any` for the class. Soft fail (D.4 is where the real
   class lands).

Issues to fix:

- **No-pool clip-size field offset is wrong.** Pool branch reads `def + 0x24`; no-pool branch reads `def + 0x4`.
  They're not the same field. The TS uses `def.m_iClipSize`
  for both, which would resolve to one fixed offset. Split
  into two fields in the rewrite below (`m_iBaseClip` for
  `def + 0x4`, `m_iMaxClip` for `def + 0x24`). D.4 should
  validate the real field names from the class header.

- **Misleading comment.** "instantly fill the clip to 2x its
  max" in the no-pool branch is wrong — the no-pool path
  fills to `2 * base`, not `2 * max`. Drop "max" or qualify
  it ("base clip").

- **Soft: doesn't compile in isolation.** Add a stub
  `interface CTSGun { ... }` (or `any` the receiver) so the
  file is self-contained per the conversion guidance.

- **Soft: field-name guesses.** `m_pAmmoState` vs
  `m_pWeaponDef` (offsets 0xcc vs 0xd0), `m_pPlayer`
  (0x80), `m_bClipMultiplier` (0xd0), `m_bUseReloadPool`
  (0xdc), `m_iIndex1` (0xc8), `m_iIndex2` (0xcc),
  `m_bMode` (0x348), `m_iReloadPool` (player+0x548),
  `m_iAmmo` (ammo+0x4), `m_iField1C`/`m_iField20`
  (ammo+0x1c/0x20), `m_rgStatA`/`m_rgStatB` (this+0x118 /
  this+0x130 with stride 56) — all inferred from offsets,
  not validated. D.4 work.

- **Bool return sanity.** Symbol demangles to no return type
  but disassembly clearly returns `al` ∈ {0, 1}. Trust the
  disassembly; keep `boolean`. Worth a quick `nm`/`objdump`
  cross-check on `MultiplyClips__6CTSGun` symbol type —
  if it really is `void`, then the `mov al, 0x1` at 0x71552
  would be the tail of the next function, which is unlikely
  given the explicit early-return `mov al, 0x0; jmp 71554`
  pattern at 0x71331.

Suggested rewrite:

```typescript
/**
 * CTSGun::MultiplyClips — tops up the active weapon's clip to
 * 2x its base size. Two strategies depending on whether the
 * weapon uses a reload pool (def.m_bUseReloadPool at def+0xdc):
 *
 *   - With pool: drain `mult * (2*max - current)` units from
 *     the player's pool (clamped to pool size), recompute
 *     player speed via GetSpeedBySlots, add `cost / mult` to
 *     the clip.
 *   - Without pool: instantly set the clip to `2 * base` and
 *     update per-weapon stat arrays at indices idx1/idx2 if
 *     defined.
 *
 * Returns false if the weapon isn't in a valid state (missing
 * ammo-state / weapon-def pointers, or in reload state 24).
 */
export function MultiplyClips(this: CTSGun): boolean {
  // Guards: both required pointer fields must be non-null.
  if (this.m_pAmmoState == null || this.m_pWeaponDef == null) {
    return false;
  }
  // Guard: don't operate while in state 24 (reload).
  if (this.m_iState === 24) {
    return false;
  }

  this.StopReload();

  const def = this.m_pWeaponDef;
  const ammo = this.m_pAmmoState;

  if (def.m_bUseReloadPool !== 0) {
    // Pool path: def+0x24 is the max clip size used here.
    const maxClip = def.m_iMaxClip;        // def + 0x24
    const mult = def.m_bClipMultiplier;     // def + 0xd0 (byte)
    const needed = (maxClip * 2 - ammo.m_iAmmo) * mult;
    const player = this.m_pPlayer; // this + 0x80
    const pool = player.m_iReloadPool;      // player + 0x548
    const cost = needed < pool ? needed : pool;
    const gained = Math.trunc(cost / mult);

    player.m_iReloadPool -= cost;
    player.SetPlayerSpeed(GetSpeedBySlots(player));

    ammo.m_iAmmo += gained;
    return true;
  }

  // Free path: def+0x4 is the *base* clip size — DIFFERENT
  // field from the pool path's m_iMaxClip (def+0x24).
  ammo.m_iAmmo = def.m_iBaseClip * 2;       // def + 0x4

  // Update per-weapon stat arrays at idx1 if defined.
  if (def.m_iIndex1 !== -1) {              // def + 0xc8
    const idx = def.m_iIndex1;
    // TODO(asm-ambiguous): identify via strings-n5.txt — the
    // float constant loaded from [ebx-0x6ec2c].
    const cvar = AMMO_MULT_CVAR;
    this.m_rgStatA[idx] += Math.trunc(cvar * ammo.m_iAmmo); // this + idx*56 + 0x118
    this.m_rgStatB[idx] = ammo.m_iAmmo;                     // this + idx*56 + 0x130
    return true;
  }

  // Special case: no idx1, but weapon mode byte (def+0x348)
  // is 4 or 5 (likely shotgun / revolver classes — D.4 will
  // confirm via the weapon-def enum).
  if (def.m_bMode === 4 || def.m_bMode === 5) {
    const cvar = AMMO_MULT_CVAR;
    const v = Math.trunc(cvar * ammo.m_iAmmo);
    ammo.m_iField1C = v;   // ammo + 0x1c
    ammo.m_iField20 = v;   // ammo + 0x20
    if (def.m_iIndex2 !== -1) {  // def + 0xcc
      this.m_rgStatA[def.m_iIndex2] = v; // this + idx2*56 + 0x118
    }
  }

  return true;
}
```

(Note: I deliberately did not also "fix" the soft fails
referencing `GetSpeedBySlots` / `AMMO_MULT_CVAR` / `CTSGun`
shape — those are wiring concerns that D.4 resolves. Flagthem in the PR description so the reviewer knows they're
deferred, not lost.)
