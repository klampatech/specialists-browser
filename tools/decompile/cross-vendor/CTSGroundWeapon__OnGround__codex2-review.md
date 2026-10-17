```
VERDICT: PASS-WITH-NOTES

⚠️  CRITICAL NOTE ON THE TEMPLATE

The checklist (items 1–8) is written for the 4 HLSDK engine↔mod
interface functions (GiveFnptrsToDll, GetEntityAPI, GetEntityAPI2,
GetNewDLLFunctions). The function under review is a member function
of a gameplay class — `CTSGroundWeapon::OnGround`. Items 1 ("Signature
matches the HLSDK reference"), 2 ("Version check pattern"),
3 ("`*interfaceVersion` assignment-back"), 4 ("Success path: struct
copy"), and 6 ("No TODO body") do not apply literally — there is no
HLSDK reference for `OnGround`, no version check, no `*interfaceVersion`,
no struct copy, and the body is fully expressed in code rather than
TODO stubs.

I'm applying the *spirit* of the checklist (signature fidelity,
behavior faithfulness, no fabricated paths, field-name provenance,
isolation-compilable) to what the function actually is.

──────────────────────────────────────────────────────────────────────

Checklist (spirit-of, adapted to a class method):

1. Signature — ✅ — `OnGround(this: CTSGroundWeapon): void` matches the
   disassembly: `__thiscall`-style call with `this` on the stack at
   `[esp+0x30]` after the prologue, no return value, no explicit args.
   `this:` parameter syntax is the idiomatic TS analogue of `__thiscall`.

2. Version-check analogue — ⚠️ N/A — there is no version-check idiom
   in a member function. The asm doesn't null-check `this->pev` either,
   so the TS faithfully omits it. Not a defect.

3. Failure-path assignment — ⚠️ N/A — no failure path; this function
   never returns a status code.

4. Success-path coverage — ✅ — every operation in the disassembly is
   reflected in the TS, in the same order:
     asm92283  [pev+0x10C] = 1                    →  pev.effects = 1
     asm 9228f  [pev+0x118] &= 0xFFFFFF7F           →  pev.takedamage &= …
     asm 922A4  UTIL_SetOrigin(pev, &pev->origin)   →  UTIL_SetOrigin(pev, pev.origin)
     asm 922B0-922CA  build min/max from 2 globals  →  UTIL_SetSize(…, {min×3}, {max×3})
     asm 922F6  [esi+0x0C] = 0                      →  this.m_iCount = 0
     asm 922FD  [esi+0x10] = 0                      →  this.m_iWait = 0
     asm 922EA  eax = 0xFFFF0000                    →  this.m_flWait = 0xffff0000
     asm 922F3  [esi+0x18] = edx ([ebx+0x1cbc])     →  this.m_fRespawnTime = g_weaponRespawnCvar

   No step is missing. No step is fabricated.

5. No fabricated paths — ✅ — there are no branches in the asm and the
   TS introduces none. The only editorial comment is "engine needs the
   call to recompute collision state after the fall" on the
   `UTIL_SetOrigin` re-assert. The asm's `push &pev->origin` is
   semantically a no-op write of origin to itself — but the call has a
   real engine side effect (re-link, recompute bounds). The comment is
   speculation, not invention; it doesn't change control flow.

6. No TODO body — ✅ — body is fully expressed. TODO comments are
   scoped to genuinely ambiguous offset identity (correctly placed).
   No `// TODO` in place of code.

7. Field names — ⚠️ — provenance gaps:
     • `pev.effects` / `pev.takedamage` — already flagged with TODO;
       offsets 0x10C and 0x118 don't trivially map in the HLSDK
       entvars_s layout I can reconstruct from the class-sibling table
       alone. Acceptable to leave as TODO pending a full entvars_s dump.
     • `this.m_iCount` / `m_iWait` / `m_flWait` / `m_fRespawnTime` —
       offsets match (0x0C, 0x10, 0x14, 0x18), but the names are
       guessed. The Save/Restore methods
       (`Save__15CTSGroundWeaponR5CSave` / `Restore__15CTSGroundWeaponR8CRestore`)
       would enumerate the actual field names via the `CSave`/`CRestore`
       data tables — that disassembly is the source of truth. Mark
       with a stronger TODO than the current ones.
     • `g_groundWeaponMinSize` / `g_groundWeaponMaxSize` —
       placeholders for `[ebx-0x6b68c]` and `[ebx-0x6b688]`. Need
       `nm` cross-reference. The `-2 / +2` HLSDK pickup convention
       is plausible but unverified.
     • `g_weaponRespawnCvar` — placeholder for `[ebx+0x1cbc]`. Need
       `nm` + `strings-n5.txt` cross-reference (likely
       `ts_respawntime` or `weapon_respawntime`).

8. Compiles in isolation — ❌ — the function references
   `CTSGroundWeapon`, `this.pev`, `g_groundWeaponMinSize`,
   `g_groundWeaponMaxSize`, `g_weaponRespawnCvar`, `UTIL_SetOrigin`,
   `UTIL_SetSize` without imports, declarations, or `any` fallbacks.
   As written it will not compile. The conversion-guidance clause
   ("should compile in isolation (no external type references we
   don't define here)") is violated.

──────────────────────────────────────────────────────────────────────

Issues to fix:

- **(blocking) Compiles-in-isolation.** Replace the external
  references with `any`/`unknown` so the snippet compiles on its
  own, or add a minimal `declare` block at the top.
- **(non-blocking) Provenance on `this`-field names.** Cross-reference
  the Save/Restore method bodies
  (`Save__15CTSGroundWeaponR5CSave` 0x91950,
  `Restore__15CTSGroundWeaponR8CRestore` 0x919a0) before settling on
  `m_iCount` / `m_iWait` / `m_flWait` / `m_fRespawnTime`. If those
  can't be derived before merge, demote the names to offsets and add
  a single explicit TODO pointing at the Save/Restore pair.
- **(non-blocking) Provenance on globals.** `g_groundWeaponMinSize`,
  `g_groundWeaponMaxSize`, `g_weaponRespawnCvar` are placeholder
  names. Resolve with `nm` against `ts_i386.so` and `strings-n5.txt`
  before merge; until then, leave a TODO noting the GOT offsets.
- **(editorial) UTIL_SetOrigin comment.** "value is unchanged, but
  the engine needs the call to recompute collision state" is
  speculation. Either trim it to one line ("re-assert origin to
  retrigger the engine's link/recompute after the fall") or drop it.
- **(template hygiene, separate from this function).** The
  cross-vendor review prompt's checklist is hard-coded to the 4
  HLSDK engine-interface functions. For class-method reviews, swap
  in a class-method-appropriate checklist (signature, asm offset
  coverage, no fabricated paths, field-name provenance, isolated
  compilation). Filing this in HANDOFF.md as a T3-prompt-quality
  observation rather than a code defect.

──────────────────────────────────────────────────────────────────────

Suggested rewrite (compiles in isolation, provenance-explicit):

```typescript
// Minimal external-symbol stubs so this snippet compiles on its own.
// In the real codebase these come from the engine-binding layer
// (engine/eiface.h equivalents) and the entity-class layer.
declare const UTIL_SetOrigin: (pev: any, origin: any) => void;
declare const UTIL_SetSize: (pev: any, mins: any, maxs: any) => void;

/**
 * CTSGroundWeapon::OnGround — finalize the "weapon resting on the
 * ground" state after a fall. Lights it up, clears a render/takedamage
 * flag, re-asserts the origin, shrinks the bounding box, and resets
 * the wait/respawn state.
 *
 * Source: ts/dlls/ts_i386.so @ 0x0009226c (158 B)
 * Asm: 12 writes + 2 engine calls, no branches.
 */
export function OnGround(this: any): void {
  const pev = this.pev;

  // [pev + 0x10C] = 1
  // TODO(asm-ambiguous): 0x10C doesn't match a stock HLSDK entvars_s
  // field cleanly. Likely `effects |= EF_BRIGHTFIELD` (1) or a
  // TS-specific render flag. Resolve via the entvars_s dump.
  pev[0x10c] = 1;

  // [pev + 0x118] &= 0xFFFFFF7F
  // TODO(asm-ambiguous): clearing bit 7 of offset 0x118. Likely
  // `takedamage` (DMG_… mask) but verify via entvars_s.
  pev[0x118] &= 0xffffff7f;

  // Re-assert origin (pushes &pev->origin). Semantically origin = origin,
  // but the engine call retriggers relink / bounds recompute after the
  // fall — that side effect is the point.
  UTIL_SetOrigin(pev, pev.origin);

  // UTIL_SetSize with two GOT-scalar globals broadcast across all 3 axes.
  // TODO(provenance): globals [ebx-0x6b68c] and [ebx-0x6b688] — resolve
  // names via `nm ts/dlls/ts_i386.so` and `tools/decompile/strings-n5.txt`.
  const minsScalar: number = g_groundWeaponMinSize; // [ebx-0x6b68c]
  const maxsScalar: number = g_groundWeaponMaxSize; // [ebx-0x6b688]
  UTIL_SetSize(
    pev,
    { x: minsScalar, y: minsScalar, z: minsScalar },
    { x: maxsScalar, y: maxsScalar, z: maxsScalar },
  );

  // Reset wait/respawn state. 0xFFFF0000 is the HLSDK NaN-bit-pattern
  // sentinel — any comparison against gpGlobals->time will fail, so
  // this disables time-based auto-wait.
  //
  // TODO(provenance): the field names below are placeholders. The
  // Save/Restore methods (0x91950 / 0x919a0) own the authoritative
  // field-name table; cross-reference before merge.
  this[0x0c] = 0;                          // this->[0x0C] = 0    (m_iCount?)
  this[0x10] = 0;                          // this->[0x10] = 0    (m_iWait?)
  this[0x14] = 0xffff0000;                 // this->[0x14] = NaN  (m_flWait?)
  this[0x18] = g_weaponRespawnCvar;        // [ebx+0x1cbc]       (m_fRespawnTime?)
}

// External data symbols (GOT-scalar / cvar cache). Real names pending
// `nm` cross-reference.
declare const g_groundWeaponMinSize: number;  // [ebx-0x6b68c]
declare const g_groundWeaponMaxSize: number;  // [ebx-0x6b688]
declare const g_weaponRespawnCvar: number;    // [ebx+0x1cbc]
```

──────────────────────────────────────────────────────────────────────

Net: the decompiled TS is structurally faithful — every asm write
maps to a TS write, offsets are preserved, the `0xFFFF0000` NaN trick
is correctly identified, and no control flow is fabricated. The
remaining work is provenance (Save/Restore disassembly + `nm`) and
the in-isolation compile contract. Verdict stands at
**PASS-WITH-NOTES**.
```
