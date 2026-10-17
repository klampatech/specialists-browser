```
VERDICT: FAIL

Checklist:
1. Signature — ✅ — `Spawn(this: CTSSniperAmmo): void` correctly
   captures `CTSSniperAmmo::Spawn()` (no explicit args, void return,
   `this` implicit). Function name matches the demangled symbol.

2. Version check pattern — ✅ N/A — this isn't a version-check   function. Analogous check (correct parent-class dispatch) passes:
   `CTSGroundAmmo.Spawn(this)` matches `call Spawn__13CTSGroundAmmo@plt`
   with `this` as the pushed arg.

3. interfaceVersion assignment-back — ✅ N/A — no failure path; not
   applicable to a Spawn override.

4. Success path — ✅ — all three disassembly operations are present:
      - parent Spawn(this)               (b94c0–b94c1)
      - get_ammo_info(8)[+0xc] / 2 → +0x88  (b94c6–b94de)
      - get_ammo_info(0xd)[+0xc] / 2 → +0x9c (b94e4–b94fc)
   The shr/add/sar sequence at b94d5–b94dc is MSVC's
   signed-divide-by-2 round-toward-zero idiom; `Math.trunc(x / 2)`
   is exactly equivalent for integer `x`. The TS comment notes this   correctly.

5. No fabricated paths — ✅ — straight-line code, no invented
   branches or extra operations.

6. No TODO body — ✅ — body is real code. The two `// TODO` notes
   are clarifying comments about field-name guesses, not placeholder
   bodies.

7. Field names — ⚠️ — three names are invented, not present in the
   disassembly or in any HLSDK reference:
      - `primary.maxCarry`, `secondary.maxCarry`  ← +0xc of ammo_info_t
      - `this.primaryGive`, `this.secondaryGive`  ←  +0x88, +0x9c of CTSSniperAmmo
   The original TS mixes this concern: the code uses the names, but
   the TODOs admit the offsets haven't been verified. That's
   acceptable as long as the names are explicitly TODO and aren't
   silently relied on elsewhere. (The disassembly only gives offsets.)

8. Compiles in isolation — ❌ — the function references three symbols
   it does not define:
      - `CTSSniperAmmo` (used as the `this` type)
      - `CTSGroundAmmo` (and its `.Spawn` method)
      - `get_ammo_info` (and its `{ maxCarry }` return shape)
   It then writes to `this.primaryGive` / `this.secondaryGive`,
   which are also undeclared on `CTSSniperAmmo`. The conversion
   guidance explicitly requires the function to compile standalone
   ("no external type references we don't define here; use `any`
   for unknowns"). As written, this file is a TypeScript error.

Issues to fix:
- **Item 8 (hard fail):** add `any`/stub declarations for
  `CTSSniperAmmo`, `CTSGroundAmmo`, and `get_ammo_info` so the
  function compiles. Then either (a) keep the named-field style
  and stub the fields too, or (b) drop the names and bracket-index
  by offset (`this["0x88"]`, `get_ammo_info(8)["0xc"]`) to stay
  faithful to the disassembly.
- **Item 7 (soft):** the guessed names are plausible — `maxCarry`
  for ammo-info and a give-count pair at +0x88/+0x9c — but D.4 is
  where they get verified. Until then, treat them as TODO. A
  `-Werror`-clean rewrite either uses `any` + offsets or stubs the
  names; do not mix the two.

Suggested rewrite (full TS function — compile-clean, name-as-TODO):

```typescript
/**
 * CTSSniperAmmo::Spawn — Spawns a sniper-rifle ammo pickup entity.
 *
 * Forwards to CTSGroundAmmo::Spawn() to set up the standard
 * ground-ammo properties (model, sounds, pickup bounds), then
 * sets two per-pickup give amounts by halving the cached
 * ammo-info struct's field at +0xc:
 *
 *     ammo id 0x8  →  this[ +0x88 ]   (primary   sniper ammo give)
 *     ammo id 0xd  →  this[ +0x9c ]   (secondary sniper ammo give)
 *
 * The shr/add/sar sequence at 0xb94d5–0xb94dc is the MSVC
 * "signed divide by 2, round-toward-zero" idiom; Math.trunc(x / 2)
 * is exactly equivalent for integer x. The ammo-id ↦ offset
 * bindings above are placeholders — D.4 (TS-specific gameplay)
 * will verify the field names against the actual class layout in
 * `tools/decompile/headers/`.
 *
 * @param this  The CTSSniperAmmo entity instance
 * @returns     void
 */

// ---- Stubs so this file compiles in isolation ----------------------
// Real definitions land in D.4 from `tools/decompile/headers/`.
type CTSSniperAmmo = any;
declare const CTSGroundAmmo: { Spawn(self: any): void };
declare function get_ammo_info(ammoId: number): { readonly maxCarry: number };

export function Spawn(this: CTSSniperAmmo): void {
  // Parent class Spawn — sets model, sounds, pickup bounds.
  CTSGroundAmmo.Spawn(this);

  // Primary sniper ammo (id 0x8): give half the cached max carry.
  // TODO(asm-ambiguous): confirm +0xc in ammo_info_t is the
  // max-carry field, and +0x88 in CTSSniperAmmo is the primary-ammo
  // give count (vs. some other related field).
  this.primaryGive = Math.trunc(get_ammo_info(8).maxCarry / 2);

  // Secondary sniper ammo (id 0xd): give half the cached max carry.
  // TODO(asm-ambiguous): confirm +0x9c in CTSSniperAmmo is the
  // secondary-ammo give count (vs. some other related field).
  this.secondaryGive = Math.trunc(get_ammo_info(0xd).maxCarry / 2);
}
```

If you'd rather stay maximally faithful to the disassembly (no
guessed names at all), replace the body with:

```typescript
export function Spawn(this: any): void {
  CTSGroundAmmo.Spawn(this);
  (this)["0x88"] = Math.trunc(get_ammo_info(8)["0xc"] / 2);
  (this)["0x9c"] = Math.trunc(get_ammo_info(0xd)["0xc"] / 2);
}
```

and adjust the stub for `get_ammo_info` to
`{ readonly [k: string]: number }`. Either form passes the
checklist; the named-fields form is more readable, the offsets-only
form is more obviously tied to the disassembly.
