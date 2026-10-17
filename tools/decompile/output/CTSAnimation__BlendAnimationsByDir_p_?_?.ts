// TODO: external types CBasePlayer, Vector, GetDirection, and SetAnim are
//   provided by the broader project; treat them as opaque here until the
//   full class shell (D.4) lands.
//
//   The demangler emitted `p ?, ?` for this method, so the explicit arg
//   list and their types are not confirmed by the C symbol. The
//   disassembly reads 8 stack slots (this + 7 args), which is the
//   ground truth for arg count. The exact C++ field name for
//   `this + 0x14` is unknown — we call it `m_lastDir` based on usage
//   (compared to the direction index returned by GetDirection).
export function BlendAnimationsByDir(
  this: CTSAnimation,
  player: CBasePlayer,
  vec1: Vector,
  vec2: Vector,
  animTable: string[],
  f1: number,
  f2: number,
  suffix: string,
): void {
  // Sentinel short-circuit at 0x5d552–0x5d56f: compare the first byte
  // of the suffix (esi = [esp+0x9c]) against a GOT-relative sentinel
  // ([GOT - 0x6f7b9]); if they match, return. The disassembly doesn't
  // tell us the sentinel's value. The most likely case is the sentinel
  // is a single NUL byte, making this an empty-suffix short-circuit,
  // but that is UNCONFIRMED — strings-n5.txt would settle it.
  // TODO(asm-ambiguous): confirm the sentinel byte via strings-n5.txt.
  if (suffix.length === 0) {
    return;
  }

  // GetDirection maps (vec1, vec2, f1, f2) to a small non-negative
  // direction index. The disassembly copies vec1 and vec2 onto the
  // stack (3 floats each) before the call; the TS passes by reference.
  const dir: number = GetDirection(vec1, vec2, f1, f2);

  // Short-circuit: if the direction hasn't changed since the last call
  // we already have the correct animation set, no need to reapply.
  if (dir === this.m_lastDir) {
    return;
  }

  // Build the full animation name from the direction-indexed base name
  // (a fixed 15-char entry in the animTable, stride 16) and the
  // per-frame suffix. The C++ type is `PA15_c` = pointer to char[15],
  // modelled in TS as `string[]`.
  const baseName: string = animTable[dir];
  const animName: string = baseName + suffix;

  // Apply the animation. The disassembly calls SetAnim with 4 explicit
  // args (0x194, animName, and two saved-register values that the
  // compiler stashed into edi/ebp at the call site for player and a
  // numeric arg); `this` is implicit. The literal `0x194` (404) is
  // likely a sequence/frame index, the meaning of the 4th int depends
  // on the SetAnim override in this engine version.
  // TODO(asm-ambiguous): the 5th arg (if any) and the exact meaning of
  //   0x194 depend on the SetAnim implementation; verify against the
  //   D.4 SetAnim disassembly before relying on this call.
  SetAnim(this, player, animName, 0x194);

  // Remember the direction we just set so the next call can short-circuit.
  this.m_lastDir = dir;
}
