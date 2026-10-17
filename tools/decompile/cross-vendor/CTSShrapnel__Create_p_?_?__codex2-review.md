```
VERDICT: FAIL

Checklist:
1. Signature — ⚠️ — Arg count (3) and order (pev, vecPos, vecDir) match
   the disassembly, but `pev: entvars_s` is by-value. The mangled symbol
   is `P9entvars_s` (pointer-to) and the disassembly stores arg1 as a
   4-byte pointer into `this+0x8c` and dereferences it at `+0x20` and
   `+0x254`, which only makes sense for a pointer. The TS type should be
   `Pointer<entvars_s>`. Also: the demangler reports `Create(p ?, ?)`
   (2 args), but the disassembly clearly has 3 args + (likely) implicit
   `this` for an instance method; `this: void` is unverified.
2. Version check — N/A — Not one of the 4 HLSDK entry points.
3. interfaceVersion assignment — N/A — Not one of the 4 HLSDK entry points.
4. Success path — ✅ — GetClassPtr + null check + 12-byte memcpy of
   vecPos → origin + 12-byte memcpy of vecPos → m_vecSpawnPos are all
   faithful. Velocity computation (vecDir + pev->velocity, x/y/z on FPU
   stack) is preserved correctly.
5. No fabricated paths — ✅ — No invented branches; the missing logic
   is what's wrong (see #6), not invented.
6. No TODO body — ❌ — The disassembly contains three real engine
   invocations (m_pEngine vtable slot 9, GOT-engine fn table slot 90
   with args (0, 2), m_pEngine vtable slot 5 with args
   (instance, pev->field_0x254, 0)) plus a computed-pointer write to
   `*(this+0)`. All four are present in the TS only as `// TODO(...)`
   comments. The function would not behave as the disassembly describes
   if those lines were removed.
7. Field names — ⚠️ — `pev` and `m_vecSpawnPos` are reasonable. The
   fabricated umbrella `engineData` (with guessed `origin`, `velocity`,
   `handle` fields) groups accesses through the pointer held at
   `this+0`, but those fields aren't verified C struct members — they're
   guesses and should be TODO-commented until the engine-side struct is
   mapped. `m_pEngine` at `this+0x60` is never named in the TS, even
   though its vtable is the subject of two real calls.
8. Compiles in isolation — ❌ — References `engineAllocChannel`,
   `engineMethod9`, `engineMethod5`, `Vector`, `entvars_s`, `CTSShrapnel`,
   and `GetClassPtr`, none of which are defined in the snippet. The
   `// TODO` blocks also reference no symbol that the TS would compile
   against.

Issues to fix:
- `pev` must be by-pointer (the symbol is `P9entvars_s`; the body
  dereferences it).
- The three engine calls plus the `(this+0)` computed-pointer write must
  be expressed as code, not commented out. Use placeholder names with
  `TODO(asm-ambiguous)` annotations on the implementation, not on the
  call site itself. The TS still doesn't know what Fn90 / vtable[5] /
  vtable[9] resolve to — that's D.4 — but the call has to appear.
- `engineAllocChannel` is a guess; the actual target is
  `engineFuncTable->Fn90(0, 2)`. Drop the invented name.
- `instance.engineData.origin = vecPos` flattens a pointer-then-offset
  access (`*(this+0)+8`) into a fake struct field. Either keep the
  explicit offset form with a TODO on the struct name, or model
  `m_pEnt` / `m_pEdict` as a typed pointer in D.4.
- The argument `pev->field_0x254` is noted as "not a standard entvars_s
  member" and left as TODO. That's fine for D.3 (TS likely extends
  entvars_s), but flag it explicitly.
- Confirm whether `Create` is static or an instance method. The demangler
  says 2 args; the disassembly uses 3 explicit args + an `ebp`-tracked
  `this`. In GoldSrc TS conventions this is most likely an instance
  factory where `this` is reassigned via GetClassPtr. The TS should
  match that.
```

Suggested rewrite:

```typescript
/**
 * CTSShrapnel::Create — instance factory. Allocates a CTSShrapnel via the
 * engine pool (GetClassPtr<CTSShrapnel>), then seeds origin / velocity /
 * spawn position and registers it with the engine.
 *
 * Disassembly-derived behavior:
 *   1. Allocate via GetClassPtr<CTSShrapnel>(0); null-check.
 *   2. m_pEngine->vtable[9](instance)         // engine call, semantics TBD
 *   3. *(instance+0) = computed pointer       // engine-side "this" / edict offset
 *   4. instance.pev   = pev                   // store at instance+0x8c
 *   5. memcpy(*(instance+0)+0x08, vecPos, 12) // origin = vecPos
 *   6. velocity = vecDir + pev->velocity      // FPU x87 confirms per-axis add
 *   7. memcpy(*(instance+0)+0x20, velocity, 12)
 *   8. memcpy(instance+0x90, vecPos, 12)      // m_vecSpawnPos = vecPos
 *   9. handle = engineFuncTable.Fn90(0, 2)
 *  10. *(instance+0)+0x114 = handle
 *  11. m_pEngine->vtable[5](instance, pev->field_0x254, 0)
 *  12. return instance
 *
 * @param this    The CTSShrapnel instance (rebound to the pool-allocated
 *                object, per GoldSrc Create semantics).
 * @param pev     Pointer to the spawning entity's entvars_s.
 * @param vecPos  Spawn position (Vector) — used for origin and spawn pos.
 * @param vecDir  Direction vector — added to pev->velocity to seed velocity.
 * @returns       The new CTSShrapnel instance, or null if GetClassPtr failed.
 */
export function Create(
    this: CTSShrapnel,
    pev: Pointer<entvars_s>,
    vecPos: Vector,
    vecDir: Vector): CTSShrapnel | null {
  const instance = this;

  // (1) GetClassPtr<CTSShrapnel>(0). The TS GoldSrc allocator returns the
  // recycled entity, which is bound to `this` and to engine-side storage.
  // TODO(asm-ambiguous): the 0 arg and the assignment-back to `this` aren't
  // visible in this frame — they live in GetClassPtr's body.
  const allocated = GetClassPtr(CTSShrapnel, /*edict=*/0);
  if (allocated == null) return null;

  // (2) Call into the engine via this->m_pEngine (at instance+0x60).
  // vtable slot 9 (offset 0x24 in 4-byte ptr table); arg = instance.
  // TODO(asm-ambiguous): which engine method this is — D.4 will resolve
  // by cross-referencing the m_pEngine vtable.
  instance.m_pEngine.vtable[9](instance);

  // (3) Compute the engine-side "this" / edict-derived pointer and write
  // it to *(instance+0). Formula:
  //   (GOT_base - 0x6e070) - (*(GOT+0x1600))->field_0x98
  // The two address operands are PIC-relative globals.
  // TODO(asm-ambiguous): the meaning of the subtraction and the destination
  // pointer. Likely the engine uses this offset to find this entity's data.
  const engineThisComputed: number =
      (GOT_BASE - 0x6e070) -
      memory.readU32(memory.readU32(GOT_BASE + 0x1600) + 0x98);
  memory.writeU32(memory.readU32(instance) /* *(instance+0) */, engineThisComputed);

  // (4) pev stored at instance+0x8c.
  instance.pev = pev;

  // (5) Origin = vecPos: memcpy 12 bytes from vecPos to *(instance+0)+0x08.
  memcpy_3dwords(memory.readU32(instance) + 0x08, vecPos);

  // (6) Velocity = vecDir + pev->velocity (x87 FPU confirms: per-axis add).
  const velocity: Vector = {
    x: vecDir.x + pev.velocity.x,
    y: vecDir.y + pev.velocity.y,
    z: vecDir.z + pev.velocity.z,
  };

  // (7) memcpy 12 bytes from velocity to *(instance+0)+0x20.
  memcpy_3dwords(memory.readU32(instance) + 0x20, velocity);

  // (8) m_vecSpawnPos = vecPos: memcpy 12 bytes from vecPos to instance+0x90.
  memcpy_3dwords(instance /* +0x90 */, vecPos);
  instance.m_vecSpawnPos = vecPos;

  // (9) Engine function-table call with args (0, 2). Returned handle
  // goes to *(instance+0)+0x114.
  // Source: [ebx+0x1aa8] is the engine function-table global in PIC.
  // TODO(asm-ambiguous): which engine function this is (likely a sound or
  // channel allocation, but unverified). Result is treated as a handle.
  const handle: number =
      memory.readU32(GOT_BASE + 0x1aa8).vtable[0x168 / 4](0, 2);
  memory.writeU32(memory.readU32(instance) + 0x114, handle);

  // (10) Second m_pEngine vtable call. Args: (instance, pev->field_0x254, 0).
  // Field offset 0x254 is well beyond vanilla entvars_s (~0x174 bytes); TS
  // likely extends entvars_s, or this is a CBaseEntity-typed pointer — D.4
  // will resolve. Likely "link shrapnel to parent owner".
  // TODO(asm-ambiguous): semantic of the call + meaning of pev->field_0x254.
  instance.m_pEngine.vtable[5](instance, memory.readU32(pev) + 0x254, 0);

  return instance;
}
```

Notes for the next pass:
- The engine method numbers and the meaning of `engineThisComputed` are genuinely
  unknowable from a single function's disassembly — they need cross-class
  evidence (D.4) and engine-binding lookup (D.5). The placeholder calls above
  preserve the control-flow shape and call arity from the disassembly without
  fabricating semantics.
- `entvars_s` extending past `0x254` is consistent with TS adding custom fields
  to `entvars_s`; flag this in `HANDOFF.md` so D.4 knows to check `entvars_s`
  size before matching offsets.
- The `m_pEngine` vtable layout at `instance+0x60` is also D.4 territory — at
  minimum, the TS needs `m_pEngine: Pointer<Engine>; vtable: FunctionTable`.
