```
VERDICT: PASS-WITH-NOTES

Checklist:
1. Signature — ✅ — `SwitchFireMode(this: CTSGun): void` matches the demangled
   `CTSGun::SwitchFireMode()` (zero args, void return). The disassembly loads
   `esi` from `[esp+0x8]`, which on a `__thiscall` method is the hidden `this`
   pushed by the caller. Sibling methods (`Spawn__6CTSGun`, `Deploy__6CTSGun`,
   `Reset__6CTSGun`) all follow the same `void(void)` shape, so the signature
   is consistent.

2. Version check — N/A — `SwitchFireMode` is a gameplay method on `CTSGun`,
   not one of the four engine↔mod interface functions in the HLSDK reference
   (`GiveFnptrsToDll`, `GetEntityAPI`, `GetEntityAPI2`, `GetNewDLLFunctions`).
   The `INTERFACE_VERSION` / `NEW_DLL_FUNCTIONS_VERSION` patterns don't apply
   to a per-weapon state-machine method. Marking N/A rather than pass.

3. `*interfaceVersion` assignment-back — N/A — Same reason as #2. There's no
   engine pointer to write back to.

4. Success path — ✅ (adapted) — The function's "success path" is the
   post-loop HUD mirror: read the just-updated `config.currentMode`, add 1
   (1-indexed), write to `*(CBasePlayer + 0x490 + m_iId + 0xa)`.
   - Assembly: `mov al,BYTE PTR [eax+0x2]; inc eax; mov BYTE PTR [ecx+edx*1],al`.
   - TS: `this.m_pPlayer[0x490 + this.m_iId + 0xa] = (nextMode + 1) & 0xff`.
   The `BYTE PTR` store vs `& 0xff` byte-truncation matches.

5. No fabricated paths — ✅ — Every branch traces to the disassembly:
   - Null-check on `m_pFireModeConfig` →
     `cmp [esi+0xcc],0x0; je end` → `if (!config) return`.
   - Initial `cl = currentMode + 1` →
     `lea ecx,[eax+0x1]` → `nextMode = config.currentMode + 1`.
   - `dl = 0` (found-flag init) → `mov dl,0x0`.
   - Loop body: `sar eax,cl; test eax,0x1; je skip` →
     `if ((mask >>> nextMode) & 1) { ... }`.
   - On bit set: `mov BYTE PTR [eax+0x2],cl; mov dl,0x1` →
     `config.currentMode = nextMode; break`.
   - Increment + wrap-mod-6: `inc ecx; mov eax,0x0; cmp ecx,0x6;
     setge al; dec eax; and ecx,eax` →
     `nextMode++; if (nextMode >= 6) nextMode = 0;`.
     Note `setge` only sets `al`, but the preceding `mov eax,0x0` zeroes the
     full 32-bit register first, so `eax = (ecx>=6) ? 0 : 0xFFFFFFFF` and
     `and ecx,eax` performs the conditional clear correctly. The TS rewrite
     with an `if` is equivalent and clearer.
   - Loop-back: `test dl,dl; je loop_top` → `for(;;)` with `break` on found.
   - Post-loop mirror: correct.

   One subtle detail the TS gets right and is easy to miss: the assembly
   increments `ecx` *before* the `test dl,dl; je loop_top` test, so when the
   loop exits successfully `ecx` is already past the found value. But the
   post-loop code reads `config[+0x2]` (the just-written found value), not
   `ecx`, so the TS's `nextMode` (which equals the found value at break)
   is the right basis for the `+ 1` mirror.

6. No TODO body — ✅ — Function body is fully implemented. The single
   `// TODO(asm-ambiguous):` is at the top of the file about field-name
   semantics (offsets-to-names mapping), not a placeholder for missing logic.

7. Field names — ⚠️ — Names are inferred from offsets:
   - `+0x80` → `m_iId` (matches HLSDK `CBasePlayerItem::m_iId`)
   - `+0xc8` → `m_pPlayer` (matches HLSDK `CBasePlayerItem::m_pPlayer`)
   - `+0xcc` → `m_pFireModeConfig` (TS-specific, inferred from null-check)
   - `+0xd0` → `m_pFireModes` (TS-specific, inferred)
   - config `+0x2` → `currentMode` (byte)
   - modes `+0xc` → `fireModeBitmask` (dword)

   The two HLSDK-aligned names (`m_iId`, `m_pPlayer`) are well-justified.
   The four TS-specific names are reasonable but not yet cross-checked
   against the TS source. The top-of-file TODO acknowledges this, and the
   `m_pPlayer: Uint8Array` annotation flags that it's a byte-buffer stand-in
   for `CBasePlayer` until that class lands in D.4/D.5. Acceptable for the
   D.3 decompile stage; needs verification against `HANDOFF.md` / `SPEC.md`
   field tables in D.4.

8. Compiles in isolation — ✅ — `CTSGunFireModeConfig`, `CTSGunFireModesList`,
   and `CTSGun` are all defined inline. No external type references. The
   `Uint8Array` + `number` typing keeps the function fully typed without
   depending on a `CBasePlayer` definition.

Issues to fix:
- (None blocking.) The function faithfully captures the assembly's logic.
- Minor (carry-over, not introduced by this function): `m_pPlayer: Uint8Array`
  should be promoted to `m_pPlayer: CBasePlayer` once that class is defined in
  D.4/D.5, and the byte-buffer index should become a typed field (e.g.,
  `m_pPlayer.m_rgFireMode[m_iId]` or whatever the actual HUD field is named).
  The `0xa` offset on top of the `0x490` base + per-weapon index strongly
  suggests a small per-weapon array — likely `m_rgAmmo`-style. Will be
  verified in D.4.
- Minor (informational, not a decompile bug): the original assembly's loop
  infinite-loops if `fireModeBitmask == 0` (no valid fire modes). The TS
  preserves this faithfully; it's a faithful reproduction of the original
  behavior, not a decompile error. Worth flagging because the TS mod may
  want to guard against this — but that's a D.4 gameplay-policy question,
  not a decompile fix.
- Minor (informational, not a bug): `sar eax, cl` (arithmetic shift) vs the
  TS's `mask >>> nextMode` (logical shift). For testing bit 0 of the shifted
  value they're equivalent; for any other bit they're not. Since  `SwitchFireMode` only ever inspects bit 0, the substitution is safe here.

Suggested rewrite (no rewrite needed; function is correct):

The current TS is a faithful, clean expression of the assembly. No
corrections required. The only future edits will be the `m_pPlayer` type
promotion noted above (D.4/D.5) and field-name confirmation against the TS
source when D.4 lands.
```
