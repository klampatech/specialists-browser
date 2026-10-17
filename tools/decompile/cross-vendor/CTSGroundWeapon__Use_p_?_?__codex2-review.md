```
VERDICT: PASS-WITH-NOTES

Checklist:
1. Signature — ✅ PASS — `Use__15CTSGroundWeaponP11CBaseEntityT18USE_TYPEf`
   decodes to three explicit args: `(CBaseEntity*, USE_TYPE, float)`. The
   decompiled TS matches exactly: `(pActivator, useType, flValue)`. After
   `sub esp, 0x14`, `[esp+0x18]` = arg0 = pActivator and `[esp+0x1c]` =
   arg1 = useType, and the body pushes **only those two** to the indirect
   call. flValue sits at `[esp+0x20]` and is correctly accepted-but-unused.
   Note: this is **different** from the standard HLSDK
   `CBaseEntity::Use(CBaseEntity*, CBaseEntity*, USE_TYPE, float)` 4-arg
   virtual signature. The TS override is 3-arg — the demangler and
   disassembly both agree, so the decompiled TS is right to follow the
   demangler, not the parent C++ convention. (Worth a one-line note in
   HANDOFF.md so D.4 knows this isn't a drop-in override.)
2. Version check — N/A — this is a gameplay method, not one of the 4
   engine↔mod entry points that the `interfaceVersion` pattern applies to.
3. `*interfaceVersion` assignment — N/A — not an API function.
4. Success path / struct copy — N/A — analogous "success path" here is the
   indirect dispatch through `pActivator[0x60][0x118]`, which is faithfully
   preserved.
5. No fabricated paths — ✅ PASS — only the indirect call through the
   activator's offset-0x60 dispatch table is emitted; every instruction in
   the disassembly has a corresponding statement in the body. The invented
   function-type signature `(CBaseEntity*, USE_TYPE) -> void` is forced by
   the two pushed args (pActivator, useType) and is consistent with cdecl
   arg-order reconstruction.
6. No TODO body — ✅ PASS — the body is a real call, not a stub. The
   three `// TODO` comments are about *ambiguities* (offset 0x60
   identity, target function identity, external type wiring) per the
   conversion-guidance allowance. The third TODO ("CTSGroundWeapon,
   CBaseEntity, USE_TYPE are defined elsewhere") is a bit hand-wavy but
   accurate and doesn't replace any real code.
7. Field names — ⚠️ PASS-WITH-NOTES — `dispatchTable` is an invented name,
   but the original code has no symbol for that offset either; the TODO
   explicitly flags it as asm-ambiguous. Offsets `0x60` and `0x118` are
   preserved verbatim. No names collide with known C fields
   (`g_engfuncs`, `gpGlobals`, `gFunctionTable`).
8. Compiles in isolation — ❌ FAIL — `CBaseEntity`, `USE_TYPE`, and
   `CTSGroundWeapon` are referenced as type annotations but none are
   defined in this file. The parameter-type annotations on the inline
   function type `(a: CBaseEntity, u: USE_TYPE) => void` will throw at
   compile time. Per item 8 guidance, unknowns should be `any`.

Issues to fix:
- Replace `CBaseEntity`, `USE_TYPE`, `CTSGroundWeapon` with `any` (or
  local placeholder types) so the function compiles in isolation. The
  caller in D.4 will re-type them when class reconstruction lands.
- Otherwise the decompilation is faithful. No logic changes needed.

Suggested rewrite (full TS function):
```typescript
/**
 * CTSGroundWeapon::Use — forward a "use" event through the activator's
 * dispatch table at offset 0x60.
 *
 * The TS override's signature is `(CBaseEntity*, USE_TYPE, float)`,
 * which differs from the standard HLSDK `CBaseEntity::Use` 4-arg virtual.
 * The body reads only the first two args from the stack and forwards them
 * to an indirect call; `flValue` is accepted to match the demangled
 * signature but is intentionally not forwarded.
 *
 * @param this       The CTSGroundWeapon entity instance (the ground weapon)
 * @param pActivator The entity using / picking up this weapon
 * @param useType    USE_TYPE describing how the weapon is being used
 * @param flValue    Float value paired with the use event (unused)
 * @returns          void
 */
export function Use(
  this: any,
  pActivator: any,
  useType: any,
  flValue: number
): void {
  // ASM (thiscall, 3 explicit args):
  //   sub esp, 0x14         ; 20-byte local frame
  //   mov eax, [esp+0x18]   ; eax = pActivator  (arg0, [esp+0x18])
  //   mov edx, [eax+0x60]   ; edx = pActivator->dispatchTable (TS-specific)
  //   push [esp+0x1c]       ; push useType      (arg1, [esp+0x1c])
  //   push eax              ; push pActivator
  //   call [edx+0x118]      ; dispatch(pActivator, useType)
  //   add esp, 0x1c         ; 0x14 (locals) + 0x08 (2 pushed args)
  //   ret
  //
  // `this` (CTSGroundWeapon*) sits in ECX at the call site but is NOT
  // used as `this` of the indirect dispatch — ECX is preserved untouched
  // across the call. So this is a static / free-function indirect call,
  // not a virtual dispatch through a vtable.

  // TODO(asm-ambiguous): CBaseEntity+0x60 is not the standard vtable
  //   slot (single-inheritance classes keep the vtable at offset 0). It
  //   may be a TS-specific dispatch table, a pev-style engine-interface
  //   pointer, or a hidden base subobject.
  // TODO(asm-ambiguous): Identify the function at dispatchTable[0x118].
  //   The 2-arg cdecl layout forces the target's signature to
  //   `(CBaseEntity*, USE_TYPE) -> void` — likely a TS-specific use
  //   fan-out, not a virtual Use override.
  // TODO: Re-type `this`, `pActivator`, `useType` to their real types
  //   once CTSGroundWeapon / CBaseEntity / USE_TYPE are defined in D.4.

  void flValue;
  const dispatchTable = (pActivator as any)[0x60] as Record<
    number,
    (a: any, u: any) => void
  >;
  dispatchTable[0x118](pActivator, useType);
}
```

Notes for HANDOFF.md / SPEC.md:
- The TS override's signature is 3-arg, not the parent's 4-arg. Either
  CTSGroundWeapon does not derive Use from CBaseEntity's virtual set
  (e.g., it's shadowed/hidden), or it's a TS-specific callback on a
  different thiscall convention. D.4 (class reconstruction) should
  check whether `Use__15CTSGroundWeapon...` corresponds to a virtual
  slot (look for vtable offset and confirming callers in
  `enginefuncs_t::pfnUse` dispatch).
- Offsets `0x60` and `0x118` on this entity are unmapped so far;
  flag for D.4 cross-reference against other TS gameplay entities
  that also have indirect-dispatch patterns.
```
