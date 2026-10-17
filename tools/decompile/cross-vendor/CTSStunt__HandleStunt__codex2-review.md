```
VERDICT: PASS-WITH-NOTES

Checklist:
1. Signature — ✅ — `HandleStunt(this: CTSStunt): void` matches the demangled
   C++ signature `CTSStunt::HandleStunt()`. Zero-arg, void return, name matches.

2. Version check — ⚠️ N/A — function is NOT an engine↔mod interface function
   (`GetEntityAPI*`/`GetNewDLLFunctions`/`GiveFnptrsToDll`). The HLSDK reference
   doc provided does not apply to this method. No version check is needed, and
   none is present. ✅ on the meta-check.

3. interfaceVersion assignment — ⚠️ N/A — same reason. No `*interfaceVersion`
   write-back is needed.

4. Success path — ⚠️ N/A — same reason. The function is not a "give me the
   engine's table" version, so no struct-copy / memcpy is needed. The
   bullet-time/dive success path uses the inline `Math.sqrt` + threshold compare
   correctly per the disassembly.

5. No fabricated paths — ✅ — every branch in the TS maps to a real branch
   in the disassembly. I traced all eight paths through the function
   (3 entry points to 0x8b0e8; 4 stunt-action outcomes ×2 button-bit states);
   the if/else / "fall through" structure reproduces the disassembly's control
   flow exactly:
     • bit 0x2 set, wall-climb check succeeds → GoWallClimb + return
     • bit 0x2 set, wall-climb check fails     → skip to 0x8b0e8 (8b088 → 8b0e8)
     • bit 0x2 not set, bit 0x40 not set      → return (8b0a2 → 8b0e8 → 8b198)
     • bit 0x2 not set, bit 0x40 set, WJ pass → GoWallJump + return
     • bit 0x2 not set, bit 0x40 set, WJ fail,
       WD pass                                 → setFlag |0x800000 + GoDive + return
     • bit 0x2 not set, bit 0x40 set, both fail → 8b0d2 → 8b0e8 → bullet-time/dive
   The redundant retest of bit 0x40 at 0x8b0eb is faithfully preserved   (and is required: the path from0x8b088 → 0x8b0e8 arrives with bit 0x40
   state unknown). The `fdivrp`/`fcompp` interpretation at 0x8b140–0x8b155
   (test0x41, jump-if-exit on `>`) is correct: `je 0x8b198` fires iff
   `C3==0 && C0==0` iff `timeSinceStunt > 2.0/playerTimeout`. The TS code
   says the same.

6. No TODO body — ✅ — body is fully expressed in code. Only one
   `// TODO(asm-ambiguous):` marker remains (on the time-since-stunt gate's
   `stuntTimeoutDivisor / playerTimeout` semantics), which is exactly the
   pattern the conversion guidance permits.

7. Field names — ⚠️ — all field names are best-guess TS-side identifiers,
   not standard HLSDK fields. Each is offset-anchored and the disassembly
   numeric offsets appear in inline comments. Specifically:
     • `m_flNextStunt`      @ CTSStunt+0x00
     • `m_flNextAction`     @ CTSStunt+0x04
     • `m_pPlayer`          @ CTSStunt+0x40 → dereferenced as `pev`
     • `m_flLastStuntTime1` @ player+0x79c
     • `m_flLastStuntTime2` @ player+0x7a0
     • `m_bStuntMode`       @ player+0x7a4
     • `m_afButton`         @ player+0x815  (byte, mask 0x40)
     • `m_flLastStunt`      @ player+0xb88  (used in time-since-stunt gate)
     • `pev.flags`          @ pev+0x250 (masks 0xc30, 0x130000, 0x800000)
     • `pev.otherState`     @ pev+0x1a5     (byte, mask 0x2)
     • `pev.velocity.z`     @ pev+0x28
   These are correct offsets but cannot be confirmed against the HLSDK
   reference doc (which covers only the engine↔mod interface functions, not
   `entvars_t` field-by-field). Treat as `D.4`-era verification work.

8. Compiles in isolation — ✅ — `any`-typed `CTSStunt`, `CBasePlayer`,
   `Entvars` plus a self-contained `globals` ambient declaration. No
   external type references. Math.sqrt is a builtin.

Issues to fix (minor):
- The 0xc30 flag comment is wrong. The TS says
  `0xc30 ≈ FL_INWATER | FL_MONSTER | FL_NOTARGET | FL_AIMTARGET`, but
  FL_AIMTARGET = 0x1000, and 0x10+0x20+0x800+0x1000 = 0x1830, not 0xc30.
  0xc30 = 0x10 | 0x20 | 0x400 | 0x800 = FL_INWATER | FL_MONSTER | FL_ONGROUND
  | FL_NOTARGET. Easy comment fix.
- The if/else structure with two "// fall through" markers is faithful to
  the disassembly but reads awkwardly. The wall-climb branch's fall-through
  intentionally SKIPS the wall-jump/wall-dive checks (matches the disassembly's
  0x8b088 → 0x8b0e8 jump), and the redundant retest of bit 0x40 at the end is
  required (the wall-climb-failure path arrives with bit 0x40 state unknown).
  A short comment on the redundant retest explaining WHY it's kept would help
  future readers.
- `m_flLastStunt` at player+0xb88 is read as a single-precision float in the
  disassembly (`fsub DWORD PTR [edx+0xb88]`) but stored as a double via
  `fstp QWORD PTR [esp]` immediately afterward — that promotion is a
  narrow-and-widen implicit in the original code that the TS smooths over  with native number arithmetic. Fine, but worth a one-line note.
- The 0x130000 flag mask (`pev.flags & 0x130000`) is glossed as
  "FL_FROZEN | some TS-specific flag". The actual standard HLSDK bits at
  those positions are FL_FROZEN=0x100000 and TS-specific high-bit custom
  flags (0x10000, 0x20000). Comment is acceptable but a TODO to pin the
  exact TS-side flag names would be nice for D.4 follow-up.

Not issues (verified):
- Signature matches demangled C symbol exactly.
- The `fdivrp %st, %st(1)` at 0x8b146 is correctly interpreted as
  `ST(0) = K / playerTimeout` (FDIVR semantics: source/destination,
  stored in destination, then pop). TS code `stuntTimeoutDivisor / playerTimeout`
  matches the disassembly's `K / playerTimeout` with K = 2.0.
- The `fcompp` + `test ah, 0x41` + `je 0x8b198` at 0x8b14e–0x8b155 is
  correctly interpreted as "exit iff timeSinceStunt > K/playerTimeout"
  (ZF=1 iff `C0==0 && C3==0` iff ST(0) > ST(1)).
- The `fcomp` + `sahf` + `jae 0x8b188` at 0x8b172–0x8b17b is correctly
  interpreted as "if horizSpeed >= minDiveSpeed: GoDive else GoBulletTime".
- Wall-dive success path correctly sets bit 0x800000 BEFORE the GoDive call
  (`or [eax+0x250], 0x800000` → `jmp 0x8b188` (GoDive call site)).

The function is faithful enough to land. Suggested patch (just the comment fixand one readability note) below.
```

```typescript
// --- suggested patch (just the comment fix and one readability note) ---

// In the player-state gate, change the wrong flag comment:
  // 0xc30 = FL_INWATER | FL_MONSTER | FL_ONGROUND | FL_NOTARGET
  // Stunts are disallowed while any of these bits are set on the player.
  if ((pev.flags & 0xc30) !== 0) return; // pev+0x250

// In the bullet-time / dive fallback, clarify the redundant bit-0x40 retest:
  // === Bullet-time / dive fallback ===
  // We reach here from three paths in the disassembly:
  //   (a) bit 0x2 set + wall-climb check failed  (bit 0x40 state unknown)
  //   (b) bit 0x2 not set, bit 0x40 set, wall-jump AND wall-dive both failed
  //   (c) bit 0x2 not set, bit 0x40 not set  (handled in the else branch above)
  // The disassembly's 0x8b0eb retest of bit 0x40 is required for (a); for
  // (b) it's redundant but is faithfully preserved here.
  if ((player.m_afButton & 0x40) === 0) return;

// In the time-since-stunt gate, drop a one-line note about the float→double
// promotion that happens implicitly between 0x8b12d and 0x8b14b:
  // NB: the original code loads timeSinceStunt as a 32-bit float (0x8b12b),
  // then `fstp QWORD PTR [esp]` widens it to double before the0x8b146
  // `fdivrp` against the [ebx-0x6de48] double constant. In TS this is
  // implicit in the numeric ops; no manual widening is needed.
```
