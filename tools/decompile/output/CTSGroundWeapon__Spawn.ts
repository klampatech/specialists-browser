  // 5. Set the model. Re-fetch weapon info (in case the
  //    override above changed the type) and call the engine
  //    function at slot 2 of the dispatch table at
  //    [ebx+0x1aa8] with (pev+0x208, modelname).
  //
  //    The disassembly pushes edi = [pev+0x208] as the first
  //    arg — NOT `this.pev` itself. In stock HLSDK, pev+0x208
  //    lands in the user-field area (near fuser1/iuser4);
  //    this build's entvars_t is non-stock (it puts `flags`
  //    at 0x1a0), so the field's identity is unknown without
  //    the TS-mod entvars header. Do NOT assert it is pev.
  //
  //    The slot index is 2 (= byte offset 0x8 in a table of
  //    4-byte pointers). In stock multiplayer HLSDK, slot 2
  //    is `pfnPrecacheGeneric(int)` — NOT `pfnSetModel`
  //    (which is slot 3). Either the TS mod reordered the
  //    table, or `[ebx+0x1aa8]` is a different dispatch
  //    table entirely. The TS code's prior claim of
  //    `pfnSetModel(this.pev, ...)` is a fabrication until
  //    that is verified against the TS-mod enginefuncs_t
  //    header.
  const weaponInfo2: any = get_weapon_info(this.weaponType);
  const arg1: any = (this.pev as any)[0x208 / 4]; // pev+0x208 — semantics TBD
  g_engfuncsDispatchTable[2](arg1, weaponInfo2 + 0x1f2);
