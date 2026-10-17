```
VERDICT: FAIL

Checklist:
1. Signature — ❌ — Demangled name is `CTSSMGWeapon::GetWeapon(p CBaseEntity)`,
   i.e. member function taking one explicit CBaseEntity* arg. The TS drops
   that arg entirely (`(this: CTSSMGWeapon): void`). The HLSDK reference
   doc itself doesn't apply here at all — it covers GiveFnptrsToDll /
   GetEntityAPI / GetEntityAPI2 / GetNewDLLFunctions, none of which are
   this function. The TS signature should be   `(this: CTSSMGWeapon, pEntity: CBaseEntity): void`.
2. Version check — ⚠️ — N/A for this function family (not an
   `APIFUNCTION[2]` entry point). No missing equivalent in the TS.
3. interfaceVersion assignment — ⚠️ — N/A. No missing equivalent.
4. Success path (struct copy) — ⚠️ — N/A (no memcpy). The actual
   "success-path" analogue is the trailing engine-slot call at
   `[esi+0x8]`; TS preserves it.
6. No fabricated code paths — ⚠️ — Overall structure faithfully   matches the asm: guard → delegate → recheck → cache m_iId via a
   virtual call → engine call with two strings. Invented names are
   localised (e.g. `classVtable`, `g_Engine`) and could be `vtable` /
   `g_engfuncs` once cross-referenced.
6. No TODO body — ⚠️ — TODOs mark genuine ambiguity (`pev+0x118`,
   `pev+0x208`, second inner-call arg source), not laziness.
7. Field names — ❌ — Uses raw offset placeholders
   (`field_0x118`, `field_0x208`, `classVtable`, `call_0x8`,
   `call_0x11c`) for things that have defensible names
   (`pev.model`-style field, `vtable`, `pfnSetModel`-style slot).
   `m_iId` at offset 0xa4 is acceptable as a TS convention. The vtable
   deref pattern `[ebp+0x60]; call [eax+0x11c]` is a virtual, not a
   "classVtable" — it's `this->vtable->slot0x11c`.
8. Compiles in isolation — ✅ — `as any` covers every unknown.

Issues to fix:
- **Dropped arg (signature + inner call).** Demangled signature is
  `CTSSMGWeapon::GetWeapon(CBaseEntity*)`. The TS declares only  `this`, and the inner call `(CTSGroundWeapon as any).GetWeapon(this, undefined)`
  passes `undefined` for the CBaseEntity arg. The asm clearly pushes
  two values before the inner call: `push [esp+0x2c]` (= original
  `[esp+0x24]` = the second stack arg = CBaseEntity*) and `push ebp`
  (= `[esp+0x20]` = the first stack arg = `this`). Both args must be
  forwarded.

- **ebp is `this`, not the picker.** Under the GCC thiscall convention
  used here (member functions with `this` on the stack), the LAST
  thing pushed before the call is `this`. So:
    `[esp+0x20]` = `this` (CTSSMGWeapon*)  → loaded into `ebp`
    `[esp+0x24]` = explicit arg1 (CBaseEntity*)
  Therefore `[ebp+0x0]` is `this->pev` (or first field), `[ebp+0x60]`
  is a vtable ptr on the weapon, `[ebp+0xa4]` is a field on the
  weapon. The TS already does `this.pev` / `this.m_iId` etc., which
  matches — but the comment for the second arg push says "second arg
  whose source is not visible in this chunk". It is visible: it's the
  picker's pointer, sitting at `[esp+0x24]`.

- **`[ebp+0x60]; call [eax+0x11c]` is a virtual, not a "class vtable
  call".** Should be `const vtable = this.<field0x60>; vtable[0x11c](this)`
  (or `this.<field0x60>[0x11c](this)`).

- **`pev+0x118` and `pev+0x208` are TS extensions** (HLSDK entvars_t
  ends well before 0x118). Acceptable as `// TODO`, but worth a
  comment that these are TS-added fields, not standard entvars.

- **Field-name hygiene.** Replace `field_0x118`/`field_0x208`/
  `classVtable`/`call_0x8`/`call_0x11c` with `// TODO(asm-ambiguous)`
  comments where the offset is the only thing we know.

Suggested rewrite:

```typescript
/**
 * CTSSMGWeapon::GetWeapon — handle a CBaseEntity (the picker) picking
 * up this SMG. GCC thiscall: `this` is the first stack arg
 * ([esp+0x20], loaded into `ebp`); `pEntity` is the second stack arg
 * ([esp+0x24]).
 *
 * Flow:
 *   1. Guard on `this->pev+0x118 < 0` (a TS-added sign-tested byte,
 *      past HLSDK entvars_t — likely a "dead" / invalid-state flag).
 *   2. Delegate to CTSGroundWeapon::GetWeapon(this, pEntity).
 *   3. On the same negative-arm after the base call, hit a virtual
 *      on the weapon itself: `this->vtable[0x11c](this)` →
 *      `this->m_iId` (offset 0xa4).
 *   4. Resolve `get_weapon_info(this->m_iId)`, take its string at
 *      info+0x1f2 (probably a model/name buffer inside the weapon
 *      info), then call the engine singleton's slot 8 with
 *      `(this->pev+0x208, info_string)` to (re)apply the SMG model.
 */
export function GetWeapon(this: CTSSMGWeapon, pEntity: CBaseEntity): void {
  const self = this as any;

  // 1. Guard: pev+0x118 is a TS-specific byte — bail.
  // TODO(asm-ambiguous): exact semantic of pev+0x118.
  if (((self.pev as any)[0x118] as number) < 0) {
    return;
  }

  // 2. Inner call pushes BOTH `this` (ebp) and pEntity ([esp+0x24])
  //    — standard GCC thiscall member invocation.
  //    (Previous decompilation passed `undefined` for pEntity; that
  //    is the bug this rewrite is fixing.)
  (CTSGroundWeapon as any).GetWeapon(self, pEntity);

  // 3. Re-check the guard. The asm jumps OVER this block on the
  //    non-negative arm.
  if (((self.pev as any)[0x118] as number) < 0) {
    // Virtual call: load vtable from self+0x60, invoke slot 0x11c
    // with self as the arg, store the result at self+0xa4 (m_iId).
    const vtable = (self as any)[0x60] as any;
    (self as any)[0xa4] = vtable[0x11c](self);
  }

  // 4. Look up the SMG's weapon_info by id; +0x1f2 is its string
  //    field (likely a fixed-size model/name buffer).
  // TODO(asm-ambiguous): info+0x1f2 role.
  const info = get_weapon_info((self as any)[0xa4] as any);
  const infoString = (info as any)[0x1f2] as string;

  // 5. Apply via the engine singleton ([ebx+0x1aa8] under PIC, i.e.
  //    g_engfuncs or similar): slot 8 with (pev+0x208, info_string).
  //    pev+0x208 is also a TS-added string field past HLSDK entvars_t.
  // TODO(asm-ambiguous): pev+0x208 role, engine singleton identity.
  const pevString = (self.pev as any)[0x208] as string;
  const engine = (globalThis as any).g_Engine as any;
  (engine[8] as any)(pevString, infoString);
}
```

Meta-note: the HLSDK reference block is for the 4 engine↔mod interface
entry points (`GiveFnptrsToDll`, `GetEntityAPI`, `GetEntityAPI2`,
`GetNewDLLFunctions`), not for `CTSSMGWeapon::GetWeapon`. Checklist
items 1–4 as written don't apply to gameplay entity methods. The
function-level criteria that DO apply (signature, no fabricated
paths, no TODO-only body, field names, compiles in isolation) are
what drove the verdict above.
```
