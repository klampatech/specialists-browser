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
