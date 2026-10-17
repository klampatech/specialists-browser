// Stub types — replaced by D.4 class shells.
type CBasePlayer = any;
type Vector = any;
declare const CTSAnimation: any;
declare function GetDirection(
  v1: Vector, v2: Vector, f1: number, f2: number,
): number;
declare function SetAnim(
  self: any, player: CBasePlayer, name: string,
  sequence: number, body: number,
): void;

// Offset of "last applied direction index" inside CTSAnimation.
// Verified: cmp [eax+0x14], edi where eax = [esp+0x80] = this.
const CTSANIM_FIELD_LAST_DIR = 0x14;

// Sentinel byte at [GOT - 0x6f7b9] — almost certainly NUL.
// TODO(asm-ambiguous): confirm via `strings-n5.txt` / hexdump.
const SUFFIX_SENTINEL = 0x00;

/**
 * CTSAnimation::BlendAnimationsByDir
 *
 * Picks an animation base-name by direction index and tacks a
 * per-frame suffix onto it, then calls SetAnim. Both bail-outs
 * (empty suffix, unchanged direction) are in the original asm.
 *
 * Layout notes:
 *   - animTable is a packed array of fixed 16-byte C-strings
 *     (`char (*)[16]`), indexed via byte offset dir*16.
 *   - vec1/vec2 are read into stack copies before GetDirection,
 *     so they behave by-value even if declared as references.
 *
 * @param this       CTSAnimation* (this in C++)
 * @param player     forwarded to SetAnim
 * @param vec1       first direction vector
 * @param vec2       second direction vector
 * @param animTable  base-name table (16-byte C-string entries)
 * @param f1         first float threshold
 * @param f2         second float threshold
 * @param suffix     per-frame suffix to append
 */
export function BlendAnimationsByDir(
  this: any,
  player: CBasePlayer,
  vec1: Vector,
  vec2: Vector,
  animTable: readonly string[],
  f1: number,
  f2: number,
  suffix: string,
): void {
  // asm: repz cmpsb count=1 suffix[0] vs [GOT - 0x6f7b9].
  if (suffix.charCodeAt(0) === SUFFIX_SENTINEL) {
    return;
  }

  // asm: GetDirection(vec1, vec2, f1, f2)  →  small int in eax.
  const dir: number = GetDirection(vec1, vec2, f1, f2);

  // asm: cmp dir, [this+0x14]; je epilogue.
  // The dword at this+0x14 caches the last applied direction.
  if (dir === this[CTSANIM_FIELD_LAST_DIR / 4]) {
    return;
  }

  // asm: strcpy(buf, animTable[dir*16]); strcat(buf, suffix).
  // For null-terminated C-strings, + concatenation is equivalent.
  const animName: string = animTable[dir] + suffix;

  // asm: SetAnim(this, player, animName, 0x194, 0).
  // Trailing args are a sequence index and a body/flag; until the
  // SetAnim signature is typed (D.4), keep them as named literals.
  const SEQUENCE = 0x194;
  const BODY = 0;
  SetAnim(this, player, animName, SEQUENCE, BODY);

  this[CTSANIM_FIELD_LAST_DIR / 4] = dir;
}
