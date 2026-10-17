```
VERDICT: PASS-WITH-NOTES

Note on checklist applicability: The 8-item checklist is scoped to the
4 HLSDK mod↔engine entry points (GiveFnptrsToDll, GetEntityAPI,
GetEntityAPI2, GetNewDLLFunctions). The function under review,
CTSStunt::CheckForWallDive, is a TS gameplay method on a custom entity
class — not an interface entry point. Items 2 (version check) and 3
(*interfaceVersion assignment) do not apply. The rest are applied
where meaningful.

Checklist:
1. Signature — ✅ — Demangled symbol is `CTSStunt::CheckForWallDive()`.
   TS binding is `CheckForWallDive(this: CTSStunt): boolean`. Asm reads
   `this` from `[esp+0x90]` (= original `[esp+0x10]` after the 4 pushes
   + `sub esp,0x7c`), and returns `al` (0 or 1). C++-style implicit
   `this` and bool return match. ✓

2. Version check — N/A — Not an HLSDK entry point.

3. *interfaceVersion assignment — N/A — Not an entry point.

4. Success path — ✅ — The function returns a single boolean indicating
   "can the player initiate a wall dive now". Asm semantics: `al=1`
   iff every gate passes; `al=0` otherwise. TS: `return true|false`.
   The four gates (FL_ONWALL check → flFraction≥1.0 → planeNormal
   band → velocity.z threshold) and the single success path match the
   asm's `jne 8ae61` / `jae 8ae61` / `(cl=0 path)` / `(velocity ≤ thr
   path)` / fall-through → `al=1` structure exactly. FPU semantics
   verified (test ah,0x41 fires on `st(0) ≤ source` for ordered
   comparisons; `mov dl,1` only happens on the > branch, so the final
   `jne 8ae63` correctly encodes "velocity.z > threshold").

5. No fabricated paths — ✅ — Every control-flow branch in the TS
   maps to a jcc/fall-through in the asm. No invented arithmetic, no
   invented exception handling, no invented side effects.

6. No TODO body — ✅ — The function body is fully implemented; TODO
   comments mark offset/value ambiguities (acceptable per the
   conversion guidance). No `// TODO: fill this in` stubs.

7. Field names — ⚠️
   - `pev.flags & 0x200` (line 1) — asm: `test BYTE PTR [eax+0x1a5],
     0x2`. That's bit 1 of the byte at +0x1a5, which equals bit 9 of
     the DWORD at +0x1a4. So semantically "(int at +0x1a4) & 0x200".
     HLSDK `entvars_t.flags` lives at offset 0x104, not 0x1a4 — TS is
     either using a custom flags alias or has reordered entvars_t.
     Field name is plausible but unverified. The "FL_ONWALL = 0x200"
     bit-mask assertion in the comment is fine for D.3 placeholder
     purposes; flag it for TS-side verification.

   - `pev.v_angle` (passed to UTIL_MakeVectors) — asm: `add eax,0x74`
     → pushes `pev+0x74`. HLSDK `v_angle` is at offset 0x118, not
     0x74. Could be a TS Player-class-relative Vector slot, or a
     pev alias offset relative to a derived class's vtable. The
     existing TODO does not call out this discrepancy. Should add a
     second TODO line flagging the 0x74 vs 0x118 mismatch.

   - `pev.origin` at offsets 0x8/0xc/0x10 — asm: `esi = pev+0x8`,
     then `[esi+0x4]=pev+0xc`, `[esi+0x8]=pev+0x10`. HLSDK origin is
     at 0xc (so origin.x at 0xc, .y at 0x10, .z at 0x14). TS appears
     to use offsets 8/0xc/0x10 — i.e., origin shifted earlier by 4
     bytes. Vector math is internally consistent (end = origin −
     scale·v_forward, component-wise), but the offset discrepancy
     should be noted in the TS comment, not papered over.

   - `pev.velocity.z` accessed via `pev+0x28` — asm: `eax=pev+0x20`,
     `[eax+0x8]=pev+0x28`. HLSDK velocity.z is at 0x2c. Same 4-byte
     shift observed above.

   - `pev.euser1` for the ignore entity — asm: `[ecx+0x208]`.
     HLSDK `pev->euser1` is **exactly** offset 0x208. ✓

   - `tr.flFraction` — asm loads `[esp+0x60]` to `fcomp 1.0`. With
     standard TraceResult layout (flFraction at offset 0x10), the
     stored tr starts at `[esp+0x50]`. Likely ✓; offsets within the
     post-call stack frame shift due to the 5-arg push.

   - `tr.vecPlaneNormal.z` — asm loads `[esp+0x5c]`. That parses as
     `+0xc` within a tr starting at `[esp+0x50]`, which would be
     `fInOpen`, not the plane normal. Either TS's TraceResult layout
     differs from HLSDK's, OR tr starts a bit earlier than I computed
     (likely the case given the arg-push arithmetic). The
     ".z-of-plane-normal" semantic interpretation is correct
     (verticality check on the wall's normal component), but the
     exact offset within tr is not pinned down by the asm. TODO
     acceptable; suggest bumping TODO specificity.

   - **`gpGlobals.v_forward` (line 24) — MISNAMED.** Asm:
     `eax = *(*([ebx+0x1600]))`, then reads offsets 0x28/0x2c/0x30.
     This is the engine's global vector table (typically named
     `g_vecForward` / `g_vecRight` / `g_vecUp` in HLSDK), not a
     field of gpGlobals. gpGlobals is globalvars_t and has no
     `v_forward` field. After `UTIL_MakeVectors`, the vectors live
     in those engine globals. Suggested rename to `g_vecForward` or
     similar. The current TS silently papers over a layout that the
     asm implies is a custom engine-vector struct at `[ebx+0x1600]+0x28`.

8. Compiles in isolation — ⚠️
   The function body references several globals / types that are not
   declared in this file:
   - `wallDiveTraceScale`, `wallNormalZMin`, `wallNormalZMax`,
     `wallDiveVelocityZThreshold` — undefined numeric globals
     (`any`-tolerant? still need declaration to compile)
   - `gpGlobals` — undefined, also misnamed per item 7
   - `UTIL_MakeVectors`, `UTIL_TraceLine` — undefined functions
   - `IGNORE_MONSTERS` — undefined constant (= 1)
   - `TraceResult` — used as a constructor `new TraceResult()`
   - `CTSStunt` — referenced in the signature as `this`, but only as
     a type annotation (would compile if any-unknowned)

   For strict isolation (`tsc --noEmit` against just this file), add
   stub `declare`s or move the globals to module-level.

Issues to fix:
- Rename `gpGlobals.v_forward` to `g_vecForward` (or appropriate
  engine-vector global) — it is not a gpGlobals field.
- Add a second TODO line at the `v_angle` site calling out the
  0x74 vs HLSDK's 0x118 offset discrepancy (the existing TODO only
  flags the value/sign of [ebx-0x6f068], not the v_angle offset).
- Note the consistent 4-byte early-shift of origin / velocity
  offsets vs HLSDK layout (origin at 0xc in HLSDK, 0x8 here; velocity
  at 0x24 in HLSDK, 0x20 here). Suggest a single shared comment
  near the field accesses.
- Bump the plane-normal TODO to mention that the asm reads
  `[esp+0x5c]`, which is not pinned to a fixed offset within
  `TraceResult` (TraceResult may be packed differently in TS).
- Replace `'// if scale is the [ebx-0x6f068]'` with the more
  accurate description that v_forward comes from
  `*(*([ebx+0x1600]))+0x28..0x30` (engine vector table, not
  gpGlobals).
- For isolated compilation, add module-level `declare`s for
  `wallDiveTraceScale`, `wallNormalZMin/Max`,
  `wallDiveVelocityZThreshold`, `g_vecForward` (Vector),
  `UTIL_MakeVectors`, `UTIL_TraceLine`, `IGNORE_MONSTERS`,
  `TraceResult`, or rely on a dedicated `@types/ts-mod` stub.

Suggested rewrite (full TS function, with the above addressed):

```typescript
// D.3.3 — CTSStunt gameplay method (decompiled from ts_i386.so).
//
// Stub declarations so this file compiles in isolation. Real types
// live in `ts-types/` (D.5 work) and engine/mod header mirrors.
declare const wallDiveTraceScale: number;
declare const wallNormalZMin: number;     // asm: [ebx-0x6f010] (or [ebx-0x6de40]; see below)
declare const wallNormalZMax: number;     // asm: [ebx-0x6de40] (or [ebx-0x6f010]; see below)
declare const wallDiveVelocityZThreshold: number; // asm: [ebx-0x6c32c]
declare const IGNORE_MONSTERS: 1;

declare const g_vecForward: { x: number; y: number; z: number };
declare const g_vecRight:   { x: number; y: number; z: number };
declare const g_vecUp:      { x: number; y: number; z: number };

declare function UTIL_MakeVectors(v: unknown): void;
declare function UTIL_TraceLine(
  vecStart: unknown,
  vecEnd: unknown,
  fIgnMonsters: number,
  pentIgnore: unknown,
  pTraceResult: unknown,
): void;

declare class TraceResult {
  flFraction: number;
  vecEndPos: { x: number; y: number; z: number };
  vecPlaneNormal: { x: number; y: number; z: number };
  // ... rest of HLSDK TraceResult
}

declare class CTSStunt {
  m_pPlayer: {
    pev: {
      // HLSDK + TS-shifted offsets observed in the disassembly:
      //   TS origin is at pev+0x8 (HLSDK: 0xc — TS appears to shift
      //   the start of Vector fields earlier by 4 bytes; same shift
      //   observed for velocity at pev+0x20, HLSDK: 0x24).
      origin:  { x: number; y: number; z: number };
      velocity:{ x: number; y: number; z: number };
      // TODO(asm-ambiguous): verify; asm uses pev+0x74 for the view
      // angles passed to UTIL_MakeVectors. HLSDK v_angle is at 0x118.
      // May be a TS Player-class extension slot.
      v_angle: { x: number; y: number; z: number };
      euser1: unknown;
      // TODO(asm-ambiguous): asm tests BYTE [pev+0x1a5] & 0x2, which
      // equals bit 9 of the DWORD at pev+0x1a4. HLSDK flags is at
      // 0x104, so TS likely uses a custom field or has reordered
      // entvars_t. The 0x200 (= bit 9) mask is the TS-side
      // "FL_ONWALL" assumption — verify against `strings-n5.txt`
      // and `FL_*` enum dumps (D.4 work).
      flags: number;
    };
  };
}

/**
 * CTSStunt::CheckForWallDive — probes whether the player can initiate
 * a wall-dive stunt right now.
 *
 *  Asm flow summary:
 *    1. if (pev+0x1a5 & 0x2) return false         // already on a wall
 *    2. UTIL_MakeVectors(pev+0x74)                // refresh engine v_*
 *    3. vecEnd = origin - scale * v_forward       // asm: scale*[ebx-0x6f068]
 *    4. UTIL_TraceLine(origin, vecEnd, IGNORE_MONSTERS, pev->euser1, &tr)
 *    5. if (tr.flFraction >= 1.0) return false
 *    6. if (planeNormal.z < lower || planeNormal.z > upper) return false
 *    7. if (velocity.z <= threshold) return false
 *    8. return true
 *
 * @returns true if a wall dive is feasible, false otherwise.
 */
export function CheckForWallDive(this: CTSStunt): boolean {
  // Gate 1: bail if already on a wall.
  // TODO(asm-ambiguous): confirm flag offset / "FL_ONWALL" naming in TS.
  const pev = this.m_pPlayer.pev;
  if ((pev.flags & 0x200) !== 0) return false;

  // Refresh the engine's g_vecForward / g_vecRight / g_vecUp from the
  // player's view angles.
  UTIL_MakeVectors(pev.v_angle);

  // Gate 2: cast a trace straight ahead of the player, ignoring monsters.
  // The trace endpoint is origin − scale·g_vecForward, with `scale` taken
  // from the negative-distance global at [ebx−0x6f068] (the negative
  // sign pushes the endpoint forward along g_vecForward).
  // TODO(asm-ambiguous): exact float value at [ebx-0x6f068]; sign + magnitude
  // (used in the negate-then-fsub pattern at 8ada0…8adc1).
  // TODO(asm-ambiguous): TS origin/velocity offsets shifted ~−4 bytes vs
  // HLSDK entvars_t; see CTSStunt.pev type declaration above.
  const end = {
    x: pev.origin.x - wallDiveTraceScale * g_vecForward.x,
    y: pev.origin.y - wallDiveTraceScale * g_vecForward.y,
    z: pev.origin.z - wallDiveTraceScale * g_vecForward.z,
  };

  const tr = new TraceResult();
  UTIL_TraceLine(
    pev.origin,
    end,
    IGNORE_MONSTERS,  // = 1
    pev.euser1,       // asm: [pev+0x208] == HLSDK pev->euser1. ✓
    tr,
  );

  // Gate 3: trace must have hit something within the scaler window.
  if (tr.flFraction >= 1.0) return false;

  // Gate 4: hit surface must be roughly vertical (plane normal Z within
  // the open interval (wallNormalZMin, wallNormalZMax)).
  // TODO(asm-ambiguous): exact thresholds at [ebx−0x6f010] and [ebx−0x6de40];
  // the asm does a > upper (jae) then a <= lower (test ah,0x41 / jne) check.
  // TODO(asm-ambiguous): plane-normal field accessed as [esp+0x5c] post-call;
  // not pinned to a fixed offset within `TraceResult` in TS.
  const nz = tr.vecPlaneNormal.z;
  if (nz >= wallNormalZMax || nz <= wallNormalZMin) return false;

  // Gate 5: player must be moving downward fast enough (or upward fast
  // enough?) past the threshold to "stick" the dive.
  // TODO(asm-ambiguous): exact float at [ebx−0x6c32c].
  // Asm enforces velocity.z > threshold (using fcomp + test ah,0x41 +
  // jne → al=0 on failure).
  if (pev.velocity.z <= wallDiveVelocityZThreshold) return false;

  return true;
}
```

Net: logic, return-value, and control-flow faithfully match the
disassembly. Main deltas vs the original TS are (a) `g_vecForward`
rename (not a gpGlobals field), (b) explicit stub declarations so
the file compiles in isolation, and (c) tightened TODOs that name
the specific offsets in play. D.4 (TS-specific gameplay pass) should
resolve the unresolved [ebx...] float constants via cross-reference
with `strings-n5.txt`, cvar tables, and the player-class header.
