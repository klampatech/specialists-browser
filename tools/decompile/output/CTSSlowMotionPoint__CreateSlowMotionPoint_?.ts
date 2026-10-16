/**
 * CTSSlowMotionPoint::CreateSlowMotionPoint — static factory that
 * allocates a new CTSSlowMotionPoint via GetClassPtr, plants it at
 * `position`, runs Spawn(), then activates slow-mo. Returns null on
 * allocation failure after broadcasting an HUD-centerprint error.
 *
 * Demangled: `CTSSlowMotionPoint::CreateSlowMotionPoint(Vector, float, float, float, bool)`
 * Static method — no implicit `this` in the C++ signature.
 *
 * Disassembly walkthrough (ts/dlls/ts_i386.so @ 0x000614d8, 140 bytes):
 *   1. GetClassPtr(0) — engine-side entity allocation. The trailing
 *      `0x0` push is a void* arg whose meaning is unclear; see
 *      `GetClassPtr__H1Z18CTSSlowMotionPoint_PX01_PX01`.
 *   2. Null-check the result; on failure, broadcast via
 *      UTIL_ClientPrintAll(msg_type=3, <static-error-string>,
 *      4×0[varargs]) — the GOT-relative error string at GOT-0x6ecb0
 *      is unknown (likely an "out of edicts" diagnostic).
 *   3. rep movsd 3 dwords from the position Vector into
 *      `pev->origin` (pev is at this+0x00, origin at pev+0x08).
 *   4. Virtual call through `*(this+0x60) + 0x24` — by elimination
 *      this is most plausibly CBaseEntity::Spawn(); the class's vtable
 *      has 70 entries so the slot index is not pinpointable without
 *      reading `__vt_18CTSSlowMotionPoint` directly.
 *   5. cdecl call to ActivateSlow(this, duration, slowAmount, radius,
 *      bool). Note `push ax` (not `push al`) — compiler packs the
 *      1-byte bool into a 2-byte stack slot.
 *   6. Return the new entity on success, 0 on failure.
 */
export function CreateSlowMotionPoint(
  position: { x: number; y: number; z: number },
  duration: number,
  slowAmount: number,
  radius: number,
  active: boolean
): any | null {
  // 1. Engine-side entity allocation.
  //    Disassembly pushes a literal 0x0 before the call; we omit it
  //    here for clarity but the meaning (parent ent? init ptr?) is
  //    TODO(asm-ambiguous).
  const point: any = (globalThis as any).GetClassPtr?.(CTSSlowMotionPoint);

  // 2. Allocation failure → broadcast error & return null.
  if (point === null || point === undefined) {
    // TODO(asm-ambiguous): error string is a static C string at
    // GOT-0x6ecb0 in ts_i386.so; msg_type 3 = HUD center print.
    // The 4 trailing zero pushes are likely unused printf-varargs.
    (globalThis as any).UTIL_ClientPrintAll?.(3, /* TODO: GOT-0x6ecb0 */ "");
    return null;
  }

  // 3. Copy position Vector (12 bytes / 3 dwords) into pev->origin.
  //    cld; mov ecx,3; rep movsd → field-by-field copy in TS.
  point.pev.origin.x = position.x;
  point.pev.origin.y = position.y;
  point.pev.origin.z = position.z;

  // 4. Virtual Spawn() — *(this+0x60) is vfptr, target at byte offset
  //    0x24 (= vtable[9] for 4-byte ptrs). Naming it Spawn() is
  //    best-effort: not directly verifiable from disassembly alone.
  //    TODO(vtable-slot): confirm against __vt_18CTSSlowMotionPoint.
  point.Spawn?.();

  // 5. Activate slow-mo effect. The disassembly packs the bool into a
  //    2-byte `ax` slot via `push ax` — TS just passes the bool.
  point.ActivateSlow?.(duration, slowAmount, radius, active);

  return point;
}

// Type placeholders (would be imported from the project's class definitions).
declare const CTSSlowMotionPoint: any;
