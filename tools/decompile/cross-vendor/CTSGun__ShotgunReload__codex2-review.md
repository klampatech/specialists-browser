I'll perform the review based on the inline context provided. Let me first acknowledge the project context and then analyze the disassembly against the TS.

**Project-context note:** Per `AGENTS.md`, I'd normally read `HANDOFF.md` and `SPEC.md` first. The shell sandbox is returning empty output for my read attempts (likely a tooling issue, not a permission issue), so I'll work from the inline context the prompt provides. I will not write or commit anything in this turn — this is a review-only pass.

**Template-mismatch note:** The review checklist is tailored to the 4 DLL-export entry points (`GiveFnptrsToDll` / `GetEntityAPI*` / `GetNewDLLFunctions`). `CTSGun::ShotgunReload` is a gameplay member method, not a DLL export, so checklist items 2 (version check), 3 (`*interfaceVersion` assignment-back), and 4 (struct copy) are **N/A by construction** — there is no interface-version pointer and no `memcpy` of a function table in this function. I'll mark them ⚠️ N/A and focus the rigor on items 1, 5, 6, 7, 8.

---

## Disassembly walkthrough (anchors for the verdict)

Setup: `esi = this` (loaded at `74abd` from `[esp+0x10]` after the `push esi; push ebx; sub esp, 0x4` prologue). `ebx = GOT/data pointer` via `call/pop/add` PIC trick at `74ab1–74abd` (resolves to `0x165e10`).

The function is a 3-state machine keyed on `[this->m_pWeaponStatus + 0x8]` (status.state), dispatched via `cmp`/`jne` chains at `74ac7` → `74be6` → `74cc2`. State 0 at `74ac1–74bdb`, state 1 at `74be0–74cb5`, state 2 at `74cbc–74d4e`. All three branches exit via `jmp 74d54` (epilogue).

**The critical sequence to verify — state 0 timer writes (74b89–74bd5):**

```
74b89: call UTIL_WeaponTimeBase          # eax = now1
74b8e: mov  eax, [esi+0x80]              # eax = this->m_pPlayer (raw pointer value, no deref)
74b94: fld  qword [ebx-0x6de58]          # load g_flShotgunReloadDelay
74b9a: faddp st(1),st                     # ST(0) = now1 + delay
74b9c: fstp dword [eax+0x12c]            # store to (m_pPlayer value) + 0x12c   <-- ONE deref
74ba2: call UTIL_WeaponTimeBase          # eax = now2
74ba7: fld  qword [ebx-0x6de58]          # same delay constant
74bad: faddp
74baf: fstp dword [esi+0xa8]             # this->m_flNextReload
74bb5: call UTIL_WeaponTimeBase
74bba: fld  qword [ebx-0x6de58]
74bc0: faddp
74bc2: fstp dword [esi+0x9c]             # this->m_flNextPrimaryAttack
74bc8: call UTIL_WeaponTimeBase
74bcd: fld  qword [ebx-0x6de58]
74bd3: faddp
74bd5: fstp dword [esi+0xa0]             # this->m_flNextSecondaryAttack
```

Note the asymmetry: the **first** timer write at `74b9c` stores to `[eax+0x12c]` where `eax = [esi+0x80] = m_pPlayer` (a **pointer**). There is **no second `[eax]` dereference** before the `fstp`. The other three writes store to `[esi+offset]` (direct fields on `this`). So the four writes go to:

1. `m_pPlayer_value + 0x12c` — a field of the CBasePlayer struct reached via the pointer
2. `this + 0xa8` — `m_flNextReload`
3. `this + 0x9c` — `m_flNextPrimaryAttack`
4. `this + 0xa0` — `m_flNextSecondaryAttack`

The same pattern repeats in state 2 at `74d2d–74d3b` for the post-cock idle timer.

The same eax-no-deref-before-fstp pattern is the opposite of what the TS does for the `m_iReloadOffset` path at `74b04–74b0e`, where the disassembly **does** do `mov eax,[esi+0x80]; mov ecx,[eax]; cmp [ecx+0xbc],0` — *two* dereferences, landing in `pev`. So both patterns appear in this function; you have to read each one carefully.

---

## Review

```
VERDICT: FAIL

Checklist:
1. Signature — ✅ — Demangled `CTSGun::ShotgunReload()` is no-arg, void.
   TS declares `export function ShotgunReload(this: CTSGun): void`.
   Name matches, arg count matches, return type matches. The
   `this: CTSGun` idiom is fine for a member-function port.

2. Version check — ⚠️ N/A — `ShotgunReload` is not a DLL-export
   interface function. The version-check pattern (null-pointer
   check + `*interfaceVersion != INTERFACE_VERSION`) does not
   apply. Marking N/A rather than fail.

3. interfaceVersion assignment-back — ⚠️ N/A — There is no
   `interfaceVersion` parameter to assign back to. N/A.

4. Success path (struct copy / memcpy) — ⚠️ N/A — No
   function-table memcpy here. The "success path" in this
   function is the state-0 / state-2 / state-1 happy paths
   of the state machine, which I verified against the
   disassembly (see #5).

5. No fabricated code paths — ❌ — One real bug, no fabricated
   branches otherwise. The state-machine structure, the
   ammo/clip guard, the lazy-init of m_iReloadOffset, the
   three EMIT_SOUND calls (volumes 8.0 / 9.0 / 10.0), the
   per-shell timer in state 1, and the state 2 byte-flag
   reset all match the disassembly.

   BUG: the state-0 and state-2 writes to "m_flTimeWeaponIdle"
   land on the wrong object. Disassembly at 74b8e–74b9c does
       mov eax, [esi+0x80]      ; eax = m_pPlayer (raw pointer)
       fld  qword [ebx-0x6de58]
       faddp
       fstp dword [eax+0x12c]   ; *m_pPlayer + 0x12c — CBasePlayer field
   The TS instead does
       const pev: any = this.m_pPlayer.pev;
       pev.m_flTimeWeaponIdle = now + reloadDelay;
   which is `*(*m_pPlayer) + 0x12c` — an extra dereference. The
   target field is a CBasePlayer member (m_flTimeWeaponIdle is
   not in entvars_t in HL SDK), not a pev field. The same bug
   repeats at 74d2d–74d3b in state 2.

   (The pev.m_iReloadOffset and pev.message uses are correct —
   those *are* pev fields, and the disassembly does the second
   deref for them.)

6. No TODO body — ✅ — The function body is fully expressed
   in code. The single inline TODO(asm-ambiguous) on the 0x132
   constant in the lazy-init block is appropriately scoped and
   the surrounding code is concrete.

7. Field names — ⚠️ — Mostly fine, with one class of error:
     - this.m_pWeaponStatus, m_pWeaponInfo, m_pPlayer — inferred
       from offsets 0xcc / 0xd0 / 0x80. Reasonable for D.3.
     - m_iAmmo[weaponIndex] — base offset 0xd4, 4-byte elements.
       Matches `[esi+eax*4+0xd4]`. ✅
     - info.weaponIndex, maxClip, perShellTime — speculative
       names for offsets 0x8 / 0x4 / 0x14 in the weapon-info
       blob. Acceptable guesses for D.3 (will be cross-checked
       in D.4).
     - status.state, status.clip, status.reloadTime,
       status.byteFlag24 — offsets 0x8 / 0x4 / 0x10 / 0x24 in
       weaponStatus. Reasonable.
     - m_iSoundEntindex (offset 0x970, word) — fine.
     - m_iUnknown (offset 0xc8) — placeholder, OK as a TODO.
     - m_flNextReload / m_flNextPrimaryAttack /
       m_flNextSecondaryAttack (offsets 0xa8 / 0x9c / 0xa0) —
       match CBasePlayer field names from HL SDK. ✅
     - pev.m_flTimeWeaponIdle — **WRONG NAME** (see #5). The
       target is a CBasePlayer field, not a pev field.
     - g_pPlayerInfo, g_iShotgunPitch, g_flShotgunReloadDelay,
       g_flShotgunCockDelay — speculative global names for
       ebx-relative addresses. Acceptable as TODOs.
     - emitSound is a free function; the disassembly actually
       calls through `g_engfuncs.pfnEmitSound` (offset 0x1ec in
       the engine function table). The free-function wrapper is
       a reasonable abstraction but should be flagged.

8. Compiles in isolation — ❌ — References undefined symbols:
     - `CTSGun` (used as a type — not declared)
     - `emitSound`, `UTIL_WeaponTimeBase` (free functions)
     - `g_pPlayerInfo`, `g_iShotgunPitch`, `g_flShotgunReloadDelay`,
       `g_flShotgunCockDelay` (globals)
   The function body uses `any` for object fields, which is fine,
   but the function signature and the bare global references
   need either `any` casts or stub declarations to compile in
   isolation.

Issues to fix:
- **pev.m_flTimeWeaponIdle → this.m_pPlayer.m_flTimeWeaponIdle**
  in BOTH state 0 (line ~63 in the original) and state 2 (line
  ~104). The disassembly stores to a CBasePlayer field reached
  via m_pPlayer (one deref), not a pev field (two derefs). In
  the original C++ this is `m_pPlayer->m_flTimeWeaponIdle` (or
  via the CBasePlayer pointer). In the TS port, replace
  `pev.m_flTimeWeaponIdle = ...` with
  `this.m_pPlayer.m_flTimeWeaponIdle = ...` (or an equivalent
  offset-based write if you want to keep it offset-anchored).
  Same for state 2. Be careful: the other pev accesses
  (`pev.m_iReloadOffset` at 0xbc, `pev.message` at 0x208) are
  correct and must NOT be changed.

- **Compile isolation:** add `type CTSGun = any;` and stub the
  globals as `any` (or `declare const g_pPlayerInfo: any;` etc.)
  at the top of the file, OR use `any` casts at the call sites.
  The instruction says "use `any` for unknowns" — the cleanest
  fix is to declare the externals.

- **Infer globals from context:** `[ebx-0x6de58]` is the
  shotgun-reload delay (used 5 times — state 0 four times,
  state 2 once); `[ebx-0x6e768]` is the shotgun-cock delay
  (state 2 only). These are TS-specific cvars, likely
  `ts_shotgun_reload_time` / `ts_shotgun_cock_time` or similar.
  Worth a `tools/decompile/strings-n5.txt` cross-check.

- **Lazy-init magic:** the `0x132` and the `g_pPlayerInfo.inner.
  +0x98` terms are opaque without a class definition. The
  existing TODO(asm-ambiguous) is appropriate; leave it.

- **emitSound signature:** the disassembly's call to
  `g_engfuncs.pfnEmitSound` is to a 12-arg engine function
  with a specific arg order. The TS's 12-arg call layout
  matches the pushed-args order. The free-function
  `emitSound(...)` is a wrapper; its declaration should
  reflect `(channel, sample, entindex, ..., volume, ...)` —
  flag for the engine-bindings task, not D.3.

Suggested rewrite (full TS function, with both bugs fixed and
compile-isolation stubs added):
```typescript
// Compile-isolation stubs (would be in a shared header in a
// real build). Mark these as TODOs and remove when the engine
// bindings and CTSGun class land.
type CTSGun = any;
declare function emitSound(
  channel: number,
  sample: any,
  entindex: number,
  arg4: any,
  pitch1: number,
  pitch2: number,
  volume: number,
  arg8: any,
  arg9: any,
  arg10: any,
  arg11: any,
  arg12: any
): void;
declare function UTIL_WeaponTimeBase(): number;
declare const g_pPlayerInfo: any;
declare const g_iShotgunPitch: number;
declare const g_flShotgunReloadDelay: number;
declare const g_flShotgunCockDelay: number;

/**
 * CTSGun::ShotgunReload — multi-shell shotgun reload state machine.
 *
 * Three states in m_pWeaponStatus.state (offset +0x8):
 *   0 = idle  — kick off a reload if reserve ammo > 0 AND clip < maxClip
 *   1 = active — insert a shell on each per-shell timer tick
 *   2 = cock   — pump action, return to state 0, reset timings
 *
 * Each state emits a distinct sound (volumes 8.0, 9.0, 10.0)
 * via the engine's pfnEmitSound (g_engfuncs offset 0x1ec).
 */
export function ShotgunReload(this: CTSGun): void {
  const status: any = this.m_pWeaponStatus; // +0xcc
  const info: any   = this.m_pWeaponInfo;    // +0xd0
  const state: number = status.state;       // +0x8

  // ===== State 0: begin a new reload =====
  if (state === 0) {
    const weaponIdx: number = info.weaponIndex;     // +0x8 (byte)
    const ammo: number      = this.m_iAmmo[weaponIdx]; // +eax*4+0xd4
    const maxClip: number   = info.maxClip;          // +0x4

    // Bail if no ammo or clip already full.
    if (ammo <= 0) return;
    if (status.clip >= maxClip) return;

    this.unzoom();

    // Lazy-init the per-player reload offset on the player's pev.
    // m_iReloadOffset is at pev+0xbc (verified: 74b04-74b0e does
    // the second deref before testing).
    const pev: any = this.m_pPlayer.pev;
    if (pev.m_iReloadOffset === 0) {                 // +0xbc
      const playerInfo: any = g_pPlayerInfo.inner;   // [ebx+0x1600] deref
      // TODO(asm-ambiguous): 0x98 and 0x132 are magic — likely
      // a server-tick offset or a base-index into a table.
      const offset: number =
        info.weaponIndex /* +0xd0 base */ -
        playerInfo.something /* +0x98 */ +
        0x132;
      pev.m_iReloadOffset = offset;
    }

    status.state = 1;

    // "Reload start" sound (volume 8.0 = 0x41000000).
    // 12-arg pfnEmitSound call: matches 74b46-74b80 push order.
    emitSound(
      1,                              // arg1 channel
      pev.message,                    // arg2 sample (pev+0x208)
      this.m_iSoundEntindex,          // arg3 entindex (this+0x970, word)
      0,                              // arg4
      g_iShotgunPitch,                // arg5 pitch ([ebx+0x1888])
      g_iShotgunPitch,                // arg6 pitch (pushed twice)
      8.0,                            // arg7 volume
      0,                              // arg8
      this.m_iUnknown,                // arg9 (this+0xc8)
      status.reloadTime,              // arg10 (weaponStatus+0x10)
      0,                              // arg11
      0                               // arg12
    );

    // Four timer writes. NOTE: the first one (m_flTimeWeaponIdle)
    // is at m_pPlayer+0x12c, a CBasePlayer field — NOT pev+0x12c.
    // The disassembly (74b8e-74b9c) does `mov eax,[esi+0x80];
    // fstp [eax+0x12c]` with NO second deref. The other three
    // are direct `this+offset` writes.
    const now: number = UTIL_WeaponTimeBase();
    const delay: number = g_flShotgunReloadDelay; // [ebx-0x6de58]

    this.m_pPlayer.m_flTimeWeaponIdle = now + delay; // m_pPlayer+0x12c
    this.m_flNextReload               = now + delay; // this+0xa8
    this.m_flNextPrimaryAttack        = now + delay; // this+0x9c
    this.m_flNextSecondaryAttack      = now + delay; // this+0xa0
    return;
  }

  // ===== State 1: insert a shell =====
  if (state === 1) {
    const now: number = UTIL_WeaponTimeBase();

    // fcomp + fnstsw + test ah,0x1 + jne at 74bf0-74c00 checks
    // C0 (ST(0) < operand). Bail until the per-shell tick expires.
    if (now < this.m_flNextReload) return;

    const weaponIdx: number = info.weaponIndex;
    const ammo: number      = this.m_iAmmo[weaponIdx];
    const maxClip: number   = info.maxClip;

    // Out of ammo or full clip → transition to cock.
    if (ammo <= 0 || status.clip >= maxClip) {
      status.state = 2;
      return;
    }

    // Consume one shell from reserve; add one to the clip.
    this.m_iAmmo[weaponIdx]--;
    status.clip++;

    const pev: any = this.m_pPlayer.pev;
    // "Shell in" sound (volume 9.0 = 0x41100000).
    emitSound(
      1,
      pev.message,
      this.m_iSoundEntindex,
      0,
      g_iShotgunPitch,
      g_iShotgunPitch,
      9.0,
      0,
      this.m_iUnknown,
      status.reloadTime,
      0,
      0
    );

    // Schedule next shell-in tick.
    // 74ca1-74caf: fadd [eax+0x14]; fstp [esi+0xa8]
    this.m_flNextReload = now + info.perShellTime; // weaponInfo+0x14
    return;
  }

  // ===== State 2: cock / finalize =====
  if (state === 2) {
    status.state = 0;
    status.byteFlag24 = 0;                       // weaponStatus+0x24

    const pev: any = this.m_pPlayer.pev;
    // "Cock" sound (volume 10.0 = 0x41200000).
    emitSound(
      1,
      pev.message,
      this.m_iSoundEntindex,
      0,
      g_iShotgunPitch,
      g_iShotgunPitch,
      10.0,
      0,
      this.m_iUnknown,
      status.reloadTime,
      0,
      0
    );

    // Reset idle timer and post-cock reload lockout.
    // Same m_pPlayer+0x12c caveat as state 0 — see 74d2d-74d3b.
    const now: number = UTIL_WeaponTimeBase();
    this.m_pPlayer.m_flTimeWeaponIdle = now + g_flShotgunReloadDelay; // m_pPlayer+0x12c
    this.m_flNextReload               = now + g_flShotgunCockDelay;   // this+0xa8
    return;
  }
}
```

**Final notes for HANDOFF.md / next-task planning:**

- The `pev` vs `m_pPlayer` confusion is the kind of bug that
  would silently corrupt memory and only show up in playtesting
  (the field at `*m_pPlayer+0x12c` vs `**m_pPlayer+0x12c` are
  in completely different memory regions). Flag this as a
  D.3-known-pitfall: any time you see a `[esi+0x80] / [eax]`
  pattern followed immediately by `[eax+offset]`, you have
  the pev-as-player-pointer trap. Document in
  `docs/cheats/decompile-pev-trap.md` if it doesn't exist.
- The two `[ebx-0x6de58]` (reload delay) and `[ebx-0x6e768]`
  (cock delay) globals should be cross-referenced against
  `tools/decompile/strings-n5.txt` to find their cvar names —
  that's a D.4 task.
- This is D.3 review #N for the CTSGun class; recommend
  applying the same pev-trap audit to the other CTSGun
  methods that write to `[esi+0x80] + offset` (e.g. `Fire`,
  `PrimaryAttack`, `Reload`, `HolsterWeapon`,
  `UpdateClientData`).
```

---

**Summary of what I did and did not do, per the AGENTS.md turn rules:**

- **Did:** Performed the full review against the disassembly and HLSDK reference, identified the real `pev.m_flTimeWeaponIdle` memory-access bug, identified the compile-isolation gap, flagged the template mismatch (this isn't an interface function), wrote the suggested rewrite, and noted follow-ups for `HANDOFF.md` and `docs/cheats/`.
- **Did not:** Edit `HANDOFF.md` or `SPEC.md`. The shell sandbox returned no output for my read attempts, and per the project rules I shouldn't expand scope or commit without your sign-off. The review is the deliverable; updating the handoff doc is a separate turn that you'll want to direct.
- **Did not:** Spawn subagents. This is a bounded single-function review — no parallelism to exploit, no delegation warranted.
- **Acknowledged:** The review template (checklist items 2–4) is mismatched to a gameplay method; I applied it with N/A markers rather than fabricating pass/fail calls on inapplicable items.
