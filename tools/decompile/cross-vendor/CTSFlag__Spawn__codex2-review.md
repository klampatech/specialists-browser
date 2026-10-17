```
VERDICT: PASS-WITH-NOTES

Checklist:
1. Signature — ⚠️ — The HLSDK reference covers the 4 entry points
   (GiveFnptrsToDll, GetEntityAPI, GetEntityAPI2, GetNewDLLFunctions),
   not entity Spawn methods. For `CBaseEntity::Spawn()` in HLSDK the
   signature is `void Spawn(void)`; the TS has `Spawn(this: CTSFlag): void`
   which matches in spirit. The demangled symbol `Spawn__7CTSFlag`
   is preserved. ✅ on signature.
3. Version check pattern — N/A — Not applicable; this function is not
   one of the 4 engine↔mod interface entry points.
4. interfaceVersion assignment-back — N/A — Not applicable.
5. Success path: struct copy — N/A — Not applicable; the function is
   entity initialisation, not an interface exchange.
6. No fabricated paths — ⚠️ — Body matches the disassembly's structure
   one-to-one (parent spawn → secondary vtable slot 10 → pfnSetModel →
   pev scalar writes → classname ptr → UTIL_SetOrigin/SetSize → physics
   floats → two EHANDLE-style slots → nextthink → pev->flags clear/OR →
   switch on this+0x9c → byte init). `callSecondaryVTable(this, 10)`
   is a clean wrapper for `call [eax+0x28]` (eax = [edi+0x60]),
   not a fabricated path. Indirection chains like `[esi] → [edx+0x98]`
   are abstracted to `globals.field_at_0x98`, which loses the chain but
   doesn't invent logic. The EHANDLE write order is reversed relative   to the disassembly (which writes 0x14/0x18 first, then 0xc/0x10) —
   safe because no dependencies, but cosmetic fidelity loss.
7. No TODO body — ✅ — The body is real code; inline TODOs flag
   genuinely-ambiguous offsets (vtable slot 10, pev+0x208 role),
   not stub bodies.
8. Field names — ⚠️ — `this.pev`, `g_engfuncs.pfnSetModel`,
   `UTIL_SetOrigin`, `UTIL_SetSize` are correctly named against HLSDK
   and the cross-cutting class table. The remaining accesses are raw
   offsets (`this.pev[0x108]`, `this[0x88]`), which is fine for a
   decompilation pass. Some placeholder names (`MODEL_NAME_CONST`,
   `CONST_A`, `NEXT_THINK_DELTA`, `ZERO_VECTOR_FROM_GLOBAL`,
   `globals.field_*`) are used where the field identity is unknown.
   The float literals match the IEEE-754 encodings exactly:
   0.7/0.8/5.0/125.0/101.0/210.0/200.0/90.0/70.0/225.0/205.0/45.0/
   145.0/215.0/140.0 all ✅.
9. Compiles in isolation — ❌ — Many external symbols are referenced
   but undefined here: `CTSPhysicObject`, `CTSFlag`, `g_engfuncs`,
   `UTIL_SetOrigin`, `UTIL_SetSize`, `callSecondaryVTable`, `globals`,
   `MODEL_NAME_CONST`, `CONST_A`, `NEXT_THINK_DELTA`,
   `ZERO_VECTOR_FROM_GLOBAL`. To compile in isolation, these need to
   be declared as `any` (or use `// @ts-nocheck`).

Issues to fix:
- **ZERO_VECTOR_FROM_GLOBAL is misnamed.** The disassembly loads
  `eax = DWORD PTR [ebx-0x6f408]` and uses it as both mins and maxs.
  That constant is almost certainly NOT a zero vector — it's a small
  bounding radius. Rename to `BOUNDING_RADIUS_CONST` (or recover the
  actual value from `[ebx-0x6f408]` in the GOT).
- **Comment typo:** case-default float carries `// 0x430c00000` (10
  hex digits). The disassembly emits `0x430c0000` (= 140.0).
- **Indirection chains collapsed.** `pev[0] = CONST_A - globals.field_at_0x98`
  loses the `[esi] → [edx+0x98]` chain (`esi = [ebx+0x1600]` is itself
  a pointer deref). Either preserve the chain in comments or define
  an explicit helper. Same for `this[0x88]`, `this.pev[0x104]`.
- **EHANDLE write order reversed.** Cosmetic, but reordering  for fidelity is cheap.
- **`pev->origin` should be a reference**, not a value.
  `UTIL_SetOrigin(pev, &pev->origin)` is what the asm does
  (`push &pev->origin` then `push pev`). TS doesn't have refs,
  but a comment noting the C++ const-ref would clarify.
- **Doesn't compile in isolation.** Many undefined references.

Suggested rewrite (full TS function):

```typescript
// @ts-nocheck — references many symbols supplied at runtime
// (CTSPhysicObject, g_engfuncs, UTIL_Set*, etc.).

/**
 * CTSFlag::Spawn — initialise a CTF flag entity when spawned into the world.
 *
 * Order: parent spawn → secondary vtable slot 10 → pfnSetModel →
 *        pev scalar writes (0x108..0x120) → classname ptr →
 *        UTIL_SetOrigin → UTIL_SetSize (shared radius) →
 *        physics floats (this+0x88/0x8c) → two EHANDLE-style slots →
 *        nextthink (pev+0x104) → pev->flags clear/OR 2 →
 *        misc pev scalars (0x14c, 0x15c) →
 *        switch on this+0x9c → per-team origin offset (pev+0x150..0x158) →
 *        byte init (this+0xac).
 */
export function Spawn(this: any): void {
  const pev = this.pev as any;

  // (1) Parent spawn: CTSPhysicObject::Spawn(this).
  this.__base_PhysicObject_Spawn();

  // (2) Secondary vtable call at this+0x60, slot 10 (offset 0x28).
  // CTSFlag inherits through multiple base classes — this is likely
  // a CBaseEntity-style Spawn via the secondary vtable.
  const vtable2: any[] = this[0x60];
  vtable2[10].call(this);

  // (3) g_engfuncs.pfnSetModel(edict, modelname).
  // edict is at pev+0x208 (likely pev->pContainingEntity).
  const g_engfuncs = (globalThis as any).g_engfuncs;
  g_engfuncs.pfnSetModel(pev[0x208], (globalThis as any).FLAG_MODEL_NAME);

  // (4) pev scalar writes (offsets 0x108..0x120).
  pev[0x108] = 10;        // 0xa
  pev[0x10c] = 2;         // 0x2
  pev[0x11c] = 0.7;       // 0x3f333333
  pev[0x120] = 0.8;       // 0x3f4ccccd

  // (5) pev->classname (offset 0) — string_t pointer into a global
  // string table. Disassembly shows a double-indirection:
  //   eax = base_constant; eax -= [esi->field_at_0x98]
  //   where esi = [ebx+0x1600].
  const baseStr = (globalThis as any).FLAG_CLASSNAME_BASE;
  pev[0] = baseStr - ((globalThis as any).GLOBAL_PTR[0x98] as number);

  // (6) UTIL_SetOrigin(pev, &pev->origin). origin lives at pev+0x8..0x14;
  // the C++ call passes a const-ref to that vector. In TS, the runtime
  // treats the value as a reference.
  (globalThis as any).UTIL_SetOrigin(
    pev,
    { x: pev[0x8], y: pev[0xc], z: pev[0x10] }
  );

  // (7) UTIL_SetSize(pev, mins, maxs). Both mins and maxs use the SAME
  // constant from [ebx-0x6f408] — a small bounding radius (NOT zero).
  const BOUNDING_RADIUS = (globalThis as any).FLAG_BOUNDING_RADIUS;
  const sharedVec = { x: BOUNDING_RADIUS, y: BOUNDING_RADIUS, z: BOUNDING_RADIUS };
  (globalThis as any).UTIL_SetSize(pev, sharedVec, sharedVec);

  // (8) Float writes at this+0x88 / this+0x8c. Value is a cvar float
  // plus a global pointer's first field:
  //   [esi] → [eax]; fld [ebx-0x6e7e8]; fadd [eax]; fstp [this+0x88]
  this[0x88] =
    (globalThis as any).FLAG_PHYSICS_CVAR +
    ((globalThis as any).GLOBAL_PTR[0] as number);
  this[0x8c] = 0.0;

  // (9) Two EHANDLE-style slots cleared to invalid (0xffff0000) and
  // assigned a global edict pointer. ORDER matches disassembly:
  // 0x14/0x18 first, then 0xc/0x10.
  const GLOBAL_EDICT_A = (globalThis as any).GLOBAL_EDICT_A; // [ebx+0x1a74]
  const GLOBAL_EDICT_B = (globalThis as any).GLOBAL_EDICT_B; // [ebx+0x1ed4]
  this[0x14] = 0xffff0000;
  this[0x18] = GLOBAL_EDICT_A;
  this[0xc]  = 0xffff0000;
  this[0x10] = GLOBAL_EDICT_B;

  // (10) pev+0x104 (likely nextthink): constant + global_ptr->field_0.
  // The constant is loaded as QWORD (double) but stored as float via fstp DWORD.
  this.pev[0x104] =
    (globalThis as any).FLAG_NEXT_THINK_DELTA +
    ((globalThis as any).GLOBAL_PTR[0] as number);

  // (11) pev->flags (offset 0x250): clear, then OR 2.
  pev[0x250] = 0;
  pev[0x250] |= 2;

  // (12) Misc pev scalars (0x14c, 0x15c).
  pev[0x14c] = 5.0;   // 0x40a00000
  pev[0x15c] = 19;    // 0x13

  // (13) Switch on this+0x9c — per-team origin-offset Vector3 at
  // pev+0x150..0x158. Matches the disassembly's cmp/jne chain.
  switch (this[0x9c]) {
    case 0:
      pev[0x150] = 125.0;   // 0x42fa0000
      pev[0x154] = 101.0;   // 0x43250000
      pev[0x158] = 210.0;   // 0x43520000
      break;
    case 1:
      pev[0x150] = 200.0;   // 0x43480000
      pev[0x154] = 90.0;    // 0x42b40000
      pev[0x158] = 70.0;    // 0x428c0000
      break;
    case 2:
      pev[0x150] = 225.0;   // 0x43610000
      pev[0x154] = 205.0;   // 0x434d0000
      pev[0x158] = 45.0;    // 0x42340000
      break;
    default:
      pev[0x150] = 145.0;   // 0x43110000
      pev[0x154] = 215.0;   // 0x43570000
      pev[0x158] = 140.0;   // 0x430c0000
      break;
  }

  // (14) Final byte-flag init at this+0xac.
  this[0xac] = 0;
}
```

Net assessment: faithful to the disassembly — control flow, every
constant (floats and integers), the parent/secondary-virtual sequence,
and the per-team switch all match. The only real defects are the
`ZERO_VECTOR_FROM_GLOBAL` mislabel and the indirection-chain
abstraction; the rest are cosmetic or in-ok-addressable via runtime
globals. PASS-WITH-NOTES.
