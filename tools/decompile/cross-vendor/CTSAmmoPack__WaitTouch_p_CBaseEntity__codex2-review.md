```
VERDICT: FAIL

Checklist:
1. Signature — ✅ — `WaitTouch(this: CTSAmmoPack, pOther: CBaseEntity): void`
   matches the demangled `CTSAmmoPack::WaitTouch(p CBaseEntity)`. (Note:
   this is a gameplay method, not one of the 4 engine↔mod interface
   functions the rest of the checklist is built for; items 2–4 are N/A
   and are omitted below.)

2. Version check — N/A — `WaitTouch` is not a `GetEntityAPI*` /
   `GetNewDLLFunctions` candidate.

3. `*interfaceVersion` assignment-back — N/A.

4. Success-path struct copy — N/A.

5. No fabricated code paths — ❌ — Critical misread at stages 5 and 6:
   the disassembly dereferences `this` (the pack), but the TS
   dereferences `pOther` (the toucher) for the pack's armor value. See
   the issues list for the exact instruction sites.

6. No TODO body — ✅ — The body is fully expressed in code; the
   `// TODO(asm-ambiguous):` notes are real ambiguity flags (the
   `[pOther+0x60]` callback table, the `*pOther+0x208` edict, the
   `*pOther+0x180` frozen-bit). They do not displace any logic.

7. Field names — ⚠️ — `innerPtr` / `innerPtr2` are generic and
   indistinguishable. The `+0x60` slot table, `+0x180` frozen byte,
   `+0x1bc` armor value, `+0x208` edict, and `+0xa10` active-item
   pointer are real engine fields and should be named (e.g.,
   `pOther->pev`, `this->m_iArmorToGive`) once the binding layer
   defines them. The "junk8th stack slot" comment is wrong — the
   demangled type for EMIT_SOUND_DYN's 8th arg is `f` (float), not
   "junk".

8. Compiles in isolation — ✅ — All externals are declared
   (`readDWord`, `readFloat`, `readByte`, `callIndirect`, `AddAmmo`,
   `EMIT_SOUND_DYN`, `TakeArmor`, `UTIL_Remove`, plus the `GOT_BASE`
   placeholder).

Issues to fix:

- **[stage 5 — first compare, 0x91874..0x91880] Dereference is `*this`,
  not `*pOther`.** The disassembly reads `[esp+0x30]` (= `this`),
  dereferences once to `ecx = *this`, and compares the cvar with
  `[ecx+0x1bc]` — i.e. the **pack's** armor value, not the toucher's.
  The TS uses `innerPtr2 = readDWord(pOther)`, so it compares the cvar
  with the *toucher's* armor. The flag check at 0x91891 (which reads
  `[*pOther+0x180] & 0x20`) and the second compare at 0x9189a (which
  reads `[*pOther+0x1bc]`) **do** correctly use `pOther` — so the
  disassembly mixes both entities across stages 5–6, and the TS
  silently collapses them to `pOther`. Introduce a separate
  `thisInner` / `pOtherInner` pair.

- **[stage 5 — `fistp` source, 0x918ae..0x918d7] Truncate `*this+0x1bc`,
  not the cvar.** `fld [eax+0x1bc]` where `eax = *this`, then
  `fistp` to int. That's the pack's armor, not the threshold. The
  amount passed to `TakeArmor` is therefore the pack's armor. The
  TS uses `Math.trunc(armorCvar)` — semantically wrong.

- **[stage 5 — zero-write, 0x918e5..0x918eb] Write to `*this+0x1bc`,
  not `*pOther+0x1bc`.** Same `this` vs `pOther` confusion. The TS
  zeroes the toucher's armor instead of the pack's.

- **[stage 6 — post-check, 0x918fc..0x91908] Dereference is `*this`,
  not `*pOther`.** Same bug as the first compare. The comparison
  decides whether to call `UTIL_Remove(this)`, and the answer depends
  on whether the *pack's* armor is now equal to the cvar (typically
  after the pack's armor was zeroed in stage 5).

- **[stage 4 — 8th arg to `EMIT_SOUND_DYN`] Read as `float`, not
  dword.** Demangled signature
  `EMIT_SOUND_DYN__FP7edict_siPCcffiif` → last arg is `f`. The TS
  uses `readDWord(GOT - 0x6ec2c)` and the misleading comment
  "junk8th stack slot"; both are wrong.

- **[stage 5 — 0x918a5 `jne` polarity] The TS inner condition
  `if (curArmor !== armorCvar)` is actually correct**, but only by
  accident: `jne` after `test ah, 0x40` jumps when `C3=1` (i.e. when
  cvar == *pOther+0x1bc), so the equal-branch goes to 0x918fc and
  the not-equal branch falls through to 0x918ab (the transfer). The
  TS's "not equal → transfer" matches, but the comment "Re-check
  exact equality" is misleading because the operand is the *toucher's*
  armor (pOther's), not the *pack's*.

- **[naming]** `innerPtr2` is reused for both the toucher deref (flag
  check, inner compare — correct) and the pack deref (first compare,
  truncate, zero-write, post-check — wrong). Two distinct locals make
  the bug class impossible.

Suggested rewrite (full TS function):

```typescript
/**
 * CTSAmmoPack::WaitTouch — wait-for-touch handler for the ammo pack.
 *
 * Decompiled from `WaitTouch__11CTSAmmoPackP11CBaseEntity` at
 * ts/dlls/ts_i386.so+0x000916c0 (620 bytes).
 *
 * Two-stage sanity check on the toucher (calls into
 * [pOther+0x60]+0xc8 and [pOther+0x60]+0xb4, passing pOther as the
 * explicit first arg — most likely a TS-specific callback table or a
 * sub-object's vtable). Then verifies the toucher's active weapon
 * (`[pOther+0xa10]`, the CBasePlayer::m_pActiveItem) has class id
 * 0x10. Iterates 16 ammo slots (4 outer × 4 inner) and calls AddAmmo
 * on each non-zero slot; on success, zeros the slot and sets a "gave
 * ammo" flag. If any ammo was given, emits a pickup sound on the
 * toucher. Then does a cvar-driven armor transfer: compares the cvar
 * at GOT-0x6f408 with the **pack's** armor at `*this+0x1bc`, checks
 * the toucher's frozen bit at `*pOther+0x180 & 0x20`, re-checks that
 * the cvar doesn't already match the **toucher's** armor, and
 * transfers the pack's armor (truncated to int) to the toucher via
 * TakeArmor, zeroing the pack's armor afterwards. Finally, if the
 * cvar now equals the pack's armor (typically both 0), UTIL_Remove
 * the pack.
 *
 * @param this   The CTSAmmoPack entity
 * @param pOther The entity that touched the pack
 * @returns      void
 */
export function WaitTouch(this: CTSAmmoPack, pOther: CBaseEntity): void {
  // PIC/GOT base in EBX (from `call $+5; pop ebx; add ebx, GOT`).
  // All [ebx-...] reads below resolve globals / cvars through this base.
  const GOT = 0; // TODO: real GOT base is computed at run-time

  // The function is __cdecl; after the prologue `this` is at
  // [esp+0x30] and pOther is at [esp+0x34].

  // -------------------------------------------------------------------
  // Stage 1 — validity checks on the toucher
  // -------------------------------------------------------------------
  // [pOther+0x60] is a function-pointer table (or a sub-object whose
  // vtable we use); +0xc8 and +0xb4 are called with pOther as the
  // explicit first arg. Both must return non-zero to continue.
  const cbTable: any = readDWord(pOther + 0x60);
  if (callIndirect(readDWord(cbTable + 0xc8), pOther) === 0) return;
  if (callIndirect(readDWord(cbTable + 0xb4), pOther) === 0) return;

  // -------------------------------------------------------------------
  // Stage 2 — verify active weapon and class id
  // -------------------------------------------------------------------
  const weapon = readDWord(pOther + 0xa10); // m_pActiveItem
  if (weapon === 0) return;
  if (readDWord(weapon + 0x88) !== 0x10) return; // weapon class id

  // -------------------------------------------------------------------
  // Stage 3 — iterate 16 ammo slots and AddAmmo each non-zero one
  // -------------------------------------------------------------------
  // Slots live on `this` starting at this+0x60 (4 outer × 4 inner,
  // stride 0x10 per group, 4 bytes per slot). The loop counter's
  // low byte is the ammo type index.
  let anyAdded = false;
  let counter = 0;
  for (let outer = 0; outer < 4; outer++) {
    const slotBase = this + 0x60 + outer * 0x10;
    for (let inner = 0; inner < 4; inner++) {
      const slotAddr = slotBase + 0x4 + inner * 4;
      const count = readDWord(slotAddr);
      if (count === 0) continue;
      const ammoType = (counter + inner) & 0xff;
      if (AddAmmo(weapon, ammoType, count) !== 0) {
        anyAdded = true;
        writeDWord(slotAddr, 0);
      }
    }
    counter += 4;
  }

  // -------------------------------------------------------------------
  // Stage 4 — play pickup sound if we gave any ammo
  // -------------------------------------------------------------------
  if (anyAdded) {
    // [*pOther + 0x208] is the edict — most likely *pOther == pev and
    // pev+0x208 is the edict handle, but the exact mapping is
    // engine-version dependent.
    const edict = readDWord(readDWord(pOther) + 0x208);
    EMIT_SOUND_DYN(
      edict,                          // entity
      3,                              // CHAN_VOICE
      readStringPtr(GOT - 0x6c8da),   // sample name (string literal)
      readFloat(GOT - 0x6f3fc),       // volume (cvar)
      readFloat(GOT - 0x6e7e4),       // attenuation (cvar)
      0,                              // flags
      100,                            // pitch
      readFloat(GOT - 0x6ec2c)        // 8th arg is `f` per demangling
    );
  }

  // -------------------------------------------------------------------
  // Stage 5 — armor transfer (cvar-driven, with FL_FROZEN-style check)
  // -------------------------------------------------------------------
  // First compare: cvar vs PACK's armor [*this + 0x1bc] (read as float).
  // Flag check:   *pOther + 0x180 bit 0x20 (FL_FROZEN-style).
  // Second compare: cvar vs TOUCHER's armor [*pOther + 0x1bc].
  // Transfer:    TakeArmor(pOther, trunc(PACK's armor)); PACK's armor = 0.
  //
  // NOTE: stages 5 and 6 mix `*this` (pack) and `*pOther` (toucher)
  // dereferences. The original TS collapsed both to `*pOther`; this
  // rewrite keeps them distinct.
  const thisInner = readDWord(this);
  const packArmor = readFloat(thisInner + 0x1bc);
  const armorCvar = readFloat(GOT - 0x6f408);

  if (armorCvar < packArmor) {
    const pOtherInner = readDWord(pOther);
    const frozen = (readByte(pOtherInner + 0x180) & 0x20) !== 0;
    if (!frozen) {
      // Second compare (0x9189a): cvar == toucheR's armor.
      // jne at 0x918a5 jumps on equal (C3=1 after `test ah,0x40`),
      // so equal → skip transfer, not-equal → fall through and transfer.
      const toucherArmor = readFloat(pOtherInner + 0x1bc);
      if (toucherArmor !== armorCvar) {
        // `fld [*this+0x1bc]; fistp` — amount is PACK's armor (truncated).
        const armorInt = Math.trunc(packArmor);
        TakeArmor(pOther, armorInt);
        writeDWord(thisInner + 0x1bc, 0); // zero the pack's armor
      }
    }
  }

  // -------------------------------------------------------------------
  // Stage 6 — remove the pack when cvar == pack's armor
  // -------------------------------------------------------------------
  // Re-compares the cvar with the **pack's** current armor; if they
  // match, the pack has nothing left to give, so UTIL_Remove it.
  const packArmor2 = readFloat(readDWord(this) + 0x1bc);
  if (armorCvar !== packArmor2) {
    // not equal → pack still useful → leave it
  } else {
    UTIL_Remove(this);
  }
}

// ---------------------------------------------------------------------------
// Helpers / engine types referenced above. These are stand-ins; the real
// definitions live in the engine-binding layer built in a later step.
// ---------------------------------------------------------------------------

declare const GOT_BASE: number;

declare function readDWord(addr: any): number;
declare function writeDWord(addr: any, value: number): void;
declare function readByte(addr: any): number;
declare function readFloat(addr: any): number;
declare function readStringPtr(addr: number): string;
declare function callIndirect(fnPtr: number, arg: any): number;

declare function AddAmmo(pItem: any, ammoType: number, count: number): number;
declare function EMIT_SOUND_DYN(
  entity: any,
  channel: number,
  sample: string,
  volume: number,
  attenuation: number,
  flags: number,
  pitch: number,
  eighthArg: number // float per demangled signature
): void;
declare function TakeArmor(player: any, amount: number): void;
declare function UTIL_Remove(entity: any): void;

interface CTSAmmoPack {
  // Slot counts at this+0x60+0x10*group+0x4*slot (4×4 = 16 ints).
  // m_iArmorToGive at *this+0x1bc (read as float; the "pack's armor").
}

interface CBaseEntity {
  // m_pActiveItem at +0xa10 (CBasePlayer-only)
  // callback table at +0x60
  // frozen bit at *pev+0x180 mask 0x20
  // toucheR's armor at *pev+0x1bc
  // edict at *pev+0x208
}
```

Key changes vs the original decompilation:

1. `const thisInner = readDWord(this);` introduced in stage 5; used for
   the first compare, the truncate source, and the zero-write.
2. `Math.trunc(packArmor)` (was `Math.trunc(armorCvar)`).
3. `writeDWord(thisInner + 0x1bc, 0)` (was `writeDWord(innerPtr2 + …)`).
4. The flag check + second compare use `pOtherInner`; the inner
   condition is `toucherArmor !== armorCvar` (was `curArmor !==
   armorCvar`, which happened to match the polarity but used the wrong
   value semantically — now it's named for what it is).
5. Stage 6 reads `*this+0x1bc` (was `*pOther+0x1bc` via `innerPtr2`).
6. EMIT_SOUND_DYN's 8th arg is `readFloat` (was `readDWord` +
   "junk" comment).
7. Added comment at the top of stage 5 explaining the two-entity
   dereference pattern, so the next reviewer doesn't fall into the
   same trap.
