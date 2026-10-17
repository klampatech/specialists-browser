// D.3 isolation stubs — replaced in D.4 (class skeleton) and D.5
// (engine wiring). `any` per the D.3 review checklist rule for
// unknown external types.
type CBaseEntity = any;
interface CTSWorldGun { /* forward decl — populated in D.4 */ }

// HL engine STRING() macro: (char*)(gpGlobals->pStringBase) + (int)(offset).
// D.3 stub; replaced by the real impl in D.5 once gpGlobals is wired up.
declare function STRING(offset: any): string;

/**
 * CTSWorldGun::ShouldCollide — collision filter for a static world-decorated
 * weapon pickup. Returns 0 (skip collision) when `pOther`'s classname matches
 * either of two hardcoded "ignore" classnames; returns 1 (collide normally)
 * otherwise.
 *
 * @param this    The CTSWorldGun (static world-decorated weapon pickup)
 * @param pOther  The candidate other entity
 * @returns       0 = do not collide, 1 = collide normally
 */
export function ShouldCollide(
  this: CTSWorldGun,
  pOther: CBaseEntity,
): number {
  // Disassembly: edi = (*(*GOT[0x1600])[0x98]) + pOther->pev->classname
  //                          ^gpGlobals    ^gpGlobals->pStringBase
  //                                       ^STRING(classname_offset)
  // `pev` is the first field of CBaseEntity (offset 0); `classname` is
  // the first field of entvars_t (offset 0). The two-level deref
  // `[ebp+0]; [eax]` corresponds to `pOther.pev.classname`.
  const otherClassname: string = STRING(pOther.pev.classname);

  // TODO(asm-ambiguous): resolve the two hardcoded classnames from the
  // disassembly's GOT-relative `.rodata` addresses (ebx-0x6b6c5 for 9
  // bytes, ebx-0x6e62b for 6 bytes) against
  // tools/decompile/analysis/strings-n5.txt. PIC setup is intentionally
  // elided here — these constants get hoisted to module scope in D.4.
  const IGNORE_LONG  = "" as string; // 9-byte classname (e.g. "func_wall")
  const IGNORE_SHORT = "" as string; // 6-byte classname (e.g. "player")

  // First repz cmpsb (9 bytes): `cmp dl,al; jne …; mov eax,0; jmp exit`.
  // Match → return 0. On mismatch, fall through to the second compare.
  if (otherClassname === IGNORE_LONG) {
    return 0;
  }

  // Second repz cmpsb (6 bytes): `seta cl; setb dl; mov eax,0;
  // cmp cl,dl; setne al`. Same semantics — match returns 0, mismatch
  // falls through to return 1. (The setne(1) case is logically
  // unreachable here because returning on match mirrors the original
  // mov-eax,0 overwrite.)
  if (otherClassname === IGNORE_SHORT) {
    return 0;
  }

  return 1;
}
