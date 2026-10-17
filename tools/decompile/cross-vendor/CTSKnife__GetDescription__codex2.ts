/**
 * CTSKnife::GetDescription — returns a static description string for
 * this knife variant, selected by a dword discriminator at
 * `this + 0xa0`.
 *
 * The original C++ returns `const char*` into `.rodata`. Here we
 * model it as `string` with placeholder text per case; the
 * GOT-relative offsets that locate each rodata string in
 * `ts_i386.so` are documented alongside each branch. The actual
 * string contents will be lifted off the binary in a later pass.
 *
 * Demangled: `CTSKnife::GetDescription()`
 * Address:   0x0006db04 (80 B)
 */
export interface CTSKnife {
  // Stub — full layout re-derived in D.4.
  // Discriminator at offset 0xa0 (see disassembly).
  m_iMode?: number;
}

export function GetDescription(this: CTSKnife): string {
  // The PIC prologue (`call $+5; pop ebx; add ebx, 0xf8306`) computes
  // the GOT base into ebx; all `[ebx ± k]` accesses below resolve
  // .rodata strings relative to that base.
  //
  // `[esp+0x8]` (after the `push ebx`) is the implicit C++ `this`.
  // `[this+0xa0]` is the discriminator, compared as dword.
  //
  // TODO(asm-ambiguous): the discriminator's semantic name
  // (`m_iMode` here) is inferred from the switch-on-dword pattern.
  // Confirm against the full CTSKnife class layout in D.4.
  const knifeMode = (this as any).m_iMode as number;

  switch (knifeMode) {
    case 6:
      // rodata string at (GOT base - 0x6e01d)
      return "knife_variant_6_description";
    case 7:
      // rodata string at (GOT base - 0x6e007)
      return "knife_variant_7_description";
    case 8:
      // rodata string at (GOT base - 0x6e02d)
      return "knife_variant_8_description";
    default:
      // rodata string at (GOT base - 0x6f7b9) — content TBD in D.4.
      return "";
  }
}
