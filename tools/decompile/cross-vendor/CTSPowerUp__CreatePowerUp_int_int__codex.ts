```typescript
/**
 * CTSPowerUp::CreatePowerUp — allocate a fresh CTSPowerUp entity, prime its
 * secondary-base vtable, and hand it off to SetupPowerUp with a 60-second
 * lifetime. On allocation failure, broadcast a HUD center-print error to
 * every client and return null.
 *
 * @param this  The implicit calling entity (thiscall `this`, ECX). The body
 *              itself never dereferences `this`; both int arguments are
 *              pulled from the stack and forwarded into SetupPowerUp.
 * @param arg1  First int — passed straight through to SetupPowerUp (likely
 *              the owner's player-index for the new powerup).
 * @param arg2  Second int — passed straight through to SetupPowerUp (likely
 *              the powerup type or amount).
 * @returns     The newly created CTSPowerUp entity, or null on OOM.
 */
export function CreatePowerUp(this: CTSPowerUp, arg1: number, arg2: number): CTSPowerUp | null {
  // ---- 1. Try to spawn a new CTSPowerUp (no parent entvars). ----------
  // GetClassPtr<CTSPowerUp>(null edict) → fresh entity, or null on OOM.
  const entity: CTSPowerUp | null = GetClassPtr<CTSPowerUp>(/* edict */ null);

  // ---- 2. Allocation failed: HUD center-print to everyone and bail. --
  if (entity === null) {
    UTIL_ClientPrintAll(
      /* printLevel */ 3,                          // HUD_PRINTCENTER
      /* szMessage  */ POWERUP_SPAWN_FAILED_MSG,   // text @ GOT - 0x6c650
      /* unused trailing variadic args           */ 0, 0, 0,
    );
    return null;
  }

  // ---- 3. Fire the entity's secondary-base vtable initializer. -------
  // vtable ptr at entity + 0x60; called entry at + 0x24 (vtable index 9).
  // TODO(asm-ambiguous): which CTSPowerUp base owns this vtable, and which
  // virtual method this dispatches to, is not decidable from this chunk
  // alone — it requires the CTSPowerUp class layout (D.4).
  (entity as unknown as { __vtableAt0x60: Array<() => void> }).__vtableAt0x60[9]();

  // ---- 4. Hand the spawned entity off to SetupPowerUp. ---------------
  // Args (right-to-left in the original stack-push order):
  //   bool  allowRespawn  = false
  //   float lifetimeSec   = 60.0
  //   int   arg2
  //   int   arg1
  //   this  entity
  // (The bool slot is encoded as `add esp, 0x2; pushw 0x0` — only the low
  //  16 bits are zeroed; the upper 16 bits remain whatever the stack held.
  //  Semantically read as `false`.)
  SetupPowerUp(entity, arg1, arg2, /* lifetimeSec */ 60.0, /* allowRespawn */ false);

  // ---- 5. Return the new entity to the caller. -----------------------
  return entity;
}
```
