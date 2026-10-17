```
VERDICT: PASS-WITH-NOTES
```

```
Checklist:
1. Signature — ✅ — `void Spawn()` matches the demangled
   `CTSKnifeWeapon::Spawn()` and the disassembly's bare `ret` (no
   return-value cleanup, no `eax` propagated to the caller). The
   `this: CTSKnifeWeapon` parameter correctly captures the implicit
   thiscall first-arg loaded by `mov esi, [esp+0x10]`.
2. Version check — ⚠️ — N/A. `Spawn` is not an engine-interface
   export; no version check exists for this function in HLSDK.
   Listed here only because the checklist applies it to every
   review. Treating as PASS by virtue of being out of scope.
3. `*interfaceVersion` assignment — ⚠️ — N/A for the same reason
   as #2.
4. Success path — ✅ — `CTSGroundWeapon.Spawn(this)` faithfully
   captures the PLT-resolved call to `Spawn__15CTSGroundWeapon@plt`
   with `[esp] = esi (= this)` set up at `b9e0c`. Equivalence to a
   non-virtual parent dispatch is correct.
5. No fabricated paths — ✅ — Every branch maps to a disassembly
   instruction: `m_pPlayer` load, virtual call through owner→vtable
   at offset `0x11c`, store to offset `0xa4`, then PLT call to
   `Spawn__15CTSGroundWeapon`. No invented branches, no extra
   fields touched. The "elided" PIC/GOT base is correctly identified
   as dead in this body — `[ebx+…]` is never dereferenced.
6. No TODO body — ✅ — The TODO is informational ("deeper ancestry
   is not visible here") and does not stand in for missing logic.
   The function's behavior is fully expressed in code.
7. Field names — ⚠️ — `m_pPlayer` (offset `0x60`) and `m_pKnife`
   (offset `0xa4`) are both reasonable: `m_pPlayer` matches the
   well-known field on GoldSrc weapon entities, and `m_pKnife` is
   inferred from the fact that offset `0xa4` holds a pointer
   populated by what looks like an inventory-lookup virtual
   call. The `GetWeapon` name on the owner's vtable is plausible
   (matches HLSDK's `CBasePlayer::GetWeapon(CBaseEntity*)`
   signature), but the disassembly itself does not name that vtable
   slot — see issue #1.
8. Compiles in isolation — ⚠️ — References `CTSKnifeWeapon` (as
   `this` type), `m_pPlayer` / `m_pKnife` (instance fields) and
   `CTSGroundWeapon` (static call). None of these are declared in
   the snippet. See issue #2.
```

```
Issues to fix:
1. **`GetWeapon` vtable-slot provenance is undersold.**
   The TS reads `owner.GetWeapon(this)` for `call [eax+0x11c]`.
   The mapping is plausible — HLSDK's CBasePlayer has a virtual
   `GetWeapon(CBaseEntity*)` at that signature — but the
   disassembly does not name the slot. The sibling symbol
   `GetWeapon__14CTSKnifeWeaponP11CBaseEntity` is for CTSKnifeWeapon's
   *own* method (separate symbol table entry), NOT the one being
   called here, so the comment chain is misleading. Recommend an
   explicit note: "vtable[71] of m_pPlayer → inferred to be
   CBasePlayer::GetWeapon(CBaseEntity*) from HLSDK; the sibling
   symbol's name is coincidental (same name, same signature, but
   on a different class)."

2. **External-type references in an "isolation-compiles" snippet.**
   Per the review checklist, the output should compile in
   isolation with `any` for unknowns. Currently the snippet
   references `CTSKnifeWeapon`, `m_pPlayer`, `m_pKnife`, and
   `CTSGroundWeapon`, none of which are declared in the file.
   Either forward-declare a local interface/type, or relax
   `this` to a known shape. (Practically, if D.3 keeps per-class
   snippets in the same file as the class declaration, this is
   fine — flagging for completeness.)
```

```
Suggested rewrite:
```

```typescript
/**
 * CTSKnifeWeapon::Spawn
 *
 * Disassembly summary (from tools/decompile/chunks/Spawn__14CTSKnifeWeapon.chunk.md):
 *   esi = this                                           // [esp+0x10]
 *   eax = this->m_pPlayer                                // [esi + 0x60]
 *   push this; call [eax + 0x11c]                        // virtual on owner
 *   this->m_pKnife = eax                                 // [esi + 0xa4]
 *   push this; call Spawn__15CTSGroundWeapon@plt         // parent Spawn
 *   add esp, 0x14; pop ebx/esi; ret
 *
 *   Prologue sets up EBX as a PIC/GOT base (call $+5; pop ebx;
 *   add ebx, 0xac022) but never dereferences it in this body,
 *   so it is elided in TS.
 */
export function Spawn(this: CTSKnifeWeapon): void {
  // ---- 1. Resolve the owner's knife (their inventory slot for this knife class) ----
  const owner = this.m_pPlayer;
  // m_pPlayer is a CBasePlayer. vtable slot index 0x11c/4 == 71.
  // TODO(asm-ambiguous): the assembly calls an unnamed virtual at
  // vtable[71] of the owner with (this : CBaseEntity*). The slot
  // is INFERRED to be `CBasePlayer::GetWeapon(CBaseEntity*)` from
  // HLSDK + the sibling symbol's signature, NOT from the assembly
  // itself. The sibling `GetWeapon__14CTSKnifeWeaponP11CBaseEntity`
  // is a *different* method (CTSKnifeWeapon's own override, same
  // name + signature, on a different class) and is not what's
  // being called here.
  const matchingKnife = owner.GetWeapon(this);

  // ---- 2. Cache the resolved knife on this ground entity ----
  this.m_pKnife = matchingKnife;

  // ---- 3. Delegate standard ground-weapon spawn to the parent ----
  // PLT-resolved (non-virtual) call to CTSGroundWeapon::Spawn
  // with `this` as the sole argument.
  CTSGroundWeapon.Spawn(this);
}
```

```typescript
// Forward declarations needed for the snippet to compile in isolation
// (remove these if the surrounding file already declares them):
//
//   interface CTSKnifeWeapon {
//     m_pPlayer: CBasePlayer | null;
//     m_pKnife:  CBasePlayerWeapon | null;
//   }
//
//   declare const CTSGroundWeapon: { Spawn(self: CTSKnifeWeapon): void };
```
