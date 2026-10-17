Heads up before the verdict: this is `CTSStunt::CheckForBreakables`, a TS gameplay method, **not** one of the four HLSDK entry points in your reference (`GiveFnptrsToDll` / `GetEntityAPI*` / `GetNewDLLFunctions`). The HLSDK reference is provided for context only — its version-check / `interfaceVersion` patterns don't apply. The applicable spec for this review is the disassembly alone. I've noted which checklist items are N/A vs. adapted.

---

```
VERDICT: FAIL

Checklist:
1. Signature — ✅ pass — demangled symbol `CheckForBreakables__8CTSStunt` ⇒
   `CTSStunt::CheckForBreakables()`. TS declares `(this: CTSStunt): void`. No
   args, void return matches the asm prologue (no arg load before `[esp+0xc0]`
   = implicit `this`, no return-value setup at the end).

2. Version check — ⚠️ N/A-as-stated / pass-by-analogy — there is no
   `*interfaceVersion` on a method. The closest analog is the asm's leading
   cvar-equality recheck (see Issue 1 below). That recheck is present in
   both the asm and the TS, but is interpreted incorrectly — counted as a
   fail under Item 5.

3. interfaceVersion assignment — ⚠️ N/A — no engine contract here.

4. Success path — ⚠️ N/A — the analogous "copy struct / hand to caller"
   moment is `ApplyMultiDamage(pev, pev)` at 8c600; the TS has it ✅
   but with fabricated field names (see Item 7).

5. No fabricated paths — ❌ fail — three concrete branch-level errors
   (Issues 1, 2, 3 below) and several field-soup substitutions that
   invent names without an offset basis.

6. No TODO body — ✅ pass (skeleton) / ❌ fail (logic) — the function
   *body* isn't `// TODO`. But six of the inner lines themselves are
   speculative (frozenFlag, deadflag, bScreenPunchable, bScreenDirty,
   "v_forward re-sync" target, `0x4000000` kung-fu bit meaning). Those
   are invented, not TODO-marked. Strictly that's an Item 5/7 problem
   more than an Item 6 problem — see Issues 1, 4, 5, 7.

7. Field names — ❌ fail — many fields in the TS have no asm basis
   (`pev.frozenFlag`, `pev.deadflag`, `pev.bScreenPunchable`,
   `pev.bScreenDirty`, `globals.bKungfuActive`). The real asm reads
   are offset-based; the names are guessed.

8. Compiles in isolation — ❌ fail — references undefined symbols:
   `CTSStunt`, `globals`, `CBaseEntity`, `Vec3`, `engine`, `UTIL_*`,
   `EMIT_SOUND_DYN`, `DropWeapon`, `VictimKungfuHold/KatanaHold/
   KnifeHold`, `ClearMultiDamage`, `ApplyMultiDamage`, `PunchScreen`,
   `CVAR_*`, `computeReflectionPush`. Strict reading of the prompt
   says use `any` for unknowns; the TS does not.
```

---

### Issues to fix

1. **First `timeCheck` block is misread (lines ~1–12 of the TS).**
   Asm at 0x8bdb2–0x8bdf5:
   ```
   this = [esp+0xc0]
   fld [this+0x18]            ; some float field on CTSStunt
   fcom [ebx-0x6deb0]         ; cvar constant
   jne → epilogue              ; if not equal, return
   mov eax, [ebx+0x1600]
   mov edx, [eax]             ; loaded vec-of-floats
   fcomp [edx]                ; compare to edx[0]
   test ah,0x41 / je → exit
   mov eax,[edx]; mov [this+0x18], eax   ; sync back first dword of that vector
   ```
   This is **not** "re-sync on first invocation per tick"; it's a
   per-tick **equality check against a cvar**, with a sync-back of
   `[gvars+0x1600][0]` into `this+0x18` on the success path. The TS's
   "globals.v_forward.x" target is an unsupported guess. Drop the
   fabricated `globals.v_forward.x` assignment.

2. **Held-time branch direction is swapped.** Asm at 0x8be78–0x8be8f:
   ```
   fldz; fcomp [player+0x79c]  ; 0 vs player.flBreakableHeldTime
   test ah,0x40
   jne  0x8bf30                ; == 0 → jump
   ```
   `0x8bf30` is the **velocity** computation path (loads `pev+0x20`,
   normalizes). The fall-through at `0x8be95` is the **MakeVectors /
   v_angle** path. So:
   - `flBreakableHeldTime == 0` → use velocity direction
   - `flBreakableHeldTime != 0` → use v_angle via MakeVectors
   
   The TS has the two branches flipped (`<= 0` → MakeVectors,
   `> 0` → velocity). This is the most concrete semantic bug in the
   rewrite. Also note the TS uses `<= 0` while the asm uses `== 0`
   against zero specifically — minor but real.

3. **"FL_FROZEN" check is on the wrong field/byte.** Asm at 0x8bdf0–
   0x8be1b:
   ```
   mov edx,[this+0x40]        ; this.player
   mov edx,[edx]              ; *(player) — pev or private-data header
   test BYTE PTR [edx+0x1a5],0x2   ; bit 1 of offset 0x1a5
   ```
   `pev.flags` (where `FL_FROZEN = 0x20` lives) is at a much smaller
   offset in `entvars_t`. Offset 0x1a5 is past `entvars_t` —
   it's a TS-private field on the player object (likely a custom
   "is frozen by stunt" bit, possibly `m_fFrozenByStunt` or
   similar). Replace `pev.flags & FL_FROZEN` with
   `MEM.byte(*player + 0x1a5) & 0x2` (or whatever the TS field name
   turns out to be — this needs D.4 to confirm).
   
   The accompanying `flBreakableHeldTime > 0` and `lastBreakableHit = null` paths are structurally correct ✅.

4. **`flDamage` collapses two distinct asm paths.**
   - At 0x8c0f1–0x8c11c, when *something* (likely a "did we just drop
     the weapon" branch) is non-null, the asm multiplies the speed by
     a cvar `[gvars-0x6ecd8]` and uses the result.
   - At 0x8c101–0x8c119 (else branch), it uses raw `speed` (sqrt
     result stored directly).
   - The TS collapses both to `speed * CVAR_DAMAGE_MULT` and a
     sentinel `0`. Restore the conditional multiplier.

5. **`LastBreakableHit` clear-and-update ordering near the end is OK,
   but `[ebx+0x1920] = 0` (the "bKungfuActive" global) is only
   cleared inside the `attackMode == ATTACK_KUNGFU` branch's setup.
   Asm 0x8c608–0x8c60e clears it on the *unconditional* exit path,
   every time. The TS clears it only inside the KUNGFU branch — and
   then ALSO sets it before the KUNGFU branch runs. Net effect is
   the same IF the only entry is via KUNGFU mode, but if KATANA/
   KNIFE modes also reach a partial-hit/apply-damage path that
   closes with bKungfuActive still set from a prior frame, the TS
   leaks the flag. Move the clear to the unconditional epilogue
   next to `lastBreakableHit = hitEnt`.

6. **`DropWeapon(hitEnt, -2)` has the wrong arg order / arity.**
   Asm 0x8c2a4–0x8c2b3 pushes three slots: an `[esp+0x10]` reload,
   `0xfffffffe`, then `ebp` (the hitEnt). The demangled
   `DropWeapon__11CBasePlayer10tsweapon_tf` is a member function of
   `CBasePlayer` taking a `tsweapon_t`. The `ebp` push is `this`
   (the player argument to a non-`this` member? unusual) **or** the
   arg is `hitEnt`. Either way, 2 explicit args can't be right when
   the asm pushes 3 slots pre-call.

7. **Field-name fabrication.** Replace each of the following with
   offset-based access until D.4 confirms the names:
   - `pev.frozenFlag` (asm: `*player+0x1a7` flag bit)
   - `pev.deadflag` (asm: `*player+0x118` byte ≥ 0 test)
   - `pev.bScreenPunchable` (asm: `pev+0xa10` ptr, non-null check)
   - `pev.bScreenDirty` (asm: `[pev+0xa10]+0xc8` byte, == 0 check)
   - `globals.bKungfuActive` (asm: `[gvars+0x1920]` byte, true)
   - `damageBits |= 0x4000000` — the asm does
     `[esp+0x8] = 0x4001080` on a different sub-branch
     (cmp `[player+0x7a4]` against 0 → set). It's not "kung fu
     extension" — it's a different selector.
   - `this.attackMode` / `ATTACK_KUNGFU|KATANA|KNIFE` — asm branches
     on `*[player]+0x7a4` (byte), with values 0, 1 (default
     fall-through after the KUNGFU block), and 2. That **is** a
     weapon/mode byte, but the field is on the player's pev-equivalent,
     not on `this` (the stunt). Verify before naming.

8. **`computeReflectionPush` doesn't exist in the asm.** The
   reflection-style push at 0x8c312–0x8c3c2 is open-coded: subtract
   two origins, normalize by length, fall back to `(0, 0, k)` if
   length is zero, scale by `[gvars-0x6ec2c]`, and store. The TS
   hides all of this behind a not-defined helper. Either inline it
   as written, or drop the helper.

9. **Generic-isolation compile.** Per the prompt, unknowns should be
   `any`. The TS uses concrete types (`Vec3`, `CBaseEntity`,
   `CTSStunt`, `engine.entityOfIndex`) and undefined helpers. Mark
   the whole file's external types as `any` until the type catalog
   from D.5 lands.

10. **Minor: `tr.entIndex === 0` fallback.** The asm at 0x8c039–0x8c04f
    reads `[esp+0x90]` (a pointer slot in `TraceResult`), and only if
    that's null does it invoke a singleton's vtable[0x114]. The TS
    reads `tr.entIndex === 0` which is a different field. Match the
    pointer slot, not the index.

---

### Suggested rewrite

```typescript
// Field offsets are from ts_i386.so disassembly; names are placeholders
// to be confirmed in D.4. Symbol types use `any` per D.3 isolation rules.

const CVAR_MIN_SPEED    = 0;     // [gvars-0x6df70]
const CVAR_FALLBACK_VZ  = 0;     // [gvars-0x6f3fc]   unit-Z when speed==0
const CVAR_HELD_VZ_MUL  = 0;     // [gvars-0x6ecd8]   speed scalar in held branch
const CVAR_REFLECT_MUL  = 0;     // [gvars-0x6ec2c]   reflect-push scalar

export function CheckForBreakables(this: any): void {
  // ---- 0x8bdb2: per-tick re-check -----------------------------------
  // fld [this+0x18]; fcom [gvars-0x6deb0]; jne → return.
  // On equal: load vector from [gvars+0x1600] and store first dword
  // back into this+0x18. The TS's "v_forward" wording was speculative.
  const cvarThreshold = (globalThis as any).F32[(globalThis as any).STATE_OFF - 0x6deb0];
  const thisTime      = (this as any).U32[(this as any).off + 0x18];
  if (thisTime !== cvarThreshold) return;

  // ---- 0x8bddd: sync-back (first dword of the vector) ---------------
  (this as any).U32[(this as any).off + 0x18] =
    (globalThis as any).U32[(globalThis as any).STATE_OFF + 0x1600 + 0x00];

  const player: any = (this as any).U32[(this as any).off + 0x40];
  const pev:    any = (player as any).U32[(player as any).off];      // *(player)
  const edict:  any = (pev as any).U32[(pev as any).off + 0x208];

  // ---- 0x8bdf5: TS-private "frozen by stunt" bit --------------------
  // Bit 0x2 of *(player)+0x1a5. NOT pev.flags & FL_FROZEN.
  const frozenStunt = ((player as any).U8[(player as any).off + 0x1a5]) & 0x2;
  const heldTime    = (player as any).F32[(player as any).off + 0x79c];

  if (frozenStunt !== 0) {
    if (heldTime > 0) {
      (player as any).U32[(player as any).off + 0x798] = 0;   // lastBreakableHit = null
      return;
    }
    // fall through to velocity-magnitude check below
  }

  // ---- 0x8be20–0x8be48: ||velocity|| --------------------------------
  const vx = (pev as any).F32[(pev as any).off + 0x20];
  const vy = (pev as any).F32[(pev as any).off + 0x24];
  const vz = (pev as any).F32[(pev as any).off + 0x28];
  const speed = Math.sqrt(vx*vx + vy*vy + vz*vz);

  // ---- 0x8be48–0x8be78: bail when slow AND not holding --------------
  if (speed < CVAR_MIN_SPEED && heldTime === 0) return;

  // ---- 0x8be78–0x8bf30/8be95: held-time branch direction ------------
  // heldTime == 0 → VELOCITY path;  heldTime != 0 → MakeVectors path.
  let forward: any;
  let traceDist: number;
  if (heldTime === 0) {
    if (speed > 0) {
      forward = { x: vx/speed, y: vy/speed, z: vz/speed };
    } else {
      forward = { x: 0, y: 0, z: CVAR_FALLBACK_VZ };
    }
    traceDist = (globalThis as any).F32[(globalThis as any).STATE_OFF - 0x6f018];
  } else {
    // MakeVectors(pev.v_angle). Sub-branch on player+0x7a0 == 0 picks
    // between two trace-distance cvars ([gvars-0x6c31c] vs [gvars-0x6f064]).
    (globalThis as any).UTIL_MakeVectors(
      { x: (pev as any).F32[(pev as any).off + 0x1c],
        y: (pev as any).F32[(pev as any).off + 0x20],
        z: (pev as any).F32[(pev as any).off + 0x24] }, /* = v_angle at 0x1c..0x24 */
    );
    const throwTime = (player as any).F32[(player as any).off + 0x7a0];
    traceDist = throwTime === 0
      ? (globalThis as any).F32[(globalThis as any).STATE_OFF - 0x6c31c]
      : (globalThis as any).F32[(globalThis as any).STATE_OFF - 0x6f064];
    forward = {
      x: (globalThis as any).F32[(globalThis as any).STATE_OFF + 0x1600 + 0x28 + 0],
      y: (globalThis as any).F32[(globalThis as any).STATE_OFF + 0x1600 + 0x28 + 4],
      z: (globalThis as any).F32[(globalThis as any).STATE_OFF + 0x1600 + 0x28 + 8],
    };  // globals.v_forward at +0x28 within that struct
  }

  // ---- 0x8bfb4–0x8c000: trace_end = origin + forward*traceDist ------
  const ox = (pev as any).F32[(pev as any).off + 0x08];
  const oy = (pev as any).F32[(pev as any).off + 0x0c];
  const oz = (pev as any).F32[(pev as any).off + 0x10];
  const ex = ox + forward.x * traceDist;
  const ey = oy + forward.y * traceDist;
  const ez = oz + forward.z * traceDist;

  // ---- 0x8c000–0x8c023: UTIL_TraceHull ------------------------------
  const tr: any = (globalThis as any).UTIL_TraceHull(
    { x: ox, y: oy, z: oz },
    { x: ex, y: ey, z: ez },
    /*ignoreMon*/ 0,
    /*hull    */ 3,
    /*ignore  */ edict,
  );

  // ---- 0x8c026–0x8c033: bail if fraction >= 0.5 ---------------------
  if (tr.F32[(tr as any).off + 0x70] >= 0.5) return;

  // ---- 0x8c039–0x8c068: resolve hitEnt ------------------------------
  let hitEnt: any = tr.U32[(tr as any).off + 0x90];   // ptr slot, not entIndex
  if (hitEnt === 0) {
    const singleton = (globalThis as any).U32[(globalThis as any).STATE_OFF + 0x1aa8];
    hitEnt = (globalThis as any).callVtable(singleton, 0x114, 0);
  }
  if (hitEnt === 0) return;

  // ---- 0x8c06e–0x8c0a3: damageability -------------------------------
  const hitVtable = (hitEnt as any).U32[(hitEnt as any).off + 0x60];
  if ((globalThis as any).callVtable(hitVtable, 0xc8, hitEnt) !== 0 &&
      heldTime > 0) return;

  const hitInner = (hitEnt as any).U32[(hitEnt as any).off + 0x00];
  if ((hitInner as any).F32[(hitInner as any).off + 0x16c] <= 0) return;
  if (((hitInner as any).U8[(hitInner as any).off + 0x1a7]) & 0x2) return;
  if (((hitInner as any).U8[(hitInner as any).off + 0x118]) & 0x80) return;  // DF_* flags

  // ---- 0x8c0d7–0x8c0f3: skip already-killed-with-bonus -------------
  const lastHit = (player as any).U32[(player as any).off + 0x798];
  if (lastHit === hitEnt) return;

  // ---- 0x8c0f3–0x8c150: damage scale --------------------------------
  let flDamage: number;
  if ((globalThis as any).callVtable(hitVtable, 0xb4, pev) !== 0) {
    flDamage = speed * CVAR_HELD_VZ_MUL;     // held-time sub-branch
  } else {
    flDamage = speed;                         // raw sqrt result
  }

  // ---- 0x8c16a/8c1a0: damage bits ----------------------------------
  let damageBits = 0x1080;
  let applyDamage = true;
  const kungfuActive = (globalThis as any).U32[(globalThis as any).STATE_OFF + 0x1920];
  const hitMode = (hitInner as any).U8[(hitInner as any).off + 0x7a4];
  if (hitMode === 0) {                         // 0x8c18e: KUNGFU
    (globalThis as any).U8[(globalThis as any).STATE_OFF + 0x1920] = 1;
    damageBits = 0x4001080;
    // DropWeapon(): 3-arg push, see Issue 6.
    (globalThis as any).DropWeapon(
      (pev as any).off + 0x60 /* reloaded [esp+0x10] */,
      -2,
      hitEnt,
    );
    // Reflection push (0x8c312–0x8c3c2): inline, not via helper.
    const hex = (hitInner as any).F32[(hitInner as any).off + 0x20];
    const hey = (hitInner as any).F32[(hitInner as any).off + 0x24];
    const hez = (hitInner as any).F32[(hitInner as any).off + 0x28];
    let dx = hex - (pev as any).F32[(pev as any).off + 0x20];
    let dy = hey - (pev as any).F32[(pev as any).off + 0x24];
    let dz = hez - (pev as any).F32[(pev as any).off + 0x28];
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
    let unit: any;
    if (dist === 0) {
      unit = { x: 0, y: 0, z: CVAR_FALLBACK_VZ };
    } else {
      unit = { x: dx/dist, y: dy/dist, z: dz/dist };
    }
    (hitInner as any).F32[(hitInner as any).off + 0x7a0] =
      ((pev as any).F32[(pev as any).off + 0x7a0]) * CVAR_REFLECT_MUL;

    if ((globalThis as any).VictimKungfuHold(pev, hitEnt, flDamage, tr)) {
      applyDamage = false;
    }
    (globalThis as any).EMIT_SOUND_DYN(
      edict, 0,
      (globalThis as any).CSTR[(globalThis as any).STATE_OFF - 0x6e79b],
      /*vol*/ 1.0, /*attn*/ 0.7, /*pitch*/ 0x3f4ccccd, /*chan*/ 4,
    );
  } else if (hitMode === 2) {                  // 0x8c44e: KATANA
    if ((globalThis as any).VictimKatanaHold(pev, hitEnt, flDamage)) {
      applyDamage = false;
    }
    (globalThis as any).EMIT_SOUND_DYN(
      edict, 0,
      (globalThis as any).CSTR[(globalThis as any).STATE_OFF - 0x6dcb2],
      1.0, 0.7, 0x3f4ccccd, 4,
    );
  } else {                                     // 0x8c4ac: KNIFE / default
    if ((globalThis as any).VictimKnifeHold(pev, hitEnt, flDamage)) {
      applyDamage = false;
    }
    (globalThis as any).EMIT_SOUND_DYN(
      edict, 0,
      (globalThis as any).CSTR[(globalThis as any).STATE_OFF - 0x6df30],
      1.0, 0.7, 0x3f4ccccd, 4,
    );
  }

  // ---- 0x8c51a–0x8c59a: screen punch --------------------------------
  const punchTarget = (pev as any).U32[(pev as any).off + 0xa10];
  if (punchTarget !== 0 &&
      ((punchTarget as any).U8[(punchTarget as any).off + 0xc8]) === 0) {
    const pdx = ((pev as any).F32[(pev as any).off + 0x08]) -
                ((hitInner as any).F32[(hitInner as any).off + 0x08]);
    const pdy = ((pev as any).F32[(pev as any).off + 0x0c]) -
                ((hitInner as any).F32[(hitInner as any).off + 0x0c]);
    const pdz = ((pev as any).F32[(pev as any).off + 0x10]) -
                ((hitInner as any).F32[(hitInner as any).off + 0x10]);
    (globalThis as any).PunchScreen(hitEnt, {
      x: pdx * CVAR_REFLECT_MUL,
      y: pdy * CVAR_REFLECT_MUL,
      z: pdz * CVAR_REFLECT_MUL,
    });
  }

  // ---- 0x8c59e–8c605: apply damage (or skip) ------------------------
  if (applyDamage) {
    (globalThis as any).ClearMultiDamage();
    (globalThis as any).callVtable(hitVtable, 0x54,
      (hitInner as any).F32[(hitInner as any).off + 0x08],
      (hitInner as any).F32[(hitInner as any).off + 0x0c],
      (hitInner as any).F32[(hitInner as any).off + 0x10],
      flDamage,
      forward,
      hitInner,
      edict,
    );
    (globalThis as any).ApplyMultiDamage(pev, pev);
  }

  // ---- 0x8c608–0x8c621: unconditional cleanup -----------------------
  (globalThis as any).U8[(globalThis as any).STATE_OFF + 0x1920] = 0;
  (player as any).U32[(player as any).off + 0x798] = hitEnt;
}
```

**What's still ambiguous in the rewrite** (no asm answer; needs D.4 or the cvar-name table):
- Names of the TS-private fields at offsets 0x1a5/0x1a7/0x118/0x798/0xa10 on the player object.
- Names of the cvars at `gvars-0x6deb0`, `gvars-0x6c31c`, `gvars-0x6f064`, `gvars-0x6ecd8`, `gvars-0x6ec2c`. Strings in `tools/decompile/strings-n5.txt` should name them (likely candidates: a `ts_slowmotion` / "next think" / trace-distance cvar).
- The DropWeapon 3-arg shape at 0x8c2a4–0x8c2b3 — needs the `DropWeapon__11CBasePlayer10tsweapon_tf` vtable inspection in D.4.
- The exact trig of `pev.v_angle`: HLSDK puts `v_angle` at `entvars_t+0x1c`; the asm reads `[eax+0x1c]` (×/y/z) before calling `UTIL_MakeVectors`, which matches ✅.

When this lands, take the rewritten function as the new baseline and re-decompile the inner helpers (`DropWeapon` PLT, `VictimKungfuHold` / `VictimKatanaHold` / `VictimKnifeHold`) before re-running tier-1 smokes, since this function calls them with the corrected arg shapes.
