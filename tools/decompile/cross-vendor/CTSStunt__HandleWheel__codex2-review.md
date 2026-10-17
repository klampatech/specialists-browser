```
VERDICT: PASS-WITH-NOTES

**Note on the review template.** The 8-item checklist and HLSDK
reference at the top of this prompt are scoped to the **D.3
engine↔mod-interface functions** (`GiveFnptrsToDll`,
`GetEntityAPI*`, `GetNewDLLFunctions`). The function under review
— `HandleWheel__8CTSStunt` — is a **D.4 gameplay method** on the
CTSStunt class, not an interface function. There is no HLSDK
equivalent; the right comparison is the disassembly + class
context. I've kept the 8-item structure but adapted items 2/3
(which target interface-version plumbing) to the closest analog
in this function: the gate flag (item 2) and the edict save/read
(item 3). Items 1, 4–8 adapt cleanly.

Checklist:
1. Signature — ✅ — `HandleWheel(this: CTSStunt): void` matches
   the demangled `HandleWheel__8CTSStunt`. Return type `void` is
   correct (no return in asm). The asm's cdecl-style `this`-on-
   the-stack at `[esp+0x70]` is correctly abstracted as a typed
   `this` parameter.
2. Gate check (adapted from version check) — ✅ — The
   `pev+0x1a5 & 0x2` gate is preserved with the right polarity
   (`=== 0` → return). The asm's `je 0x8b9ee` jumps to the
   epilogue, equivalent. The semantic meaning of bit 0x2 at
   offset 0x1a5 is unknown — the TS carries an honest
   `// TODO(asm-ambiguous)` here.
3. Edict save/read (adapted from `interfaceVersion` plumbing) —
   ✅ — The save `mov [esp+0xc], eax` at 0x8b9aa is captured as
   `pev.dword_0x208 = edict`. The read `push [esp+0x28]` at
   0x8b9e2 resolves to `[LOCAL_ESP + 0x0c]` (verified: esp at
   the push = LOCAL_ESP − 0x1c; source = LOCAL_ESP − 0x1c + 0x28
   = LOCAL_ESP + 0x0c, which is the saved edict). The TS
   correctly treats this as edict.
4. Success path / branch convergence — ✅ — Both branches (A:
   `0x400` set; B: `0x400` unset) and the common epilogue (set
   `pev+0x11c = 1.0`, vtable call, EMIT_SOUND_DYN) are present
   and in the right order. The FPU scaling
   `temp = GLOBAL_GRAVITY * this->vec3_0x20` and the back-copy
   `this->vec3_0x20 = temp` are correctly captured. The
   no-op restore (read-back from `this->vec3_0_20` into `temp`)
   is preserved via `{...this->vec3_0_20}`. The `setne`/raw-int
   pair at 0x8b980–0x8b98a is encoded correctly.
5. No fabricated paths — ⚠️ — Three issues:
   - **`EMIT_SOUND_DYN` is called with 9 args; the demangled
     signature has 8.** Signature: `EMIT_SOUND_DYN(edict_t*,
     int, const char*, float, float, int, int, float)`. The TS
     inserts a fabricated `0` (labeled "unused in this asm")
     and pushes `0.5` as arg9. In the asm, `0.5` is the **stack
     leftover** from the vtable sub-prologue's first push at
     `[LOCAL_ESP − 4]`; it becomes arg8 of EMIT_SOUND_DYN
     without being pushed again. Cleanup `add esp, 0x20` (32 B
     = 8 dwords) confirms 8 args. The `0` is fabricated.
   - **`vtableCall(0, 0x1f, 0.5, edict)` has the wrong args.**
     The asm cdecl args are `(0, 0x1f, alignment_slot, 0.5)`
     where `alignment_slot` is the uninitialized memory from
     `sub esp, 0x4` at 0x8b9b3. The TS substitutes `0.5` for
     the alignment slot and `edict` for `0.5` — both positions
     are wrong. **Edict is NOT passed to the vtable call**;
     it's read into a local at 0x8b9aa and pushed separately
     for EMIT_SOUND_DYN at 0x8b9e2.
   - **`0.5` is double-counted.** The TS passes 0.5 to BOTH
     `vtableCall` and `EMIT_SOUND_DYN`, but the asm only pushes
     0.5 once (as the first push of the vtable sub-prologue).
     EMIT_SOUND_DYN reads it back from the stack leftover.
6. No TODO body — ✅ — Function body is real code, not stubs.
   Two honest `// TODO(asm-ambiguous)` comments flag the gate
   flag and vtable call args. ⚠️ But two unverified field-name
   guesses (`m_flWheelTimer`, `m_bWheelFlip`) lack TODO
   comments — should be renamed to the offset convention or
   carry explicit TODO notes.
7. Field names — ⚠️ — Most fields use the offset-suffixed
   convention (`byte_0x1a5`, `dword_0x250`, `float_0x120`,
   `vec3_0x174`). Two guesses:
   - `m_flWheelTimer` for `[ebp+0x4]` (the 0.375 float) —
     plausible but unverified.
   - `m_bWheelFlip` for `[ebp+0x2c]` (the result-compare byte)
     — plausible but unverified.
   Either rename to `float_0x4` / `byte_0x2c` to match the
   convention, or annotate with `// TODO(field-name):`.
8. Compiles in isolation — ✅ — Uses `any` for unknowns,
   declares `WHEEL_SRC_VEC`, `GLOBAL_GRAVITY`, `WHEEL_SOUND`,
   `GetDirection`, `vtableCall`, `EMIT_SOUND_DYN` locally.
   Compiles standalone.

Issues to fix (priority order):

1. **`EMIT_SOUND_DYN`: drop the fabricated `0` arg.** The call
   has 8 args, not 9. `0.5` is arg8 (the stack leftover from
   the vtable sub-prologue's first push), not an explicit
   push.
2. **`vtableCall`: arg3 is the alignment slot, arg4 is `0.5`,
   `edict` is NOT in the vtable args.** Use `undefined as any`
   for the alignment slot (uninitialized memory from
   `sub esp, 0x4`).
3. **Field-name guesses**: rename `m_flWheelTimer` → `float_0x4`
   and `m_bWheelFlip` → `byte_0x2c`, with `// TODO(field-name)`
   comments, to match the convention used everywhere else.
4. **The misleading comment block above the vtable call.** The
   current text says "only 2 explicit args (0, 0x1f); 0.5 and
   edict are passed as tail args on the stack" — this is wrong.
   `0.5` IS explicitly pushed (as the first push of the vtable
   sub-prologue, not a "tail arg"). Edict is not passed to the
   vtable at all. Update or remove.

Suggested rewrite:

```typescript
// Engine-callback placeholders. TODO(engine-callback): wire to real engine.
declare const WHEEL_SRC_VEC: any;       // global vec3 at [GOT+0x1888]
declare const GLOBAL_GRAVITY: number;   // global float at [GOT-0x6deb0]
declare const WHEEL_SOUND: any;         // global string at [GOT-0x6c364]
declare function GetDirection(a: any, b: any, c: number, d: number): number;
// vtableCall(obj, slot, ...args): cdecl. arg3 of the call is an
// uninitialized alignment slot from `sub esp, 0x4`.
declare function vtableCall(obj: any, slot: number, ...args: any[]): number;
// EMIT_SOUND_DYN: 8 args per the demangled signature.
// arg8 (origin_z_or_extra) is read from a stack leftover, NOT
// explicitly pushed.
declare function EMIT_SOUND_DYN(
  entity: any, channel: number, sample: any,
  volume: number, attenuation: number, flags: number,
  pitch: number, origin_z_or_extra: number,
): void;

/**
 * CTSStunt::HandleWheel — Apply the wheel-stunt state transition.
 *
 * Gate: bail if `pev+0x1a5` bit 0x2 is unset. Then two branches on
 * `pev+0x250` bit 0x400:
 *   - Set: clear that bit, OR in bit 0x1, write 0.25 to `pev+0x120`,
 *     copy a global source vec3 into `pev+0x174`, write 0.375 to
 *     `this+0x4`.
 *   - Unset: clear bit 0x800, OR in bit 0x20, copy the same source vec,
 *     scale `this+0x20` by a global gravity float, then call
 *     `GetDirection(&temp, &temp2, 0.6, 0.3)` where `&temp2` is read from
 *     `pev+0x74..0x80`. The result is stored as `(result !== 2)` at
 *     `this+0x2c` (byte) and the raw int at `m_pPlayer+0x2a0`.
 *
 * Both paths converge: set `pev+0x11c` to 1.0, invoke a vtable callback
 * at `[GOT+0x1aa8]+0x168` with cdecl args `(0, 0x1f, alignment-slot,
 * 0.5)` to derive a weapon-id-like int, then play a sound via
 * `EMIT_SOUND_DYN` with 8 args; arg8 = 0.5 is a stack leftover from the
 * vtable sub-prologue's first push, not an explicit push.
 *
 * Calling-convention note: this binary passes `this` on the stack at
 * [esp+0x70] (not in ECX).
 */
export function HandleWheel(this: CTSStunt): void {
  const m_pPlayer: any = (this as any).m_pPlayer;
  const pev: any = m_pPlayer.pev;

  // Gate: pev+0x1a5 bit 0x2.
  // TODO(asm-ambiguous): exact meaning of this byte flag.
  if ((pev.byte_0x1a5 & 0x2) === 0) return;

  if ((pev.dword_0x250 & 0x400) !== 0) {
    // --- Branch A: pev+0x250 bit 0x400 was set ---
    pev.dword_0x250 = (pev.dword_0x250 & ~0x400) | 0x1;
    pev.float_0x120 = 0.25;                  // 0x3e800000
    pev.vec3_0x174 = WHEEL_SRC_VEC;          // [GOT+0x1888]
    // TODO(field-name): "wheel timer" is a guess for [ebp+0x4].
    (this as any).float_0x4 = 0.375;         // [ebp+0x4] = 0x3ec00000
  } else {
    // --- Branch B: pev+0x250 bit 0x400 was unset ---
    pev.dword_0x250 = (pev.dword_0x250 & ~0x800) | 0x20;
    pev.vec3_0x174 = WHEEL_SRC_VEC;

    // temp = GLOBAL_GRAVITY * this->vec3_0x20
    const v: any = (this as any).vec3_0x20;
    (this as any).vec3_0x20 = {
      x: v.x * GLOBAL_GRAVITY,
      y: v.y * GLOBAL_GRAVITY,
      z: v.z * GLOBAL_GRAVITY,
    };
    // Read back into temp from this->vec3_0_20 (no-op semantically).
    const temp: any = { ...(this as any).vec3_0_20 };

    // TODO(asm-ambiguous): pev+0x74..0x80 doesn't map to a standard
    // entvars_t vec3 grouping (likely idealpitch/pitch_speed/ideal_yaw).
    const outVec: any = {
      x: pev.float_0x74,
      y: pev.float_0x78,
      z: pev.float_0x7c,
    };

    const result: number = GetDirection(temp, outVec, 0.6, 0.3);
    // TODO(field-name): "wheel flip" is a guess for [ebp+0x2c].
    (this as any).byte_0x2c = (result !== 2) ? 1 : 0;
    m_pPlayer.dword_0x2a0 = result;
  }

  // --- Common epilogue ---
  pev.float_0x11c = 1.0;                                  // 0x3f800000
  const edict: any = pev.dword_0x208;                     // [pev+0x208]

  // Vtable call: [GOT+0x1aa8]+0x168
  // cdecl args (low to high): 0, 0x1f, alignment_slot, 0.5.
  // The alignment slot is from `sub esp, 0x4` and is uninitialized.
  // TODO(asm-ambiguous): which vtable? which method?
  const weaponBase: number = vtableCall(
    /* obj */        undefined as any,
    /* slot */       0x168,
    0,                  // arg1
    0x1f,               // arg2
    undefined as any,   // arg3 — alignment slot (uninitialized)
    0.5,                // arg4
  );
  const weaponId: number = weaponBase + 0x5f;

  // EMIT_SOUND_DYN: 8 args per demangled signature.
  // arg8 (0.5) is the stack leftover from the vtable sub-prologue's
  // first push at [LOCAL_ESP − 4]; it is NOT explicitly pushed here.
  EMIT_SOUND_DYN(
    /* edict */       edict,
    /* channel */     4,
    /* sample */      WHEEL_SOUND,
    /* volume */      1.0,
    /* attenuation */ 0.8,
    /* flags */       0,
    /* pitch */       weaponId,
    /* extra */       0.5,                              // from vtable leftover
  );
}
```
