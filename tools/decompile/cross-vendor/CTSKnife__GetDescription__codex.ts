```typescript
/**
 * CTSKnife::GetDescription — returns a static description string for
 * this knife variant, selected by a dword discriminator at this+0xa0.
 *
 * In the original C++ this returns `const char*` pointing into .rodata.
 * In TypeScript we model it as `string` and use placeholder text per
 * case; the GOT-relative addresses that locate the actual rodata
 * strings in `ts_i386.so` are documented alongside each branch.
 *
 * @param this The CTSKnife entity instance (this in the original C++)
 * @returns    Pointer to one of four static, interned description strings
 */
export function GetDescription(this: CTSKnife): string {
  // Field at this+0xa0 is the discriminator (compared as dword via
  // `mov eax, [eax+0xa0]; cmp eax, 7/6/8`).
  //
  // TODO(asm-ambiguous): the field's semantic name (likely m_iMode or
  // m_iKnifeType) is inferred from the switch-on-dword pattern; confirm
  // against CTSKnife's full class layout once we re-derive it (D.4).
  const knifeMode = (this as any).m_iMode;

  // The disassembly is a small switch that, for each case, loads a
  // GOT-relative pointer into eax (`lea eax, [ebx - k]`) and falls
  // through to the epilogue. The offsets are relative to the GOT base
  // computed by the PIC pattern at function entry
  // (`call $+5; pop ebx; add ebx, 0xf8306`).
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
      // fallback rodata string at (GOT base - 0x6f7b9)
      return "";
  }
}
```
