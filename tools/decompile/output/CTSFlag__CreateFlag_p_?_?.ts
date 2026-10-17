/**
 * CTSFlag::CreateFlag — static factory: spawns a new CTSFlag, optionally
 * linked to a CBasePlayer owner, initialized from the given s_flag_status
 * snapshot. (Demangled as a non-static member, but disassembly epilog is
 * __cdecl cleanup -> static method.)
 *
 * On allocation failure, broadcasts an error to all clients and returns null.
 *
 * @param player  Optional owning player.
 * @param status  Spawn snapshot. First 28 bytes copied to flag+0x90.
 * @returns       The newly created CTSFlag, or null on failure.
 */
export function CreateFlag(
  player: CBasePlayer | null,
  status: s_flag_status,
): CTSFlag | null {
  // Factory: GetClassPtr<CTSFlag>(NULL).
  const flag: any = GetClassPtr(CTSFlag as any, null);
  if (flag === null) {
    // TODO(asm-ambiguous): format string at GOT-0x6c1ec not yet resolved
    // against strings-n5.txt. Level 3 = HUD_PRINTNOTIFY.
    UTIL_ClientPrintAll(3 /* HUD_PRINTNOTIFY */, '' /* error msg from GOT */);
    return null;
  }

  // Copy first 28 bytes (7 dwords) of s_flag_status into flag at offset 0x90.
  // rep movsd with ecx=7 from [status] -> flag+0x90.
  // TODO(asm-ambiguous): exact sub-fields of those 28 bytes (origin +
  // angles + a tunable) pending the class-layout pass in D.4.
  copyBytes(flag, 0x90, status, 0, 28);   // or: flag.statusBlob = status.first28;

  // Virtual call: flag->pev (offset 0x60) -> [pev+0x24](flag). Single arg.
  // TODO(asm-ambiguous): could be a SetOrigin-like hook or a Save() helper;
  // pinned to TS-specific class ops. Resolve in D.4 against the vtable dump.
  callByOffset(flag, 0x60, 0x24, flag);

  // Stash the optional owner at flag+0x8c. Read from [esp+0x30] (post-call),
  // which resolves to the first explicit arg = player.
  flag.m_hOwner = player;

  if (player !== null) {
    // Vtable surgery: copy a function pointer from player's vtable slot
    // 0x208 into flag->base->[0x198]. [ebp+0x0] is some kind of base/table
    // pointer; ([flag+0])[0x198/4] = ((*player)[0x208/4]).
    // TODO(asm-ambiguous): what player method is being cloned — likely
    // a per-team think hook. Resolve against the player's vtable in D.4.
    const basePtr: any = flag[0x0];
    basePtr[0x198] = (player as any)[0x0][0x208];  // or unwrap to vtable.

    // Float compare: cvar-at-GOT-(-0x6f408) vs player->offset_0x180.
    // Disassembly emits `fcomp; fnstsw; test ah,0x40; jne`, which tests the
    // "ST(0) > operand" bit only. So the actual branch is on `cvar > field`.
    // When true -> COMPLEX path (call status.engineOp10 to derive a value,
    //                     then pass that into flag.engineOp14).
    // When false -> SIMPLE path (pass player.fAt0x180 directly to
    //                      flag.engineOp14).
    // TODO(asm-ambiguous): cvar name not yet resolved against strings-n5.txt;
    // likely `slowamt` or `ts_slowmotion`. player.fAt0x180 is probably pev->
    // fuser4 (or a similar userfloat on CBasePlayer).
    const cvar = readCvarFloat(/* cvar @ GOT-0x6f408 */);
    const playerField0x180: number = (player as any)[0x180];

    if (cvar > playerField0x180) {
      // COMPLEX: status.engineOp10(status, 0) returns a float result.
      const result: number = callByOffset(status, 0x60, 0x10, status, 0);
      // Then flag.engineOp14(flag, result, 0).
      callByOffset(flag, 0x60, 0x14, flag, result, 0);
    } else {
      // SIMPLE: flag.engineOp14(flag, playerField0x180, 0).
      callByOffset(flag, 0x60, 0x14, flag, playerField0x180, 0);
    }
  } else {
    // No owner: zero out the cloned vtable slot, reset a scalar to 1.0f.
    const basePtr: any = flag[0x0];
    basePtr[0x198] = 0;
    basePtr[0x254] = 1.0;
  }

  return flag;
}
