// CTSPowerUp::Restore — save/restore pair for the CTSPowerUp entity.
// Decompiled from ts_i386.so @ 0x00087e6c (80 bytes).
// Faithful to the asm; stubs the cross-module dependencies so the
// file compiles in isolation.

type CRestore = any;       // GoldSrc engine type — not yet defined in D.3.
type CTSPowerUp = any;     // Stub: real definition lives in D.4.
type TYPEDESCRIPTION = any;

// PIC/GOT-resolved globals. In the binary these live at fixed offsets
// from the GOT base (ebx). Stubbed here so this file compiles standalone.
declare const GOT_CTSPowerUp_TYPEDESCRIPTION: TYPEDESCRIPTION;

// Base-class restore (CBaseAnimating::Restore). In C++ this is
// `int CBaseAnimating::Restore(CRestore&)`, called as
// `Restore(this, &restore)` on i386. Stubbed here.
export function CBaseAnimating_Restore(this: any, restore: any): number {
  return 0; // placeholder; real body lives in the CBaseAnimating module.
}

/**
 * CTSPowerUp::Restore — restores the CTSPowerUp entity's state from a
 * save buffer. First delegates to the base CBaseAnimating::Restore;
 * on success, reads back the CTSPowerUp-specific typed fields via
 * CRestore::ReadFields.
 *
 * @param this     The CTSPowerUp entity instance (implicit `this` in C++)
 * @param restore  The CRestore helper providing the save/restore buffer
 * @returns        0 if the base Restore failed; otherwise ReadFields's
 *                 return value (propagated unchanged through epilogue)
 */
export function Restore(this: any, restore: any): number {
  // Asm 0x87e83..0x87e99: sub esp,0x8; push edi; push esi; call
  //   CBaseAnimating::Restore@plt; add esp,0x10; test eax,eax;
  //   jne success; mov eax,0x0; jmp epilogue.
  if (CBaseAnimating_Restore(this, restore) === 0) {
    return 0;
  }

  // Asm 0x87e9c..0x87eb5: sub esp,0xc; push 0x2; push [ebx+0x16fc];
  //   push esi; lea+push [ebx-0x6c66c] ("CTSPowerUp"); push edi;
  //   call CRestore::ReadFields@plt; add esp,0x20.
  // Argument order on stack (right-to-left) lines up with the demangled
  // signature: int ReadFields(CRestore*, const char*, void*,
  //                          TYPEDESCRIPTION*, int).
  // Eax (ReadFields's return value) flows unchanged into the common
  // epilogue at 0x87eb8..0x87ebb.
  return restore.ReadFields(
    "CTSPowerUp",                  // pClassName  (GOT-relative string)
    this,                          // pv          (entity instance)
    GOT_CTSPowerUp_TYPEDESCRIPTION,// pTypeDesc   (GOT-relative TYPEDESC*)
    2,                             // field count (matches asm push 0x2)
  );
}
