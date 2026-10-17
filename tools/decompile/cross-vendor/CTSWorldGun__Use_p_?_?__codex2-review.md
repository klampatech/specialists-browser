```
VERDICT: FAIL

The function's shape (signature, comparison logic, control flow) is
faithful to the disassembly, but the second argument passed to
GetWeapon is wrong. Tracing the stack offsets from the prologue
(`push ebx; sub esp, 0x8`) through the second `sub esp, 0x8` before
the call shows that `[esp+0x1c]` is `useType`, not `flValue`. The TS
code makes an unjustified guess where the offset analysis isunambiguous.

Checklist:
1. Signature — ✅ — `Use__11CTSWorldGunP11CBaseEntityT18USE_TYPEf`
   parses as `(CBaseEntity*, USE_TYPE, float)`; the TS signature
   `(this, p, useType, flValue)` matches.
2. Version check — N/A — this is not an interface-version function.
3. interfaceVersion assignment — N/A.
4. Success path — ❌ — calls GetWeapon, but the second arg is
   `flValue`; the disassembly pushes `[esp+0x1c]`, which (after the
   second `sub esp, 0x8`) is `useType`. The data flow is wrong.
5. No fabricated paths — ✅ — every branch in the TS maps to the
   disassembly. The conditional, the cleanup epilogue, and the
   `fcomp → fnstsw → test → jne` chain are all there.
6. No TODO body — ✅ — body is real code; the TODOs annotate real
   ambiguities (global identity, `0xcc` field meaning, GetWeapon's
   extra arg).
7. Field names — ⚠️ — `globalTime`, `activatorCooldownTime`,
   `_globalPointerAt0x1600` are descriptive but invented; this is
   acknowledged with TODOs, which is acceptable for D.3.
8. Compiles in isolation — ⚠️ — references `CTSWorldGun` (not
   defined here) and `GetWeapon` (not defined here). With minimal
   stubs (or treating both as `any`) it compiles.

Issues to fix:
- **Wrong second arg to GetWeapon** (the actual fail). Trace:
  - Function entry (32-bit cdecl, `this` in `ecx`):
    `[esp+0] = retaddr, [esp+4]=p, [esp+8]=useType, [esp+0xc]=flValue`
  - After `push ebx; sub esp, 0x8`:
    `[esp+0x10]=p` ← `mov edx, [esp+0x10]` confirms this is `p`
    `[esp+0x14]=useType, [esp+0x18]=flValue`
  - After the second `sub esp, 0x8` (at 0x91183):
    `[esp+0x18]=p, [esp+0x1c]=useType, [esp+0x20]=flValue`
  - Therefore `push DWORD PTR [esp+0x1c]` pushes `useType`,
    and `push edx` pushes `p`.
  The TS must forward `useType` as the second arg, not `flValue`.
  As a side effect, `flValue` is dropped on the floor (the original
  function never references it either — the comparison uses
  `[edx+0xcc]` from `p`, and GetWeapon's demangled symbol is
  `(CBaseEntity*)`, so `useType` may also be ignored by the callee
  but the compiler still emits the push).

- **"double-dereferences to a float" comment** (minor). The  disassembly actually performs three loads from the global chain:
  `[ebx+0x1600] → [eax] → [eax]` (the last as a float). The TS code
  writes it as `_globalPointerAt0x1600.deref.deref`, which is
  correct for "two more derefs past the global load", but the
  comment could be clearer. Not blocking.

- **`_globalPointerAt0x1600 = 0` placeholder** will null-deref at
  runtime. Acceptable as a D.3 stub; flag for D.5 when globals are
  wired up. Not a fail for "compiles in isolation".

Suggested rewrite (full TS function):

```typescript
/**
 * CTSWorldGun::Use — invoked when a world-spawned weapon entity is
 * "used" (touched or triggered). Reads a global time reference via
 * the PIC/GOT base, compares it to a float field on the activator,
 * and only delegates to GetWeapon to grant the weapon when the
 * global time has advanced past the activator's stored timestamp.
 *
 * @param this       The CTSWorldGun world-weapon entity instance
 * @param p          Activator (the entity trying to pick up the
 *                   weapon)
 * @param useType    USE_TYPE describing how the weapon was
 *                   triggered
 * @param flValue    Float value (inherited from CBaseEntity::Use;
 *                   this override does not reference it)
 */
export function Use(
  this: CTSWorldGun,
  p: any, // TODO: CBaseEntity (not yet defined)
  useType: any, // TODO: USE_TYPE enum (not yet defined)
  flValue: number,
): void {
  // PIC/GOT base in ebx (computed via the call/pop/add pattern at
  // function start). [ebx + 0x1600] is a global pointer; the
  // disassembly then loads [eax] twice more to reach a float —
  // most plausibly gpGlobals->time via a wrapper struct.
  // TODO(asm-ambiguous): identity of the global chain at
  // [ebx+0x1600]
  const _globalPointerAt0x1600: any = 0; // placeholder for the
                                         // PIC global
  const globalTime: number =
    _globalPointerAt0x1600.deref.deref as number;

  // [p + 0xcc] is a float field on the activator — most plausibly
  // a "next pickup time" / cooldown timestamp the activator  // carries.
  // TODO(asm-ambiguous): offset 0xcc meaning unclear without
  // CBaseEntity field layout
  const activatorCooldownTime: number =
    (p as any)[0xcc] as number;

  // The disassembly does
  //   fcomp [p+0xcc]   ; ST(0) = global time, compare against [p+0xcc]
  //   fnstsw ax ; ax = FPU status word
  //   test   ah, 0x41  ; test C0 (bit 0 of AH) and C3 (bit 6 of AH)
  //   jne    91193     ; skip the call if C0 OR C3 set
  // so the call only fires when ST(0) > [p+0xcc] (strict greater,
  // NaN excluded — both FPU and TS `>` agree on NaN behavior).
  if (globalTime > activatorCooldownTime) {
    // The disassembly pushes two stack args before the call:
    //   sub esp, 0x8    //   push [esp+0x1c]  ; = useType (after the second sub:
    //                     ; [esp+0x18]=p, [esp+0x1c]=useType,
    //                     ; [esp+0x20]=flValue)
    //   push edx          ; = p
    //   call GetWeapon
    //   add esp, 0x10    ; clean up sub + 2 pushes
    //
    // The demangled GetWeapon symbol only shows (CBaseEntity*), so
    // useType may be ignored by the callee, but the compiler still
    // emits the push. Forward useType faithfully; do NOT pass
    // flValue (it's at [esp+0x20], never referenced here).
    // TODO(asm-ambiguous): confirm whether GetWeapon actually
    // reads useType, or whether the push is dead
    GetWeapon.call(this, p, useType);
  }
  // flValue is intentionally dropped — neither the comparison nor
  // the GetWeapon call reference it. (It's still in the signature
  // because CBaseEntity::Use requires it.)
}
```

Note for the follow-up D.4 pass: when CTSWorldGun / USE_TYPE / CBaseEntity
types are defined, replace the `any`s. When the global chain at
`[ebx+0x1600]` is identified (probably via cross-referencing
`gpGlobals` + a wrapper struct in the engine interface code), replace
`_globalPointerAt0x1600.deref.deref` with a typed accessor (most
likely something like `gpGlobals.time`).
```
