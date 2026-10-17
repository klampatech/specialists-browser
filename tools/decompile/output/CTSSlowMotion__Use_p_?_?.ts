/**
 * CTSSlowMotion::Use — handle the "use" event for a slow-motion
 * trigger entity.
 *
 * Compiles in isolation (D.3 stub layer): all unknown project
 * types are `any`; engine globals are pulled via `globalThis`.
 *
 * Two known TODO(asm-ambiguous) items — MUST resolve before this
 * reaches gameplay:
 *   (B) esi vs pActivator: the disassembly uses `[esp+0x10]`
 *       consistently as the entity passed to `ActivateSlow` and
 *       `FireTargets`, and as the source for every field read/
 *       write. The TS currently treats that as `this` (reading
 *       (ii)), but it could equally be `pActivator` (reading
 *       (i)) under MSVC thiscall where `this` lives in ECX. To
 *       resolve, decompile another `CTSSlowMotion::` method and
 *       confirm which reading holds class-wide.
 *   (C) `[ebx+0x1c78]`: could be `gpGlobals.time` (float, current
 *       TS reading) OR the `gpGlobals` pointer itself (would make
 *       `m_flActivatedAt` a pointer-typed field, not a float).
 *       Cross-reference with the GOT layout used elsewhere for
 *       `gpGlobals` (offset 0x1600 in the same method) to classify.
 *
 * @param this        The CTSSlowMotion entity instance (reading (ii)).
 * @param pActivator  Entity that triggered the use — unused iff (B)(ii).
 * @param useType     USE_TYPE — unused in this overload.
 * @param value       Float — unused in this overload.
 */
export function Use(
  this: any,
  pActivator: any,
  useType: any,
  value: number,
): void {
  // Project globals (D.5 will replace these with real imports).
  const gpGlobals: any          = (globalThis as any).gpGlobals;
  const USE_TYPE: any           = { TOGGLE: 3 };
  const TSHudMessageAll: any    = (globalThis as any).TSHudMessageAll;
  const FireTargets: any        = (globalThis as any).FireTargets;
  const STRING: any             = (globalThis as any).STRING;

  // 1. Activate the slow-motion effect immediately.
  //    Disassembly: push esi; call ActivateSlow@plt.
  //    Under reading (B)(ii): `this.ActivateSlow()`.
  //    Under reading (B)(i):  `ActivateSlow(pActivator)`.
  // TODO(asm-ambiguous, B): confirm `esi === this` across the class.
  this.ActivateSlow();

  // 2. First-use: schedule deactivation. Disassembly writes
  //    [esi+0x14] = 0xffff0000 and [esi+0x18] = [ebx+0x1c78] together.
  //    The 0xffff0000 constant is a packed flag (low 16 bits zero,
  //    high 16 bits set); its meaning is not recoverable from the
  //    disassembly alone.
  if (this.m_flDeactivateAt === 0) {
    this.m_iDeactivateFlag = 0xffff0000;          // TODO(asm-ambiguous): decode the 0xffff0000 sentinel.
    // TODO(asm-ambiguous, C): [ebx+0x1c78] may be gpGlobals.time (float)
    //   or the gpGlobals pointer itself.
    this.m_flActivatedAt = gpGlobals.time;
  }

  // 3. If a HUD message is configured on this entity, broadcast it.
  //    Disassembly pushes (0, 0xff, 0, 0x8, 0x1e, str) — that's
  //    TSHudMessageAll(0, 0xff, 0, 8, 30, str). The string is built
  //    as pStringBase + pev->message (offset 0x1d4), i.e. STRING().
  //
  //    `cmp [edx+0x1d4], 0` in C is `!== 0` in TS for a string_t-typed
  //    field. `!== null` is only correct if D.5 ends up typing it as
  //    `string | null` (see issue E).
  if (this.pev.message !== 0) {
    TSHudMessageAll(0, 0xff, 0x00, 0x08, 0x1e, STRING(this.pev.message));
  }

  // 4. If a target is configured, fire it. Disassembly pushes
  //    (0.0, useType=3, esi, esi, str) for FireTargets — under the
  //    standard TS signature
  //    `FireTargets(target, pActivator, pCaller, useType, value)`,
  //    that's (str, esi, esi, USE_TOGGLE, 0.0).
  // TODO(asm-ambiguous, B): under reading (i), both entity args
  //   would be `pActivator` rather than `this`.
  if (this.pev.target !== 0) {
    FireTargets(STRING(this.pev.target), this, this, USE_TYPE.TOGGLE, 0.0);
  }
}
