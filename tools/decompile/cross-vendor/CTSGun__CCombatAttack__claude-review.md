```
VERDICT: FAIL

The TS is a rough sketch of the asm — it captures the broad shape but fails
on every checklist item that can actually be checked. Three blockers:
`goto` makes it not real TypeScript, the entity-offset fields are
misattributed to `pev.flags`, and the cvar names are unverified guesses.

Checklist:
1. Signature — ✅ — `void CCombatAttack()` with implicit `this`. The asm
   prologue (`push ebp; push edi; push esi; push ebx; sub esp, 0x11c`)
   plus `[esp+0x130]` mapping to `[ebp+0]` after frame setup confirms
   `__thiscall` with no args. Demangling matches. ✓

2. Version check — N/A — Not applicable to `CCombatAttack`. (The HLSDK
   reference in the prompt is for D.3 API functions, not D.4 gameplay
   methods. No version negotiation happens here.)

3. `*interfaceVersion` assignment-back — N/A — Same as #2.

4. Success path — N/A — Not applicable.

5. No fabricated paths — ❌ — Several issues:
   - The conditional at 0x76472–0x76491 is mistranslated. The asm is:
     `if (CUSTOM_A && (CUSTOM_C || !CUSTOM_B)) { ... big-kick ... } else { goto0x76558 }`
     The TS writes `if (hasCustomA || !hasCustomB)` which is *different*
     logic (OR vs AND, missing the CUSTOM_C arm). See line
     `if (hasCustomA || !hasCustomB)` in the TS.
   - The TS introduces a `goto applyAttack` after every branch, but the
     asm has multiple distinct end-points: 0x769a3 (set `[esp+0x8]`,
     fall through to close-combat hooks), 0x76912 (set `[esp+0x8]=0xa`,
     goto 0x769a3), and 0x76997 (set `[esp+0x8]=0x9`, goto 0x769a3). The
     TS conflates all of them into one `applyAttack:` label.
   - At 0x76298 the asm branches back into the body when the magnitude
     check fails (`[esp+0x10] >= closeCombatRange`), and the TS
     short-circuits this — the "attackType=2, sequence=0x2d, kickDelay="
     fallback block at 0x762a0–0x762b2 is silently dropped.
   - The jump table at 0x768e0 is guessed as `[0xc, 0xd, 0xe, 0xa]` with
     no verification — the bytes the disassembler printed as `add BYTE
     PTR [edi-0xb],bl; ...` are the table data, not code.

6. No TODO body — ❌ — There are at least 7 `// TODO(asm-ambiguous)`
   comments, plus the entire cvar table is marked   `TODO(asm-ambiguous): exact cvar names from tools/decompile/analysis/strings-n5.txt`.
   The body is roughly 40% comment / TODO by line count.

7. Field names — ❌ — Multiple problems:
   - `[eax+0x180]`, `[eax+0x1a5]`, `[eax+0x814]`, `[eax+0x815]` are all
     distinct fields on the player entity (offset 0x180 / 0x1a5 are
     inside `pev`;0x814 / 0x815 are far past `entvars_t` and live on     `CBasePlayer`). The TS rolls them all into `pev.flags & X`. That's
     wrong on four counts.
   - `m_pPlayer` at `[ebp+0x80]` is plausible but unverified — confirm
     against the CTSGun vtable / a sibling method.
   - `m_iLowAttackCount` ([ebp+0xa00]), `m_iHighAttackCount` ([ebp+0xa00]
     again — actually the same offset, two different field names!), and
     `m_iLastAttackSeq` ([ebp+0xa04]) are guesses; the asm only gives
     us "DWORD at offset X on `this`".
   - `[esi+0x12c]` on `player` is read as `m_flNextAttack` — the actual
     field name needs to be cross-referenced with `CBasePlayer`'s
     layout; `m_flNextAttack` is one possibility.
   - Cvar names: every `cvar_closeCombat_*` identifier is invented. Need
     to read `tools/decompile/analysis/strings-n5.txt` and resolve each
     `[ebx±k]` PIC offset to a string.

8. Compiles in isolation — ❌ — Multiple compile errors:
   - **`goto` is not valid TypeScript.** The TS uses `goto applyAttack`,
     `goto forwardChain`, `goto fwdChainAfter` in ~10 places. This will
     fail to parse.
   - **`Vector` type not defined.**
   - **Globals not defined:** `cvar_closeCombat_*` (~30 identifiers),
     `engineGlobals`, `RANDOM_LONG`.
   - **External calls not declared:** `UTIL_WeaponTimeBase`,
     `UTIL_MakeVectors`, `GetMeleeMultiplier`, `KungFu`, `CloseCombatAttack`,
     `BlockPlayer`, `W_FireBullets`, `player.GetAutoaimVector`.
   - **`pev` is read off `player` and off `this.m_pPlayer` but the TS
     uses `player.pev` AND `this.m_pPlayer.pev` interchangeably without
     a `pev` declaration on the CTSGun class.**
   - `player.m_iUser /* [edx+0x208] */` — the asm reads a DWORD at
     `pev+0x208` (probably `m_iUser3` or similar), not `player.m_iUser`.

Additional issues to fix (beyond the checklist):

- **Duplicate cvar offset, two names.** `[ebx-0x6df04]` is named
  `closeCombatFarDly` at one site and `closeCombatKFDly2` at another.
  Pick one and verify against the actual cvar string.

- **QWORD loads treated as DWORD.** The asm reads QWORDs at
  `[ebx-0x6ecd8]`, `[ebx-0x6ecc8]`, `[ebx-0x6de20]`, `[ebx-0x6de40]`,
  `[ebx-0x6f010]`. These are `double` cvars. The TS treats them as
  `float` in most places (e.g., `lowVal > closeCombatLowMin`) which will
  be fine on x86 (same bit pattern in the comparison), but the TS should
  at least type them as `number` from `double` rather than leave them
  as QWORD literals.

- **The `[esp+0x90]` zeroing** at 0x7618c (`mov DWORD PTR [esp+0x90],0x0`)
  after copying `pev.origin` (3 floats) — the TS sets `forward.x = 0`
  *after* the copy, which is right. But it then uses `pev.origin` again
  inside the dot-product block when it should be using `forward` (the
  zeroed-x copy). Look at 0x76171–0x7618c carefully.

- **The branch at 0x761a6** (`jne 0x76298`) means "magnitude is large enough
  → take the `setne cl` path" OR "magnitude is too small → fall into the
  `UTIL_MakeVectors` path". The TS has the comparison inverted: it does
  `if (velocityMag < CLOSE_COMBAT_RANGE)` and enters the close-combat
  branch, but the asm falls *into* the close-combat branch when
  `velocityMag >= range` (`jne 0x76298` is the *fall-through* path; the
  jne target is the `setne` block, which sets `[esp+0x14]` based on the
  player-state flag, NOT the magnitude check).

  Actually re-reading: `test ah,0x41` checks C0+C3 (unordered). `jne` means
  "if unordered OR `ST(0) > operand`, jump to 0x76298". `ST(0)` here is
  `velocityMag` and the operand is `[ebx-0x6e7f4]` (the range cvar).
  So "if `velocityMag > range`" → goto 0x76298 (the `pev.flags & 0x10`
  branch). Otherwise fall into the `UTIL_MakeVectors` branch.

  The TS has this inverted (`<` instead of `>`). This is a correctness
  bug that will flip the close-combat vs ranged-combat decision.

- **`pev.fuser1` / `pev.fuser2`** at offsets 0x120 / 0x11c are written
  `0x3f800000` (= 1.0f). The TS labels them `pev.fuser1` / `pev.fuser2`
  — these are HLSDK entvars fields (`pev->fuser1`, `pev->fuser2`), so
  the names are correct. ✓ (no fix needed)

- **The W_FireBullets call** at 0x76d9e pushes a stack of ~9 args including
  `WORD PTR [ebp+0x96c]` (a 16-bit weapon id, not the field name `m_iWeaponId`
  the TS uses — that field is normally a `string_t` or similar). Also
  `player.m_iUser` at `[edx+0x208]` is `pev->iuser3`, not `m_iUser`.

Suggested rewrite (full TS function):

```typescript
// NOTE: this is a STRUCTURAL rewrite that fixes the blockers above.
// Field names remain TODO until verified against CTSGun's layout.

import {
  Vector,
  // externals — TODO: declare in a single externals.ts module
} from "./externals";

declare const player: any;       // CBasePlayer
declare const this_: any;        // CTSGun (renamed to avoid shadowing)
declare const pev: any;          // pev_t = player.pev
declare function UTIL_WeaponTimeBase(): number;
declare function UTIL_MakeVectors(v: Vector): void;
declare function GetMeleeMultiplier(p: any): number;
declare function KungFu(p: any): boolean;
declare function CloseCombatAttack(p: any, origin: Vector, fwd: Vector,
  traceMask: number, dmg: number, kd: number, b: boolean, u: number,
  hit: Vector, k: number): boolean;
declare function BlockPlayer(p: any, kd: number): void;
declare function W_FireBullets(...args: any[]): void;
declare function RANDOM_LONG(min: number, max: number): number;
declare function player_GetAutoaimVector(p: any, scale: number): Vector;
// cvars — TODO: resolve names from strings-n5.txt and the [ebx±k] offsets
declare const cvar_closeCombat_range: number;       // [ebx-0x6e7f4]
declare const cvar_closeCombat_main: number;        // [ebx-0x6f408]  ≈ 1.0
declare const cvar_closeCombat_other: number;       // [ebx-0x6f3fc]  ≈ 1.0
declare const cvar_closeCombat_max: number;         // [ebx-0x6f3f8]
declare const cvar_closeCombat_min: number;         // [ebx-0x6de8c]
declare const cvar_closeCombat_damMul: number;      // [ebx-0x6debc]
declare const cvar_closeCombat_damMax: number;      // [ebx-0x6dec4]
declare const cvar_closeCombat_lowMul: number;      // [ebx-0x6ecd8] QWORD/double
declare const cvar_closeCombat_lowMin: number;      // [ebx-0x6ecc8] QWORD
declare const cvar_closeCombat_lowMax: number;      // [ebx-0x6de20] QWORD
declare const cvar_closeCombat_bigKick: number;     // [ebx-0x6dee8]
declare const cvar_closeCombat_farDelay: number;    // [ebx-0x6df04]
declare const cvar_closeCombat_kfDelay: number;     // [ebx-0x6de80]
declare const cvar_closeCombat_kfDamage: number;    // [ebx-0x6de7c]
declare const cvar_closeCombat_sweep: number;       // [ebx-0x6ec2c]
declare const cvar_closeCombat_kickDur: number;     // [ebx-0x6de78]
declare const cvar_closeCombat_highKick: number;    // [ebx-0x6df78]
declare const cvar_closeCombat_lowDelay: number;    // [ebx-0x6de88]
declare const cvar_closeCombat_jumpDelay: number;   // [ebx-0x6de84]
declare const cvar_closeCombat_jumpDuration: number;// [ebx-0x6e810]
declare const cvar_closeCombat_jumpHigh: number;    // [ebx-0x6f078]
declare const cvar_closeCombat_jumpLow: number;     // [ebx-0x6f06c]
declare const cvar_closeCombat_kfTime: number;      // [ebx-0x6df4c]
declare const cvar_closeCombat_backKick: number;   // [ebx-0x6dec8]
declare const cvar_closeCombat_backKick2: number;  // [ebx-0x6de6c]
declare const cvar_closeCombat_rampage: number;     // [ebx-0x6deb0]
declare const cvar_closeCombat_expDelay: number;    // [ebx-0x6f3f4]
declare const cvar_closeCombat_lowDelta: number;    // [ebx-0x6df6c]
declare const cvar_closeCombat_bigKickDur: number;  // [ebx-0x6e7e8]

export function CCombatAttack(this_: any): void {
  const player = this_.m_pPlayer;
  const pev = player.pev;
  const velocity = pev.velocity;
  const velocityMag = Math.hypot(velocity.x, velocity.y, velocity.z);

  const now = UTIL_WeaponTimeBase();
  if (now < player.m_flNextAttack /* [esi+0x12c] */) return;
  if (now < this_.m_flNextPrimaryAttack /* [ebp+0x9c] */) return;
  if (now < this_.m_flTimeWeaponIdle /* [ebp+0xa0] */) return;

  // ---- local state defaults (TODO: field names unverified) ----
  let attackType: 2 | 3 = 2;
  let damage = 0;
  let damageMult = 0;
  let sequence = 0;
  let animIdx = 0;
  let duration = cvar_closeCombat_main;       // [esp+0x24]
  let kickDuration = cvar_closeCombat_main;   // [esp+0x20]
  let kickDelay = cvar_closeCombat_main;      // [esp+0x1c]
  let applyBlock = false;
  let doFireBullets = true;
  const isDoingAction = (pev.flags & 0x50c30) !== 0; // [esp+0x6]

  // ---- pre-compute derived fields ----
  // TODO(asm-ambiguous): each offset below is a *different* field on the
  // player entity, NOT a pev.flags bit. Names TBD.
  const player_f180 = pev; // pseudo — really *(uint8*)(player+0x180)
  const player_f1a5 = pev;
  const player_f814 = pev; // 0x814 — TODO name
  const player_f815 = pev; // 0x815 — TODO name
  const hasA = !!(player_f1a5.readU8(0x1a5) & 0x2);
  const hasB = !!(player_f1a5.readU8(0x1a5) & 0x40);
  const hasC = !!(player_f180.readU8(0x180) & 0x4);
  const hasD = !!(player_f180.readU8(0x180) & 0x1);
  const hasE = !!(player_f180.readU8(0x180) & 0x10);
  const isFrozen = !!(player_f180.readU8(0x180) & 0x800);

  // ====== close-combat range check (0x761a6) ======
  // asm: jne 0x76298 if velocityMag > range  →  goto ranged branch
  //      else fall through to UTIL_MakeVectors path
  let isCloseCombat = false;
  if (velocityMag > cvar_closeCombat_range) {
    // ---- ranged: pick attackType based on player-state flag (0x76298) ----
    attackType = (hasE ? 3 : 2) as 2 | 3;
    // jmp to in-water check at 0x76314 (after applyAttack setup)
    return processRanged();
  } else {
    isCloseCombat = true;
  }

  // ---- close-combat main path (0x761ae) ----
  // Copy pev.origin → local forward, zero x
  const fwd: Vector = { x: 0, y: pev.origin.y, z: pev.origin.z };
  UTIL_MakeVectors(fwd);

  // Compute unit velocity, fall back to (0,0,1) if mag ≈ 0
  const vp = velocity;
  const vmag = velocityMag;
  let unit: Vector;
  if (vmag > cvar_closeCombat_other) {
    // [eax+0xac] sqrt reload → magnitude > 1 → safe to divide
    unit = { x: 0, y: 0, z: cvar_closeCombat_other };
  } else {
    const inv = cvar_closeCombat_other / vmag;
    unit = { x: vp.x * inv, y: vp.y * inv, z: vp.z * inv };
  }

  // Dot product selects forward (==2) vs back (==3)
  const dot = unit.x * vp.x + unit.y * vp.y + unit.z * vp.z;
  attackType = (dot > /* closeCombatMulti [ebx-0x6de40] QWORD */ 0 ? 3 : 2) as 2 | 3;

  if (!isDoingAction) {
    return processCloseCombatPath();   //0x76458
  }

  // ---- in-water branch (0x76314) ----
  if (!hasD) {
    // not in water → frozen branch (0x76458) again
    return processCloseCombatPath();
  }
  // in water → process
  return processInWater();

  // ---- helpers ----
  function processRanged(): void { /* TODO */ }
  function processCloseCombatPath(): void { /* TODO */ }
  function processInWater(): void { /* TODO */ }
  // ...
}
```

Note on the suggested rewrite: I've intentionally extracted the three
top-level branches (ranged, close-combat-not-action, in-water) as
functions and stopped at the first TODO boundary rather than
half-translating the rest. This is more honest than producing 1500
lines of `goto applyAttack` chains. The remaining ~3000 bytes of asm
should be decompiled branch-by-branch with `HANDOFF.md` updates per
branch, not as a single monolithic pass.

Bottom line: the reviewer should not accept this as a faithfuldecompilation. Push back, fix the compile errors, attribute the
entity-offset fields correctly, resolve the cvar names against
`strings-n5.txt`, and re-decompile each of the three branches (ranged,
close-combat, in-water) as separate functions tied to the 0x76078 / 0x761ae
/ 0x76314 entry points.
```
