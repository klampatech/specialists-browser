/**
 * CTSFlag::Precache — Preloads the flag entity's model asset via the
 * GoldSrc engine's `pfnPrecacheModel` hook.
 *
 * Disassembly (thin PIC-wrapped indirect call):
 *   • `call $+5; pop ebx; add ebx, 0xd8273`   → GOT base = 0x165e10
 *   • `mov edx, [ebx + 0x1aa8]`              → g_engfuncs.pfnPrecacheModel
 *   • `lea eax, [ebx - 0x6c1cf]`             → string @ 0x0f9c41
 *   • `push eax; call [edx]; add esp, 0x18`
 *
 * No `this` fields are touched — purely an engine preload side
 * effect. Stack is reserved (`sub esp, 0x8`) but the `this` pointer
 * is never read, consistent with this method's role.
 */
export function Precache(this: CTSFlag): void {
  // TODO(D.4 — string recovery): the model-path literal lives at
  //   rodata 0x0f9c41. Pull the exact bytes from
  //   tools/decompile/analysis/strings-n5.txt and replace the
  //   placeholder below. Keep the address in the comment so the PIC
  //   mapping is preserved for future audits.
  const FLAG_MODEL_PATH /* @ 0x0f9c41 */ = "models/ts/flag"; // placeholder

  // g_engfuncs is the C-side enginefuncs_t global; field index
  // 0x1aa8 from the GOT resolves to pfnPrecacheModel. `as any`
  // until the full enginefuncs_t layout is wired up in D.5.
  (g_engfuncs as any).pfnPrecacheModel(FLAG_MODEL_PATH);
}
