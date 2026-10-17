export function CheckForWallJump(this: CTSStunt): boolean {
  // Disassembly loads 'this' from [esp+0x90] into ebp at entry, then reuses
  // ebp throughout. Treat the function as a free function that takes `this`
  // as its first explicit arg — matches the push-ebp call convention you
  // see at 0x8ac3a (CanDiveHigh@plt) and 0x8acd7 (UTIL_TraceLine@plt).
  const self = this as any;

  // ---- 1. Capability: CanDiveHigh must pass (test eax,eax; je fail).
  if (!CanDiveHigh(self)) return false;

  // ---- 2. Refresh globals (v_forward / v_right / v_up) from the player's
  //         view angles. Disassembly: *(*(ebp+0x40)) + 0x74 is the source
  //         Vector passed to UTIL_MakeVectors. The double indirection
  //         (ebp+0x40 → pev → entvars → +0x74) is hidden behind .pev.Angles;
  //         TODO(layout): confirm the two-hop walk resolves to pev->angles
  //         in this build's CTSStunt / entvars_t layout.
  UTIL_MakeVectors(self.pev.Angles);

  // ---- 3. Build the probe. The disassembly reads
  //         K = DWORD PTR [ebx-0x6f068]              // 4-byte float, ~1.0
  //         V = *(*(GOT+0x1600)) + 0x28 // 3-float vector in  //                                                   //   some singleton
  //                                                   //   (almost certainly
  //                                                   //   gpGlobals->v_forward
  //                                                   //   set by step 2)
  //         probe = K * V
  // TODO(asm-ambiguous): confirm the GOT+0x1600 singleton is gpGlobals
  // and +0x28 is v_forward in this build. The TS previously misnamed this
  // as the player's velocity — it isn't.
  const K: number = 1.0;
  const forwardVec: Vector = undefined as any; // gpGlobals->v_forward (after MakeVectors)
  const probe: Vector = {
    x: K * forwardVec.x,
    y: K * forwardVec.y,
    z: K * forwardVec.z,
  };

  // ---- 4. Trace from origin to origin+probe. The end Vector lives at
  //         [esp+0x20]; the start is *(*(ebp+0x40)) + 0x8 (pev->origin).
  //         ignore target is *(*(ebp+0x40)) + 0x208 (probably the player's
  //         containing edict or its private-data ptr — TODO(layout)).
  const origin: Vector = self.pev.Origin;
  const end: Vector = {
    x: origin.x + probe.x,
    y: origin.y + probe.y,
    z: origin.z + probe.z,
  };
  const tr: TraceResult = {} as TraceResult;
  UTIL_TraceLine(origin, end, /* IGNORE_MONSTERS */ 1, self.edict, tr);

  // ---- 5. No hit ⇒ no wall ⇒ fail.
  // Disassembly: fcomp 1.0; jae fail (i.e. fraction >= 1.0).
  if (tr.fraction >= 1.0) return false;

  // ---- 6. Wall height band. Disassembly:
  //         fcom  LOWER (no pop); sahf; jae skip (X >= LOWER ⇒ skip)
  //         fcomp UPPER (pop);    test ah,0x41; jne skip (X <= UPPER ⇒ skip)
  //         Net: cl=1 iff LOWER > X > UPPER.
  //         TODO(values): LOWER / UPPER cvars (QWORD = double).
  const LOWER = 0;
  const UPPER = 0;
  const wallHeightOk = tr.vecEndPos.y > UPPER && tr.vecEndPos.y < LOWER;

  // ---- 7. Vertical state. Disassembly:
  //         fld   *(*(ebp+0x40) + 0x20 + 0x8)   // pev->velocity.z
  //         fcomp DWORD PTR [ebx-0x6c32c]      // threshold (float)
  //         fnstsw ax
  //         test  ah,0x41                       // tests C0 (ah.0) and C3 (ah.6)
  //         jne   skip                         // jumps when NOT (X > Y)
  //         mov   dl,0x1                       // dl=1 iff X > Y (strict gt)
  //         The earlier "jne = jump if not equal" interpretation was wrong.
  //         TODO(values): VERT_THRESHOLD cvar (DWORD = float).
  const VERT_THRESHOLD = 0;
  const verticalOk = self.pev.velocity.z > VERT_THRESHOLD;

  return wallHeightOk && verticalOk;
}
