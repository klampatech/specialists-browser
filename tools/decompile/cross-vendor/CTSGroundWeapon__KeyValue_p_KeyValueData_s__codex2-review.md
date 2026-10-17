```
VERDICT: PASS-WITH-NOTES

Checklist:
1. Signature — ✅ — `KeyValue(this: CTSGroundWeapon, pkvd: KeyValueData_s): void`
   matches the demangled `KeyValue__15CTSGroundWeaponP14KeyValueData_s`
   (MSVC pre-2000 mangling: class length 15, parameter `P14KeyValueData_s`).
   Args are in the right slot; thiscall-style register-vs-stack usage is
   consistent with the prologue (`this` lands in `edi`, `pkvd` in `esi`).

2. Version check — N/A — `KeyValue` is a per-entity KV parser, not an
   engine↔mod interface function. The HLSDK version-check pattern does
   not apply here.

3. `*interfaceVersion` assignment-back — N/A — Same reason as (2).
   `KeyValue` does not negotiate an interface version.

4. Success path — ✅ — Each matched key performs the exact three-step
   sequence from the disassembly:
     (a) `strcmp(key, candidate) -> jne fallthrough`
     (b) `strtol(pkvd->szValue, NULL, 10, 0) -> store result`
     (c) `pkvd->fHandled = 1; jmp epilogue`
   The TS uses `return` after `fHandled = 1`, which is a faithful
   structural translation of the `jmp 91b3b` in the binary. Fall-through
   case sets `fHandled = 0` (matches `mov DWORD PTR [esi+0xc], 0x0`).

5. No fabricated paths — ✅ — Exactly five `if`-blocks plus one
   terminal `fHandled = 0`, mirroring the five `strcmp`/`strtol` blocks
   plus the single fall-through store in the disassembly. No invented
   branches, no invented error paths, no invented null checks (none in
   the original either).

6. No TODO body — ✅ — Function body is fully implemented; comments are
   disassembly provenance notes (good engineering practice), not stubs.

7. Field names — ⚠️ — Names follow HLSDK Hungarian (`m_i*` for int,
   `m_b*` for byte) and match the byte/dword store widths from the
   disassembly (DWORD for +0xa0/+0xa4/+0xa8/+0xac, BYTE for +0xb0).
   The names themselves are inferred — the TS mod's source C++ isn't
   preserved, so this is necessarily a best-effort. The mapping is
   correct relative to the disassembly offsets; only the literal
   identifiers (`m_iWDuration` vs `m_iDuration`, etc.) are uncertain.
   Acceptable as a D.3 artifact; will need cross-reference against
   the actual class header when one is reconstructed in D.4.

8. Compiles in isolation — ❌ — References two undeclared types:
   `CTSGroundWeapon` (the class being decoded) and `KeyValueData_s`
   (HLSDK-defined, but not declared here). Per the conversion guidance
   ("use `any` for unknowns") the snippet needs at least inline stubs
   to compile standalone.

Additional observations (informational, not blocking):
- `parseInt(szValue, 10)` is functionally equivalent to the
  `__strtol_internal(szValue, NULL, 10, group=0)` from the binary for
  well-formed integer strings. Edge case: `parseInt("abc", 10) === NaN`
  while `strtol("abc", …) === 0`. In practice, map KVPs are always
  well-formed integers, so this is acceptable. Note the asymmetry: for
  the "buyable" key specifically, if a designer wrote garbage, the C
  mod sees `0` (not buyable) while this TS would see `1` (buyable),
  because `NaN !== 0` in JS. Not a fail — but worth flagging.
- "buyable" boolean conversion (`setne BYTE PTR [edi+0xb0]`) is
  correctly modelled as `!== 0 ? 1 : 0`. ✅
- Field offset → name mapping is internally consistent and ordered
  the same way as the disassembly's strcmp chain. ✅

Issues to fix:
- Define `KeyValueData_s` (or use `any`). It's a well-known HLSDK
  struct; an inline `interface` stub is cleaner than `any`.
- Define a minimal `CTSGroundWeapon` stub with the five fields, or
  type `this` as `any`. Recommend the stub — it documents the
  inferred field layout for D.4.

Suggested rewrite (compiles in isolation):

```typescript
// Minimal type stubs (would normally live in the project's HLSDK
// type declarations — added here so the snippet compiles standalone).

/** HLSDK `extdll.h` — KeyValueData_s. */
interface KeyValueData_s {
  szKeyName: string;
  szValue: string;
  fHandled: number;
}

/**
 * Inferred field layout of CTSGroundWeapon, derived from the
 * disassembly of `KeyValue__15CTSGroundWeaponP14KeyValueData_s`.
 * Names use HLSDK Hungarian convention; will be verified against
 * the actual class header in D.4.
 */
class CTSGroundWeapon {
  m_iWDuration: number = 0;     // +0xa0 (int)
  m_iWeaponId: number = 0;      // +0xa4 (int)
  m_iExtraClip: number = 0;     // +0xa8 (int)
  m_iAttackerTeam: number = 0;  // +0xac (int)
  m_bBuyable: number = 0;       // +0xb0 (byte; 0 or 1)
}

/**
 * CTSGroundWeapon::KeyValue — handle entity key/value pairs set on a
 * CTSGroundWeapon by the level designer. Five CTS-specific keys are
 * recognized: their parsed integer (or boolean) values are stored in
 * the entity's instance fields and pkvd->fHandled is set to 1.
 * Unrecognized keys fall through with fHandled = 0 so the base class
 * (CTSWeapon / CBasePlayerWeapon / CBaseEntity) can try them.
 *
 * Recognized keys, in disassembly order:
 *   "tsweaponid"   -> this.m_iWeaponId      (int,   +0xa4)
 *   "wduration"    -> this.m_iWDuration     (int,   +0xa0)
 *   "wextraclip"   -> this.m_iExtraClip     (int,   +0xa8)
 *   "buyable"      -> this.m_bBuyable       (byte,  +0xb0, 0 or 1)
 *   "attackerteam" -> this.m_iAttackerTeam  (int,   +0xac)
 *
 * @param this  The CTSGroundWeapon entity instance
 * @param pkvd  The keyvalue pair from the BSP map
 */
export function KeyValue(this: CTSGroundWeapon, pkvd: KeyValueData_s): void {
  if (pkvd.szKeyName === "tsweaponid") {
    this.m_iWeaponId = parseInt(pkvd.szValue, 10);
    pkvd.fHandled = 1;
    return;
  }

  if (pkvd.szKeyName === "wduration") {
    this.m_iWDuration = parseInt(pkvd.szValue, 10);
    pkvd.fHandled = 1;
    return;
  }

  if (pkvd.szKeyName === "wextraclip") {
    this.m_iExtraClip = parseInt(pkvd.szValue, 10);
    pkvd.fHandled = 1;
    return;
  }

  if (pkvd.szKeyName === "buyable") {
    // Disassembly: strtol(...) → test eax,eax → setne BYTE PTR [edi+0xb0]
    // → 1 if non-zero strtol result, else 0.
    this.m_bBuyable = parseInt(pkvd.szValue, 10) !== 0 ? 1 : 0;
    pkvd.fHandled = 1;
    return;
  }

  if (pkvd.szKeyName === "attackerteam") {
    this.m_iAttackerTeam = parseInt(pkvd.szValue, 10);
    pkvd.fHandled = 1;
    return;
  }

  // No key matched — let the base class try.
  pkvd.fHandled = 0;
}
```

Overall: this is a faithful and clean D.3 decompilation. The only
substantive change needed is the inline type stubs for `KeyValueData_s`
and `CTSGroundWeapon` so the snippet compiles standalone. The
field-name inferences (`m_iWDuration`, `m_bBuyable`, etc.) are flagged
for D.4 cross-reference but are consistent with HLSDK conventions and
the disassembly's offsets/store-widths.
```
