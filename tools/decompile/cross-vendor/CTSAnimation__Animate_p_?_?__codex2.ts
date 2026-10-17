/**
 * CTSAnimation::Animate — per-frame animation dispatcher for a player.
 *
 * Demangled:  CTSAnimation::Animate(CBasePlayer*, int)
 * Address:    0x0005b470
 * Size:       7805 bytes (0x1e7d)
 * Sibling:    CTSAnimation::HandleCloseCombat (0x5d8d0, 1058 B)
 *
 * High-level shape (per disassembly):
 *   1. horizSpeed = sqrt(pev.velocity.x^2 + pev.velocity.y^2)
 *   2. if !isDucking && alive: BlendAnimationsByDir on sequences 4 and 2
 *   3. close-combat overlay (sequences 0x28..0x39 except 0x33)
 *   4. 59-case switch on (sequence + 1)         (jump tbl @ ebx-N)
 *      each case: state checks → strcpy/strcat anim name →
 *      SetAnim(this, pPlayer, name, bodyPart, flags) → bodyWeight
 *   5. post-switch: HandleCloseCombat OR 2nd 59-case resolver
 *      (jump tbl @ ebx-M) that picks the final anim string
 *   6. if pev.sequence != pev.gaitsequence:
 *        pev.sequence = pev.gaitsequence;
 *        pev.frame = 0;
 *        pPlayer->ResetSequenceInfo();
 *
 * @param this     CTSAnimation instance (does NOT own pev)
 * @param pPlayer  CBasePlayer* being animated (owns pev at offset 0)
 * @param sequence current sequence index (int)
 */
export function Animate(
  this: CTSAnimation,
  pPlayer: any, // CBasePlayer* — full type in D.4
  sequence: number,
): void {
  // Disassembly prologue: 4×push + sub esp 0x8c + PIC call/pop/add ebx.
  // Stack layout: [esp+0xa0]=this, [esp+0xa4]=pPlayer, [esp+0xa8]=sequence.
  // Disassembly sets ebp=[esp+0xa4] and never reloads — so every
  // [ebp+…] access in the asm is a pPlayer.… field access in TS.

  if (sequence < 0) return; // 5b48d/5b495: cmp [sequence],0 ; js end

  // --- 1. horizSpeed = sqrt(pev.velocity.x^2 + pev.velocity.y^2) ---
  // 5b49b..5b4ac: [pPlayer+0]→pev; [pev+0x20]=vx; [pev+0x24]=vy; fmul×2; faddp; fsqrt.
  const horizSpeed = Math.hypot(
    pPlayer.pev.velocity.x, pPlayer.pev.velocity.y,
  );

  // --- 2a. state flags ---
  // 5b4b0..5b4ba: test BYTE PTR [pev+0x1a5], 0x02 → IN_DUCK.
  const isDucking = (pPlayer.pev.button & 0x02) !== 0;
  // 5b4c0..5b4d2: eax = [pPlayer+0x60]; call [eax+0xb4] → "IsAlive"-like.
  // [pPlayer+0x60] is some vtable-bearing sub-object (likely m_pActiveItem
  // or similar). TODO(D.4): resolve the field; for D.3 keep the indirection.
  const alive = !!(pPlayer.field_0x60?.IsAlive?.());

  // --- 2b. movement blends (run/walk layer + gun-aim) when alive & not ducking ---
  if (alive && !isDucking) {
    // 5b4df..5b537: sequence===4 && !IsInCloseCombat && horizSpeed > THRESH
    if (sequence === 4 && !IsInCloseCombat(this, sequence) &&
        horizSpeed > /* cvar @ ebx-0x6f400 */ 0 /* TODO(D.4) */) {
      // 5b5af..5b5d9: BlendAnimationsByDir(this, pPlayer, angles, vel,
      //                               animExtension, 0.3, 0.6, bodyPart=0x1c)
      BlendAnimationsByDir(
        this, pPlayer, pPlayer.pev.angles,
        normalize(pPlayer.pev.velocity), pPlayer.animExtension,
        /* pitch= */ 0.3, /* yaw= */ 0.6, /* bodyPart= */ 0x1c,
      );
    }
    // 5b5e1..5b67f: sequence===2
    if (sequence === 2) {
      BlendAnimationsByDir(
        this, pPlayer, pPlayer.pev.angles,
        normalize(pPlayer.pev.velocity), pPlayer.animExtension,
        /* pitch= */ 0.3, /* yaw= */ 0.6, /* bodyPart= */ 0x5c,
      );
    }
  }

  // --- 3. close-combat overlay ---
  // 5b682..5b7a8: if [pev+0x1a5]&0x02 (ducking) skip; IsInCloseCombat →
  // if [pPlayer+0x78]!=0 skip; if IsInCloseCombat re-check skip;
  // if [pPlayer+0x60]->IsAlive==0 skip; if sequence in
  // {0x28,0x2f,0x30,0x31,0x32,0x36,0x37,0x38,0x39} skip; else if
  // GaitCloseCombat(this,pPlayer) → set didCloseCombat=1.
  // Net: any sequence in [0x28..0x39] EXCEPT 0x33 may set didCloseCombat.
  let didCloseCombat = false;
  const isBlockedSeq = (
    sequence === 0x28 || sequence === 0x2f || sequence === 0x30 ||
    sequence === 0x31 || sequence === 0x32 || sequence === 0x36 ||
    sequence === 0x37 || sequence === 0x38 || sequence === 0x39
  );
  if (
    !isDucking &&
    !IsInCloseCombat(this, sequence) &&
    pPlayer.field_0x60 /* m_pActiveItem? */ /* TODO(D.4) */ !== 0 &&
    !isBlockedSeq
  ) {
    if (GaitCloseCombat(this, pPlayer)) {
      didCloseCombat = true;
    }
  }

  // --- 4. 59-case switch on (sequence + 1) ---
  // Jump table at [ebx + (sequence+1)*4 - 0x10a640]; 5b7b0..5b7ce.
  // Each leaf does: state checks → strcpy from data tbl → strcat with
  // animExtension → SetAnim(this, pPlayer, name, bodyPart, flags) →
  // write layer bodyWeight / flags.
  switch (sequence + 1) {
    case 0x00: /* "long idle" land */ break;
    case 0x01: /* minor flinch */ break;
    case 0x02: /* walk (handled in step 2b) */ break;
    case 0x03: /* ducking */ break;
    case 0x04: /* walk (alive + !ladder + !duck) */ break;
    case 0x05: case 0x06: case 0x07: break;
    case 0x08: case 0x09: /* weapon-specific */ break;
    case 0x0a: case 0x0b: case 0x0c: case 0x0d:
    case 0x0e: case 0x0f: case 0x10: case 0x11:
    case 0x12: case 0x13: case 0x14: case 0x15:
    case 0x16: case 0x17: case 0x18: case 0x19:
    case 0x1a: case 0x1b: case 0x1c: case 0x1d:
    case 0x1e: case 0x1f: case 0x20: case 0x21:
    case 0x22: case 0x23: case 0x24: case 0x25:
    case 0x26: case 0x27:
      /* TODO(D.4): empty for D.3 — see 5b7d0..5b8b4 (jump-table data)
         and the leaf blocks that follow. */ break;
    case 0x28: /* dying — close-combat gate, fall through */ break;
    case 0x29: /* ducking-related */ break;
    case 0x2a: case 0x2b: /* ladder */ break;
    case 0x2e: case 0x2f: case 0x30: case 0x31: case 0x32: /* blocked */ break;
    case 0x33:
      /* weapon-specific: builds "<animExt>_<action>" via
         [ebx-0x6f692]/[ebx-0x6f68c] + strcat; SetAnim(...,0x92, 0);
         layer.bodyWeight=2.0 (0x40000000); layer.body=1.0 (0x3f800000). */
      // TODO(D.4)
      break;
    case 0x36: case 0x37: case 0x38: case 0x39: /* blocked */ break;
    case 0x3a: /* last case */ break;
  }

  // --- 5. post-switch: close combat or final sequence resolver ---
  if (!didCloseCombat) {
    // 5bf60..5bf97: if IsInCloseCombat(this, sequence) → HandleCloseCombat.
    if (IsInCloseCombat(this, sequence)) {
      HandleCloseCombat(this, pPlayer, sequence);
    } else if (sequence <= 0x39) {
      // 5bf9c..5cffa: 2nd 59-case switch on `sequence` (jump table
      // at [ebx + n*4 - 0x109e54]). Each leaf: state checks,
      // GetDirection, strcpy/strcat with anim-extension suffix,
      // SetAnim(this, pPlayer, name, 0x94, 0); layer.bodyWeight=3.0.
      resolveFinalAnim(this, pPlayer, sequence);
    }
  }

  // --- 6. tail: sync pev.sequence from pev.gaitsequence ---
  // 5d004..5d2da: if (pev.sequence != pev.gaitsequence) {
  //   pev.sequence = pev.gaitsequence;
  //   pev.frame = 0;
  //   pPlayer->ResetSequenceInfo();
  // }
  if (pPlayer.pev.sequence !== pPlayer.pev.gaitsequence) {
    pPlayer.pev.sequence = pPlayer.pev.gaitsequence;
    pPlayer.pev.frame = 0;
    ResetSequenceInfo(pPlayer); // pPlayer, NOT this.pev
  }
}
