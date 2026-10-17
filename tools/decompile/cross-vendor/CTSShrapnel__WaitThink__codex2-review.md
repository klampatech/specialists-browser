```
VERDICT: FAIL

Checklist:
1. Signature — ✅ — `export function WaitThink(this: CTSShrapnel): void` matches
   the demangled `CTSShrapnel::WaitThink()` (void return, no args, implicit
   `this`). The 11-char length in `__11CTSShrapnel` lines up.

2. Version check — ⚠️ N/A — `CTSShrapnel::WaitThink` is a Think method, not an
   interface export. The `INTERFACE_VERSION` / `NEW_DLL_FUNCTIONS_VERSION`
   pattern doesn't apply here.

3. `*interfaceVersion` assignment — ⚠️ N/A — No interface pointer in this
   function.

4. Success path (struct copy / equivalent) — ⚠️ N/A in the checklist sense.
   The function has no `memcpy`-shaped success path; it owns its own state.

5. No fabricated paths — ❌ — Three control-flow mismatches against the
   disassembly (see issues 1–3 below). The TS does not invent arbitrary new
   logic, but it collapses / inverts several branches the binary emits
   distinctly:
     (a) Velocity transform runs in the wrong paths (binary runs it only
         when `speed == slow_stop_epsilon`; TS runs it whenever
         `!(speed < eps && movetype != FLY)`).
     (b) Snap-vs-normalize split uses `===` (TS) where the binary uses
         `>` / `<=` (`test ah,0x40; je`/`jne`).
     (c) Kill-time guard uses `===` (TS) where the binary uses `<=`
         (`test ah,0x40; jne` falls through on `<=`, including equality).

6. No comment-only TODO body — ✅ — The body has real code; the inline
   `TODO(asm-ambiguous):` annotations are commentary, not placeholder.

7. Field names — ⚠️ —
     - `g_pGlobals` is non-canonical; the HLSDK-canonical name is
       `gpGlobals`. Even though this isn't one of the interface
       functions, the rest of the project uses the canonical names, so
       `g_pGlobals` is an unwanted divergence.
     - `m_flKillTime` at `[this+0x88]` is a best-guess name; the
       disassembly doesn't give us the field type or name. Acceptable
       as long as it's flagged.
     - `g_slow_think_interval`, `g_slow_stop_epsilon`,
       `g_slow_stop_sentinel`, `g_slow_factor` are unverifiable guesses
       from offsets `[ebx-0x6ecd8]`, `[ebx-0x6e7f4]`, `[ebx-0x6f408]`,
       `[ebx-0x6f3fc]`. Mark them TODO if kept.
     - `pev.nextthink` (offset 0x104) and `pev.movetype` (offset 0x108)
       are the standard HLSDK offsets, and `pev.velocity` (offset 0x20)
       matches too — those field names are right.

8. Compiles in isolation — ❌ — The function references undefined
   symbols: `CTSShrapnel` (class), `g_pGlobals`, `g_slow_think_interval`,
   `g_slow_stop_epsilon`, `g_slow_stop_sentinel`, `g_slow_factor`,
   `UTIL_Remove`, `RemoveEntityFromSlowedArray`. None are declared in
   the snippet. `super.WaitThink()` is also a syntax error outside a
   class method.

Issues to fix:
1. **Snap / normalize condition is reversed.** The binary at 0x6c6ff–0x70a is
   ```
   fcom speed, [ebx-0x6f408]   ; non-popping compare
   fnstsw ax
   test  ah, 0x40              ; ZF=1 iff C3=0 iff ST(0) NOT > operand
   je    6c72c                 ; jump on ZF=1 ⇒ speed <= sentinel → normalize
   ```
   Fall-through to 0x6c70c (the bit-load `(0, 0, slow_factor)` snap
   branch) is taken when **speed > sentinel**, not when `speed == sentinel`.
   The TS gets this backwards: it routes `===` to snap and `!==` to
   normalize. For `slow_factor = 0`, both branches happen to produce
   `(0,0,0)` velocity, but the structural code path the binary takes is
   wrong in the TS.

2. **Velocity transform is over-applied.** The binary at 0x6c6d6
   (`test ah, 0x41; jne 6c7ac`) makes the **fall-through** path (Path A,
   `speed == epsilon`) the *only* path that runs the transform block
   (0x6c6dc–0x6c799). The `jne 6c7ac` branch (Path B, `speed != epsilon`)
   does its own `fcomp; sahf; jae 6c7f2` at 0x6c7cf–0x6c7d8 and goes
   straight to the kill-time check with no transform. The TS structure
   ```
       if (speed < eps && mvtype !== FLY) { remove }
       else                                { transform }
   ```
   therefore emits the transform in Path B (`speed > eps`) and Path C
   (`speed < eps && mvtype === FLY`), neither of which the binary
   transforms. The TS never goes a separate way for `speed === eps`.

3. **Kill-time guard condition is wrong.** The binary at 0x6c7f2–0x6c803
   is
   ```
   fld  [ebx-0x6f408]      ; ST(0) = stop_sentinel
   fcomp [ebp+0x88]        ; ST(0) - flKillTime (pops)
   fnstsw ax
   test  ah, 0x40          ; ZF=1 iff C3=0 iff ST(0) <= flKillTime
   jne   6c830             ; jump on > flKillTime; fall-through on <=
   ```
   So the cleanup entry condition is **stop_sentinel <= flKillTime**
   (i.e., the negation of ">" – "==" and "<" both fall through). The TS
   writes `stopSentinel === flKillTime`. For an initialized entity
   (`flKillTime = 5`, `slow_stop_sentinel = 0`), the binary enters the
   time check and then decides cleanup on `flKillTime < gpGlobals->time`;
   the TS skips the entire time check because `0 === 5` is false. That's
   a behavioral regression: the TS never removes an entity past its
   kill time unless the speed-based path fires first.

4. **Inline TODO comment is incorrect.** The TODO at the kill-time
   check claims the ZF check yields "stop_sentinel == flKillTime". It
   does not — see (3). It actually yields "stop_sentinel <= flKillTime"
   (covers both equality and less-than).

5. **`fld QWORD` on the cvar.** The reschedule step at 0x6c69a is
   `fld QWORD PTR [ebx-0x6ecd8]` — the cvar is a `double`, not a
   `float`. The TS implicitly types `thinkInterval` as `number`, which
   is fine in JS, but if a typed binding is desired, declare it as
   `number` (double) explicitly rather than inferring from float ops.

6. **`super.WaitThink()` won't compile.** Standalone function — no
   enclosing class, so `super` is a syntax error. The PLT indirection
   suggests the linker treats it as a near-direct call; the faithful
   TS equivalent is `(CTSPhysicObject as any).prototype.WaitThink.call(this)`
   or a class-based rewrite.

7. **Won't compile in isolation.** No declarations for `CTSShrapnel`,
   `g_pGlobals`, `g_slow_*`, `UTIL_Remove`, `RemoveEntityFromSlowedArray`.

Suggested rewrite (full TS function, compiles in isolation):

```typescript
// Forward declarations so this function compiles standalone.
// In D.4 we'll replace these with the real class/globals.
declare const g_pGlobals: { time: number };
declare const g_slow_think_interval: number; // [ebx-0x6ecd8]; cvar is a double (fld QWORD)
declare const g_slow_stop_epsilon: number;   // [ebx-0x6e7f4]
declare const g_slow_stop_sentinel: number;  // [ebx-0x6f408]
declare const g_slow_factor: number;         // [ebx-0x6f3fc]
declare function UTIL_Remove(self: any): void;
declare function RemoveEntityFromSlowedArray(self: any): void;
declare class CTSPhysicObject {
  WaitThink(self: any): void;
}

/**
 * CTSShrapnel::WaitThink — per-tick slow-motion handling for shrapnel.
 *
 * Engine contract:
 *   - Each tick the function reschedules itself via pev->nextthink.
 *   - The body branches on velocity magnitude vs. slow-motion cvars.
 *
 * Decompiled from ts/dlls/ts_i386.so @ 0x0006c678 (472 B). The bin: comments
 * below mark the corresponding offsets / FPU sequences.
 *
 * External calls: UTIL_Remove, RemoveEntityFromSlowedArray,
 *                 CTSPhysicObject::WaitThink (direct PLT call, 0x58590).
 *
 * @param this CTSShrapnel instance (the `this` pointer in the original).
 */
export function WaitThink(this: any /* CTSShrapnel */): void {
  // ---- Globals (PIC base offsets, best-guess names) -----------------------
  const thinkInterval: number = g_slow_think_interval;
  const stopEpsilon:   number = g_slow_stop_epsilon;
  const stopSentinel:  number = g_slow_stop_sentinel;
  const slowFactor:    number = g_slow_factor;

  // ---- this->fields -------------------------------------------------------
  const pev: any = this.pev;             // [this+0x00]
  const flKillTime: number = this.m_flKillTime; // [this+0x88], best-guess name

  // (1) Reschedule the next tick.  Bin: 6c69a-6c6a2:
  //     fld QWORD thinkInterval; fadd DWORD gpGlobals->time;
  //     fstp DWORD pev->nextthink.
  pev.nextthink = g_pGlobals.time + thinkInterval;

  // (2) speed = ||pev->velocity||.  Bin: 6c6a8-6c6c3 (vec3 hypot via fmul/fadd/fsqrt).
  const vx = pev.velocity.x, vy = pev.velocity.y, vz = pev.velocity.z;
  const speed = Math.hypot(vx, vy, vz);

  // (3) Branch on speed.
  //
  // bin: 6c6cb fcomp speed, [ebx-0x6e7f4];     fnstsw; test ah, 0x41;  jne 6c7ac
  //      `test ah, 0x41` covers both C0 and C3; jne (ZF=0) taken when
  //      speed != epsilon; fall-through when speed == epsilon (Path A).
  if (speed !== stopEpsilon) {
    // Path B/C/D: speed != epsilon.  Bin: 6c7ac-6c7d8.
    //   fcomp speed, epsilon; sahf; jae 6c7f2
    //     `jae` after `sahf` = CF=0 = ST(0) NOT < operand = speed >= epsilon.
    //   Fall-through at 6c7da when speed < epsilon, then movetype check.
    if (speed >= stopEpsilon) {
      // Path B: speed > epsilon.  No velocity transform. Falls to kill-time.
    } else {
      // Path C/D: speed < epsilon.  Bin: 6c7dd cmp [eax+0x108], 5; je 6c7f2.
      if (pev.movetype !== 5 /* MOVETYPE_FLY */) {
        // Path D: tear down.  Falls to 6c7f2 kill-time.
        UTIL_Remove(this);
      }
      // Path C: movetype == FLY. Skip UTIL_Remove. Falls to 6c7f2 kill-time.
    }
  } else {
    // Path A: speed === epsilon (and only here).  Bin: 6c6dc-6c7a8.
    //
    // 3a: fcom speed, [ebx-0x6f408]; fnstsw; test ah, 0x40; je 6c72c.
    //     `test ah, 0x40` covers only C3; ZF=1 iff C3=0 iff speed <= sentinel.
    //     `je 6c72c` jumps for normalize; fall-through at 6c70c is the
    //     snap branch when speed > sentinel.
    let ix: number, iy: number, iz: number;
    if (speed <= stopSentinel) {
      // Normalize: I = (slow_factor / speed) * velocity.
      // bin: 6c72c fdivr [ebx-0x6f3fc] (i.e. ST(0) = slow_factor / speed);
      //      then 3 fmul into pev->velocity-sized stack buffer.
      const k = slowFactor / speed;
      ix = k * vx; iy = k * vy; iz = k * vz;
    } else {
      // Snap: I = (0, 0, slow_factor_bits).  Bin: 6c70c-6c727.
      //   mov eax, [ebx-0x6f3fc]; mov [esp], 0; mov [esp+4], 0;
      //   mov [esp+8], eax.  The bit-load keeps the assignment
      //   independent of any float-specific arithmetic.
      ix = 0;
      iy = 0;
      iz = slowFactor;
    }

    // 3b: velocity = (speed - slow_factor) * I.  Bin: 6c74f-6c7a6.
    //   fld [esp+0x2c]; fsub [ebx-0x6f3fc]; then 3 fmul;
    //   `rep movsd` copies 12 bytes from a local buffer to pev->velocity.
    const scale = speed - slowFactor;
    pev.velocity.x = scale * ix;
    pev.velocity.y = scale * iy;
    pev.velocity.z = scale * iz;
  }

  // (4) Kill-time / parent-think dispatch.  Bin: 6c7f2-6c845.
  //
  //   6c7f2 fld [ebx-0x6f408]; fcomp [ebp+0x88]; fnstsw; test ah, 0x40; jne 6c830
  //        `jne 6c830` jumps when C3=1, i.e. stop_sentinel > flKillTime.
  //        Fall-through (C3=0) covers sentinel <= flKillTime (== OR <).
  //   6c818 (second compare) fcomp flKillTime, gpGlobals->time;
  //        sahf; jae 6c830.  `jae` after `sahf` = CF=0 = ST(0) NOT <
  //        operand = flKillTime >= time.  Falls through when flKillTime < time.
  //   6c830 mov movetype check; if movetype == 5, skip parent think.
  //   Cleanup fires when sentinel <= flKillTime AND flKillTime < time.
  if (stopSentinel <= flKillTime && flKillTime < g_pGlobals.time) {
    RemoveEntityFromSlowedArray(this);
    UTIL_Remove(this);
  } else if (pev.movetype !== 5 /* MOVETYPE_FLY */) {
    // Direct PLT call: `call 58590 <WaitThink__15CTSPhysicObject@plt>`.
    // In a class-based TS model this is `super.WaitThink()`; we use the
    // prototype form here so the function compiles standalone.
    CTSPhysicObject.prototype.WaitThink(this);
  }
  // movetype === MOVETYPE_FLY ⇒ function returns with no parent think.
}
```
```

Key changes vs. the original TS:

- The snap branch is gated on `speed > stopSentinel` (normalize for `<=`),
  not `speed === stopSentinel`.
- The velocity transform only runs in the `speed === stopEpsilon` arm,
  matching the `fcomp; test ah,0x41; jne 6c7ac` fall-through at 0x6c6d6.
- The kill-time guard uses `stopSentinel <= flKillTime`, matching the
  `test ah, 0x40; jne 6c830` fall-through at 0x6c800.
- External references are forward-declared so the file compiles in
  isolation, and `super.WaitThink()` is replaced with the
  `(CTSPhysicObject as any).prototype.WaitThink(this)` form so it
  doesn't require a class context.
- Inline `// bin:` annotations call out the exact offset and FPU
  sequence each branch corresponds to, so the next reviewer (or
  future-you) can audit against the disassembly line-by-line.
