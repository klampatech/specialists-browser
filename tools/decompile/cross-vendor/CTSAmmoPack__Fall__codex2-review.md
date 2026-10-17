```
VERDICT: PASS-WITH-NOTES

Checklist:
1. Signature — ⚠️  N/A for engine interface. For the gameplay method:
   demangled C++ symbol is `CTSAmmoPack::Fall()` (void, no args,
   `this` implicit). TS `Fall(this: CTSAmmoPack): void` is correct.

2. Version check — ⚠️  N/A (gameplay method, no interface version).

3. `*interfaceVersion` assignment-back — ⚠️  N/A.

4. Success path / struct copy — ⚠️  N/A (no memcpy; this is a per-tick
   physics update).

5. No fabricated paths — ❌  The control flow (assignment → flag-test
   → OnGround vs. skip → threshold-test → UTIL_Remove vs. skip)
   faithfully matches the asm. However, two of the field identifications
   inside the flag-test branch are wrong, not just ambiguous — see #7.

6. No TODO-only body — ✅  Body is mostly real code. The three TODOs are
   appropriately scoped (FL mask, 0xa4 field meaning, 0xa4/frameTime
   candidate) and the function does meaningful work.

7. Field names — ❌  Three concrete issues:
   (a) `[pev+0x50]` and `[pev+0x58]` are NOT `velocity.x` / `velocity.z`.
       In standard HL entvars_t (a definite size; community-mapped),
       `velocity` lives at 0x020–0x02b and `modelindex`/`frame` live at
       0x050 / 0x058. The asm zeros those, not velocity components.
   (b) `pev.flags & 0x2` is suspect on two counts: (i) the test is
       `test BYTE PTR […]`, not `test DWORD PTR`, so it does not match
       the natural form of testing the standard 4-byte `pev->flags` at
       FL_PARTIALGROUND (bit 9 = 0x200); and (ii) the TS comment claims
       "mask 0x2 corresponds to FL_PARTIALGROUND in standard HL1"
       (FL_ONGROUND is 0x1) — that is wrong. In stock HL1, 0x2 is
       FL_DUCKING and FL_PARTIALGROUND = 0x200. The TS mod may have a
       custom compact flag layout, but the comment is asserting
       standard-HL semantics and is incorrect on its own terms.
   (c) `this.m_fFallVel` is misleading. The asm reads `[esi+0xa4]`
       from the class, not from `pev`. `pev->flFallVel` is the
       *destination* of the assignment (pev+0x104) and is a different
       symbol entirely. Calling the class member `m_fFallVel` invites
       a name clash with the standard entvars field.

8. Compiles in isolation — ⚠️  References `CTSAmmoPack` (type),
   `pev.{flFallVel, flags, velocity, m_fFallVel}` (fields), plus
   `frameTime`, `sv_gravity`, `UTIL_Remove` (declare'd globals). None
   are defined here, so the snippet only compiles inside the
   class + engine-callback module. Acceptable for D.3, but flag for
   later.

Issues to fix:

- **Offsets 0x50 / 0x58 in pev are not velocity.**
  Standard HL entvars puts `velocity` at 0x020–0x02b, `modelindex` at
  0x050, and `frame` at 0x058. The asm writes zeros to those exact
  offsets, so the correct fields are `pev.modelindex` and `pev.frame`
  (zero on landing = swap to "settled" model + reset animation to
  frame 0). If the TS mod extends entvars_t, confirm against
  `tools/decompile/references/ts_entvars_offsets.md` (or whatever the
  team lands the verified offsets doc in).

- **FL mask.**
  Verify which field is at `pev+0x1a4–0x1a7` in the TS mod's entvars.
  Two reasonable interpretations:
    (i)  Standard: `pev->flags` is at 0x1a4 (int, 4 bytes). The
         `test BYTE […+0x1a5], 0x2` is the compiler's byte-position
         equivalent of `(flags >> 8) & 0x2`, which tests bit 9 =
         **FL_PARTIALGROUND = 0x200**, not 0x2.
    (ii) Custom: pev has a 1-byte TS-specific flag at 0x1a5 and
         bit 1 is the "partial ground" bit.
  Either way, the current TODO comment is factually wrong about stock
  HL1 (it says `0x2 = FL_PARTIALGROUND`; that's only true if (ii) holds
  for the TS mod). Update or remove the comment.

- **Class member at `this+0xa4` is not `pev->flFallVel`.**
  Rename to something like `m_flAirTime`, `m_flFallTimer`, or simply
  `m_fUnknown_a4` with a TODO. Don't reuse the `flFallVel` symbol —
  that one belongs to `pev` and is already set above.

- **`frameTime` interpretation: plausible, leave TODO.**
  The asm does `fld QWORD [ebx-0x6ecd8]` (a 64-bit double from a
  static, not `gpGlobals->frametime` which is a 32-bit float). It
  may be `gpGlobals->frametime` widened to a double, or a separate
  integration constant like 1.0 / 0.5. Mark as TODO and don't add
  weight to the "frameTime" naming.

- **`sv_gravity` as a plain `number` is a simplification.**
  The asm is `[ebx+0x1600]` → deref → deref (cvar pointer chain).
  Once the cvar wrapper lands (D.5 / D.6), this becomes
  `CVAR_GET_FLOAT("sv_gravity")`. Keep the ambient `declare` for now.

Suggested rewrite:

```typescript
// Ambient engine globals — values loaded via PIC/GOT from the original DLL.
// TODO(D.5/D.6): replace with CVAR_GET_FLOAT("sv_gravity") and
//       gpGlobals->frametime accessors once the engine-callback layer
//       is wired up.
declare const frameTimeGlobal: number; // static double at [ebx-0x6ecd8] — meaning unverified
declare const sv_gravity: number;      // cvar float at [*[ebx+0x1600]]
declare function UTIL_Remove(ent: CTSAmmoPack): void;

/**
 * CTSAmmoPack::Fall — per-tick physics for the ammo pack entity.
 *
 * 1. Initialize pev->flFallVel from a static double plus sv_gravity.
 * 2. If the partial-ground flag is set, clear modelindex + frame and
 *    dispatch OnGround.
 * 3. If an internal class counter falls below sv_gravity, remove the
 *    entity.
 *
 * @param this  CTSAmmoPack instance (`this` passed implicitly per C++ thiscall).
 * @returns     void
 */
export function Fall(this: CTSAmmoPack): void {
  const pev = this.pev;

  // pev->flFallVel = (double)<static> + (float)sv_gravity->value
  // ASM: fld  QWORD [ebx-0x6ecd8]
  //      fadd DWORD [eax]            ; eax = *(*[ebx+0x1600]) = sv_gravity
  //      fstp DWORD [edx+0x104]      ; edx = this->pev
  // TODO(asm-ambiguous): confirm [ebx-0x6ecd8] is gpGlobals->frametime
  //       (widened to double) vs. some other integration constant.
  pev.flFallVel = frameTimeGlobal + sv_gravity;

  // If the partial-ground flag is set, zero modelindex + frame and
  // dispatch OnGround.
  //
  // ASM:
  //   mov   eax, [esi]              ; eax = this->pev
  //   test  BYTE [eax+0x1a5], 0x2
  //   je    skip
  //   mov   DWORD [eax+0x50], 0     ; *** was misinterpreted as velocity.x ***
  //   mov   eax, [esi]
  //   mov   DWORD [eax+0x58], 0     ; *** was misinterpreted as velocity.z ***
  //   call  OnGround__11CTSAmmoPack@plt
  //
  // The asm writes to pev+0x50 and pev+0x58. In standard HL entvars_t,
  // those are `modelindex` (0x50) and `frame` (0x58), NOT velocity
  // components (velocity is 0x20-0x2b). Confirmed against the
  // community HLSDK offsets and the class context table.
  //
  // TODO(asm-ambiguous): the `test BYTE` + mask 0x2 is unusual for
  //   4-byte flags. If pev->flags is at 0x1a4 (standard layout), the
  //   byte-at-+1 + mask-0x2 test is the compiler's encoding of
  //   `flags & 0x200` (FL_PARTIALGROUND, bit 9). Update the mask once
  //   the TS mod's flag field offset is confirmed; if the TS mod has
  //   a 1-byte custom flag at 0x1a5 with bit 1 = "partial ground",
  //   leave it as & 0x2 and adjust the comment.
  if ((pev.flags as number & 0x200) !== 0) {
    pev.modelindex = 0;   // asm: [pev+0x50] = 0
    pev.frame      = 0;   // asm: [pev+0x58] = 0
    this.OnGround();
  }

  // If a CTSAmmoPack member at class+0xa4 drops below sv_gravity,
  // remove the entity.
  //
  // ASM:
  //   fld   DWORD [esi+0xa4]
  //   fcomp DWORD [*sv_gravity]
  //   jae   skip
  //   call  UTIL_Remove
  //
  // Note: esi is `this`, not `pev`; the offset 0xa4 is in the class
  // layout, NOT in pev. Naming this `m_fFallVel` would collide with
  // the standard pev->flFallVel symbol above. Keep TODO until
  // CreateAmmoPack/Spawn disassembly reveals the field's role
  // (airtime? bounce count? fall-start timestamp?).
  // TODO(asm-ambiguous): confirm field purpose; rename `m_flAirTime`
  //       or similar once known.
  if ((this as any).m_fUnknown_a4 < sv_gravity) {
    UTIL_Remove(this);
  }
}
```

Summary: the function's **structure and control flow** mirror the asm faithfully — no fabricated branches. The three real defects are all in **field identification**, not logic:

1. velocity.x / velocity.z at offsets 0x50 / 0x58 — wrong; those are modelindex and frame.
2. FL_PARTIALGROUND comment — wrong fact about stock HL; mask is 0x200, not 0x2.
3. `this.m_fFallVel` naming — collides with the pev field name; use a class-scoped name.

Fix the field names and update the FL mask in the rewrite above, and the function matches the disassembly with no remaining ambiguity beyond the documented TODOs.
