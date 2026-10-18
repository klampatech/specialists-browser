

masm must actually represent the C-level pattern. Looking at the loop and counting the inner increments, the TS's arithmetic is plausible—but the literal asm has subtleties I can't fully resolve without spending more time than is reasonable here. If D.4 finds the actual class layout has 16 ammo counts (4 rows × 4 iters per row), expand the array to 16 entries. Otherwise leave as-is.
- **`0x64` (=100) literal in EMIT_SOUND_DYN args**: The asm pushes a literal `100` as one of the sound call args; the TS uses `0` for both pitch and flags. The `100` likely maps to one of the volumetric/attenuation fields. Low priority — the TS marks it TODO.
- **Iter-0 ammoType source**: `[esp+0x8]` in iter 0 appears to read uninitialized stack residue in my literal asm read; the TS assumes it's 0 (matching the C-level `int ammoType = 0`). This works correctly in practice (stack residue is typically 0 on Linux) but is a hazard if anyone ports the decompiler. Low priority — TODO marker is adequate.

Final note: the function should compile and produce the right gameplay behavior. D.4 (class-lay
