  // Stub declarations so this chunk compiles standalone.
  // Replace with the real class in D.4 once CTSFog is fully modelled.
  interface CTSFog { /* members added in D.4 */ }
  declare function UTIL_Remove(entity: CTSFog): void;

  /**
   * CTSFog::Spawn — Spawn handler that immediately removes the
   * CTSFog entity itself.
   *
   * Disassembly (33 B at 0x000642e4):
   *   push ebx
   *   sub esp, 0x8
   *   call <thunk>      ; PIC base setup
   *   pop ebx           ; ebx = 0x642ed
   *   add ebx, 0x101b23 ; ebx = 0x106010 (GOT — never indexed)
   *   sub esp, 0xc
   *   push [esp+0x1c]   ; push this (loaded from [E+4])
   *   call UTIL_Remove__FP11CBaseEntity@plt
   *   add esp, 0x18
   *   pop ebx
   *   ret
   *
   * NOTE: A CTSFog instance deletes itself the moment it spawns.
   * Verify with Kyle whether this is intended self-cleanup or a
   * bug in the original mod before treating it as canonical design.
   */
  export function Spawn(this: CTSFog): void {
    UTIL_Remove(this);
  }
  ```

Bottom line
The TS body is correct and faithful to the disassembly. The only
hard issue is the missing type stub for in-isolation compilation.
Everything else is advisory.
