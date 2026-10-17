/**
 * CTSObjectivePointer::Use — invoked when an entity activates this
 * objective pointer.
 *
 *   Flow:
 *     1. Bail out if vtable[114] (some inherited virtual) is undefined.
 *     2. Loop:
 *        a. Resolve activator via engineIface[0x38] (level, fmt, value).
 *        b. Validate via engineIface[0x118]; 0 = invalid → return.
 *        c. If activator was null, fall back to engineIface[0x114](0).
 *        d. entityRef = resolved[0x7c].
 *        e. Probe entityRef's sub-vtable at offset 0x60:
 *             subVtable[0x1c](entityRef) → bool (canClaim?)
 *           If true:
 *             subVtable[0x20](entityRef, 1)            // markClaimed?
 *             newIndex = g_pGameRules->AddObjectiveInList(
 *                 entityRef, &this->int_at_0x64);
 *             if newIndex == -1: retry from (a).
 *             else: for i = 1..maxClients, g_pGameRules
 *                 ->SendObjectiveToHud(newIndex, UTIL_PlayerByIndex(i));
 *               then loop back to (a).
 */
export function Use(
  this: any,        // TODO: CTSObjectivePointer
  pActivator: any,  // TODO: CBaseEntity | null
  useType: any,     // TODO: USE_TYPE (unused in body)
  value: number,    // float (unused in body)
): void {
  // Early-out: the 114th vtable slot (byte offset 0x1c8) must be non-null.
  // The asm: cmp DWORD PTR [eax+0x1c8], 0x0  where eax = *this (vtable).
  // 0x1c8 / 4 = 114.
  // TODO(asm-ambiguous): which virtual function is at vtable[114]?
  const vtable = this as any;
  if (vtable == null || vtable[0x1c8] == null) {
    return;
  }

  // Globals from PIC GOT:
  //   [ebx+0x1600] : gpGlobals (or a wrapper that holds gpGlobals at offset 0)
  //   [ebx+0x1aa8] : engine interface (enginefuncs_t or similar)
  //   [ebx+0x14f0] : g_pGameRules
  // TODO(asm-ambiguous): confirm the GOT entry mappings.
  const gpGlobals   = (this as any).__globals_gpGlobals as any;
  const engineIface = (this as any).__globals_engineInterface as any;
  const gameRules   = (this as any).__globals_g_pGameRules as any;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // engineIface[14] (byte offset 0x38). Signature inferred from the asm:
    //   (level, formatString, value) -> entity
    //   where value = engineIface[14] + vtable[114].
    // TODO(asm-ambiguous): identify engineIface[14].
    const activator = (engineIface as any)[0x38](
      0,
      "", // format string from .rodata: lea eax, [ebx-0x6ceae]
      /* value */ 0,
    ) as any;

    // engineIface[70] (byte offset 0x118). Non-zero = valid.
    // TODO(asm-ambiguous): identify engineIface[70].
    let activationValid = activator != null;
    if (activationValid) {
      const probe = (engineIface as any)[0x118](activator) as number;
      if (probe === 0) activationValid = false;
    }
    if (!activationValid) {
      return;
    }

    // If activator is null, fall back to engineIface[69] (byte offset 0x114)(0).
    // TODO(asm-ambiguous): identify engineIface[69].
    let resolved: any = activator;
    if (resolved == null) {
      resolved = (engineIface as any)[0x114](0) as any;
    }

    // resolved[0x7c] is the entity we'll act on.
    let entityRef: any = null;
    if (resolved != null) {
      entityRef = (resolved as any)[0x7c] as any;
    }

    // Methods live on entityRef's sub-object vtable at offset 0x60,
    // NOT on the engine interface:
    //   subVtable[7]  (byte offset 0x1c) -> bool canClaim?(entityRef)
    //   subVtable[8]  (byte offset 0x20) -> void markClaimed?(entityRef, 1)
    let newIndex = -1;
    if (entityRef != null) {
      const subVtable = (entityRef as any)[0x60] as any;
      const canClaim = (subVtable as any)[0x1c](entityRef) as boolean;
      if (canClaim) {
        (subVtable as any)[0x20](entityRef, 1); // 1 pushed as pushw (16-bit) in asm
        newIndex = (gameRules as any).AddObjectiveInList(
          entityRef,
          (this as unknown as number) + 0x64,
        );
      }
    }

    if (newIndex === -1) {
      // eslint-disable-next-line no-continue
      continue;
    }

    // Broadcast to every connected player (1..maxClients).
    // gpGlobals[36] (byte offset 0x90) is interpreted as maxClients here;
    // HLSDK has maxClients at offset 0x3c, so 0x90 implies a TS-extended layout.
    // TODO(asm-ambiguous): confirm gpGlobals.maxClients offset.
    const maxClients = (gpGlobals as any)[0x90] as number;
    for (let i = 1; i <= maxClients; i++) {
      const target = (UTIL_PlayerByIndex as any)(i) as any;
      if (target != null) {
        (gameRules as any).SendObjectiveToHud(newIndex, target);
      }
    }
    // After the broadcast sweep, fall through to re-enter the alert block
    // (asm: `jmp 0x7bc18` at the bottom of the broadcast loop).
  }
}
