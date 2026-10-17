/**
 * CTSFlag::CreateFlag — factory that spawns a new CTSFlag entity,
 * optionally linked to a CBasePlayer owner and initialized from the
 * given s_flag_status snapshot. On allocation failure, broadcasts an
 * error to all clients and returns null.
 *
 * Receiver `this` is unused; the function allocates a fresh CTSFlag
 * via GetClassPtr. Per `CreateFlag__7CTSFlagP11CBasePlayerP13s_flag_status`,
 * the explicit args are `CBasePlayer* player` and `s_flag_status* status`.
 *
 * Stack arg layout after prologue (esp = entry - 28):
 *   [esp+0x20] = player (first source arg)
 *   [esp+0x24] = status (second source arg)
 *   [esp+0x1c] = return address
 */
export function CreateFlag(
  this: any,                  // implicit `this` from __thiscall; unused.
  player: any | null,         // CBasePlayer*
  status: any,                // s_flag_status*
): any | null {               // CTSFlag*

  // Engine entity factory: GetClassPtr<CTSFlag>(null).
  const flag: any = GetClassPtr(/* CTSFlag */ null);
  if (flag === null) {
    // TODO(D.4): resolve the format string at GOT-0x6c1ec against
    // strings-n5.txt. Level 3 = HUD_PRINTNOTIFY.
    UTIL_ClientPrintAll(3 /* HUD_PRINTNOTIFY */, '<error msg @ GOT-0x6c1ec>');
    return null;
  }

  // Copy 28 bytes (7 dwords) from s_flag_status into flag+0x90.
  // esi = status, edi = flag+0x90, rep movsd ecx=7.
  // TODO(D.4): field name(s) — likely origin + angles + modelindex
  // blob (or a packed struct copy).
  flag.statusBlob = status;

  // Call [flag+0x60]->vtable[9](flag).
  // ecx (`this`) is 0 at this point (residual from rep movs); the
  // callee is either __cdecl or ignores `this`. Only stack arg: flag.
  // TODO(D.4): semantic — could be pev->SetOrigin(vec), a Save()
  // hook, or a custom engine op.
  flag.fAt0x60.vtable[9](flag);

  // Stash the optional player owner at flag+0x8c.
  flag.m_hOwner = player;

  if (player !== null) {
    // ── Vtable surgery ─────────────────────────────────────────────
    // Asm: edx = flag.vtable; ecx = status;
    //      eax = *ecx; eax = [eax+0x208];
    //      [edx+0x198] = eax.
    // Source = the object POINTED TO BY status, NOT player.
    // (TS previously had `player.vtable[0x208 / 4]` — wrong arg.)
    // TODO(D.4): semantic — install a custom hook from the spawn
    // snapshot into the flag's vtable.
    flag.vtable[0x198 / 4] = status.dwordAt0.dwordAt(0x208);

    // Float compare: cvar (at GOT-0x6f408) vs status.floatAt(0x180).
    // fcomp / fnstsw / test ah,0x40 / jne jumps when C3=1 (equal).
    // TODO(D.4): cvar name (probably slowamt / ts_slowmotion);
    // status.floatAt(0x180) is likely a tunable like pev->fuser4.
    const cvar: number = readCvarFloat('<cvar @ GOT-0x6f408>');
    if (cvar === status.floatAt(0x180)) {
      // ── Equal branch ────────────────────────────────────────────
      // Asm (8d92c–8d949):
      //   sub esp,0x4 (slot A); push 0; sub esp,0x4 (slot B);
      //   edx = player (from [esp+0x2c] = first caller arg);
      //   eax = player.fAt0x60;
      //   push edx;                       // arg1 = player
      //   call [eax+0x10];                // [player+0x60]->vtable[4]
      //   fstp [esp];                     // store float result      //   push ebp;                       // arg1 = flag
      //   call [esi+0x14];                // [flag+0x60]->vtable[5]
      //
      // The TS previously had `status.engineOp10(status, 0)` —
      // wrong `this` AND wrong arg1. Source is player, not status.
      // TODO(D.4): semantic of player-side vtable[4] — likely a
      // helper that fetches a tunable from the player.
      const result: number = player.fAt0x60.vtable[4](player);
      // TODO(D.4): semantic of [flag+0x60]->vtable[5] — likely an
      // "apply this float to the flag" setter.
      flag.fAt0x60.vtable[5](flag, result);
    } else {
      // ── Not-equal branch ────────────────────────────────────────
      // Asm (8d915–8d927):
      //   sub esp,0x4 (slot A); push 0; push [ecx+0x180]; push ebp;
      //   call [eax+0x14]   // [flag+0x60]->vtable[5]
      // Args on stack: (flag, status.floatAt(0x180), 0).
      flag.fAt0x60.vtable[5](flag, status.floatAt(0x180));
    }
  } else {
    // No owner (player == null):
    // Asm (8d954–8d964):
    //   flag.vtable[0x198/4] = 0;
    //   flag.vtable[0x254/4] = 0x3f800000 (1.0 as bits).
    // Note: writing 1.0 to vtable[149] is suspicious — D.4 should
    // re-examine whether [flag+0] is really the vtable.
    flag.vtable[0x198 / 4] = 0;
    flag.vtable[0x254 / 4] = 1.0;
  }

  return flag;
}
