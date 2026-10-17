```typescript
/**
 * CTSKnife::CreateKnife — spawns a thrown-knife entity, populates its
 * origin / velocity / type from the firing player and the supplied
 * origin + angles vectors, then fires a virtual throw method that
 * pulls a throw direction from the player when allowed.
 *
 * Effectively a static factory: the `this` parameter is unused.
 *
 * Decompiled from ts/dlls/ts_i386.so @ 0x6d9e4 (285 bytes).
 *
 * @param this       CTSKnife (the `this` parameter is unused — the
 *                   function is a static factory that allocates a
 *                   new entity via GetClassPtr).
 * @param pPlayer    Firing player (CBasePlayer*).
 * @param vecOrigin  Spawn origin (const Vector&). Copied into
 *                   pev->origin and into m_vecEnd.
 * @param vecAngles  Throw direction (const Vector&). Copied into
 *                   pev->velocity (entvars_t offset 0x20).
 * @param iType      Knife type / behavior flag (int). Stored in
 *                   m_iType (CTSKnife offset 0xa0).
 * @returns The new CTSKnife entity, or null if GetClassPtr failed.
 */
export function CreateKnife(
  this: CTSKnife,
  pPlayer: CBasePlayer,
  vecOrigin: Vector,
  vecAngles: Vector,
  iType: number
): CTSKnife | null {
  // PIC / GOT base computation:
  //   ebx = address-after-call + 0xf8420

  // 1) Allocate a new CTSKnife entity (entity-class hint = 0).
  //    GetClassPtr((CTSKnife*)NULL) -> pKnife
  const pKnife: CTSKnife = GetClassPtr(0);
  if (pKnife === null) {
    return null;
  }

  // 2) Stash the iType flag in m_iType (offset 0xa0 in CTSKnife).
  //    TODO(asm-ambiguous): field 0xa0 is only written here and not
  //    read again in this function.
  pKnife.m_iType = iType;

  // 3) Virtual call: this->vtable[0x24 / 4] = vtable[9] (likely
  //    CBaseEntity::Spawn() or a similar post-allocation init).
  //    The compiler emits this as a non-standard thiscall with
  //    `this` pushed explicitly on the stack.
  //    TODO(asm-ambiguous): exact vtable index and method name inferred.
  pKnife.vtable[9](pKnife);

  // 4) Initialize pev->origin (entvars_t offset 0) with a value derived
  //    from a classname-string address and an engine global field.
  //    This is the standard GoldSrc classname-init pattern.
  //      GOT_BASE - 0x6e62b  -> absolute address of a classname string.
  //      engineGlobal.field_98 -> some engine-internal value.
  //    TODO(asm-ambiguous): exact engine semantics not documented here.
  pKnife.pev.origin = (GOT_BASE - 0x6e62b) - engineGlobal.field_98;

  // 5) m_field_8c = (*pPlayer).field_208
  //    TODO(asm-ambiguous): offset 0x208 in CBasePlayer is non-standard
  //    for stock HL1; likely a TS-specific counter or knife-related
  //    field (e.g. m_iAccount, m_iKnifeAmmo).
  pKnife.m_field_8c = pPlayer.field_208;

  // 6) Copy vecOrigin (3 dwords = 12 bytes) into pev->origin
  //    (rep movsd via edi = this->pev + 8).
  for (let i = 0; i < 3; i++) {
    pKnife.pev.origin[i] = vecOrigin[i];
  }

  // 7) Push origin to the engine for entity sync.
  UTIL_SetOrigin(pKnife.pev, pKnife.pev.origin);

  // 8) Copy vecAngles (3 dwords = 12 bytes) into pev->velocity
  //    (rep movsd via edi = this->pev + 0x20).
  for (let i = 0; i < 3; i++) {
    pKnife.pev.velocity[i] = vecAngles[i];
  }

  // 9) Copy vecOrigin (3 dwords = 12 bytes) into m_vecEnd
  //    (rep movsd via edi = &this->m_vecEnd = this + 0x94).
  for (let i = 0; i < 3; i++) {
    pKnife.m_vecEnd[i] = vecOrigin[i];
  }

  // 10) Clear m_bActive flag (byte at CTSKnife offset 0x92).
  pKnife.m_bActive = 0;

  // 11) Branch on whether the player can throw now:
  //        if (sv.time >= pPlayer.m_flNextAttack)  (CBasePlayer offset 0x180)
  //
  //      True branch  ("can attack"): pull throw vector via the
  //        player's vtable[0x10 / 4] = vtable[4] (likely GetAutoaimVector
  //        or similar), then call pKnife.vtable[5](pKnife, throw_vec, 0).
  //      False branch ("in cooldown"): call pKnife.vtable[5](pKnife,
  //        pPlayer.m_flNextAttack, 0) directly.
  //
  //     TODO(asm-ambiguous): the false-branch arg is a single dword
  //     read from offset 0x180 — the same field used as a float in
  //     the comparison — but vtable[5] likely expects a Vector here.
  //     Either offset 0x180 is a Vector whose first dword happens to
  //     be m_flNextAttack, or vtable[5] takes a single-float arg in
  //     this path.
  if (sv.time >= pPlayer.m_flNextAttack) {
    // Player is allowed to attack; pull the throw vector from the player.
    const throwVec = pPlayer.vtable[4](pPlayer);
    pKnife.vtable[5](pKnife, throwVec, 0);
  } else {
    // Cooldown: throw using the player's stored field directly.
    pKnife.vtable[5](pKnife, pPlayer.m_flNextAttack, 0);
  }

  return pKnife;
}
```
