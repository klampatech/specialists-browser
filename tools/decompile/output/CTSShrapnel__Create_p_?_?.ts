/**
 * CTSShrapnel::Create — factory that spawns a new CTSShrapnel entity.
 *
 * Demangled source: CTSShrapnel::Create(entvars_s*, Vector[, Vector])
 * Disassembly:      tools/decompile/chunks/
 *                   Create__11CTSShrapnelP9entvars_sG6VectorT2.chunk.md
 * Reference:        tools/decompile/references/hlsdk-goldsrc-interface.md
 *
 * Allocates via the GetClassPtr pool allocator, then seeds pev, origin,
 * velocity (= vecDir + pev->velocity), and a spawn-position cache. The
 * engine-side hooks (vtable calls, global-thunk calls, engine-container
 * writes) are marked TODO because the engine-container type and engine
 * method names are recovered in D.4 and D.5 respectively.
 *
 * External types are typed `any` so the snippet compiles in isolation
 * for D.3 review. D.4 will wire them up against the TS class layout.
 */
export function Create(
  this: void,
  pev: any,        // entvars_s* (per `P9entvars_s` in the mangled name)
  vecDir: any,     // Vector&    (per `G6Vector` — added to pev->velocity)
  vecPos: any,     // Vector&    (per the trailing mangled segment)
): any | null {
  // Disasm: GetClassPtr<TSShrapnel>(0) — pool allocator hands us `this`.
  const instance: any = GetClassPtr(CTSShrapnel, 0);

  // Disasm: `test ebp,ebp; je 6c095` — null-return on allocation failure.
  if (instance == null) return null;

  // TODO(asm-ambiguous): engine vtable method 9.
  // Disasm: `mov eax,[instance+0x60]; call [eax+0x24]`. Called with
  // `instance` as the explicit `this`. Probably the engine-side
  // "register this entity" hook. No safe TS call without the
  // engine-side class definition from D.4.

  // TODO(asm-ambiguous): engine-side "this" pointer setup.
  // Disasm computes (GOT - 0x6e070) - (*(GOT+0x1600) + 0x98) and stores
  // it at *(instance+0). Likely an engine-side container pointer or
  // slot index. No safe TS expression without D.4.

  // Disasm: store pev at instance+0x8c.
  instance.pev = pev;

  // TODO(asm-ambiguous): origin = vecPos.
  // Disasm: 3-dword `rep movs` from vecPos to *(instance+0) + 0x8. The
  // engine-container write semantics are not recoverable until D.4.

  // TODO(asm-ambiguous): velocity = vecDir + pev->velocity.
  // Disasm: FPU fadd sequence writing the per-component sums to
  // *(instance+0) + 0x20 (note: the store destination is +0x20, not
  // +0x28 — re-verify against the engine-container layout in D.4).
  // Computed values:
  //   velocity.x = vecDir.x + pev.velocity.x
  //   velocity.y = vecDir.y + pev.velocity.y
  //   velocity.z = vecDir.z + pev.velocity.z

  // Disasm: 3-dword `rep movs` from vecPos to instance+0x90
  // (m_vecSpawnPos cache on the TS-side entity).
  instance.m_vecSpawnPos = vecPos;

  // TODO(asm-ambiguous): engine method via [GOT+0x1aa8] + 0x168.
  // Disasm: call with args (0x0, 0x2); result stored at *(instance+0) +
  // 0x114. Engine method name unknown in D.3. The receiver slot is past
  // the standard edict_t size, so it is likely an entity_state_t field.

  // TODO(asm-ambiguous): engine vtable method 5.
  // Disasm: `call [instance+0x60]+0x14` with args (instance, *(pev+0x254),
  // 0). The parent pev offset 0x254 is past the standard `entvars_s`
  // layout — likely a TS-specific pev extension or a different struct
  // entirely; type unknown in D.3. The `0` arg is the third stack slot.

  return instance;
}
