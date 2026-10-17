```
VERDICT: PASS-WITH-NOTES

This is a faithful decompilation of `CTSGroundAmmo::OnGround()` against the
disassembly. The control-flow shape (straight-line, no branches), all four
`pev` field writes (spawnflags/flags/effects), the two engine utility calls,
and the four trailing class-field writes line up 1:1 with the asm. The
remaining issues are naming gaps and isolation, not logical errors.

Checklist:
1. Signature — ✅ — `OnGround(this: CTSGroundAmmo): void` matches the
   demangled `CTSGroundAmmo::OnGround()` (no explicit args, returns void).
   `this` is loaded from `[esp+0x30]` after `push esi; push ebx;
   sub esp, 0x24`, which is consistent with `thiscall`-emitted-as-cdecl
   (Kyle has confirmed this convention for TS).
2. Version check — N/A — `OnGround` is not one of the 4 API functions;
   no version-check pattern applies. Noted for completeness only.
3. interfaceVersion assignment — N/A — same reason.
4. Success path / data flow — ✅ — All asm writes are preserved:
   `pev->spawnflags = 5` → `[eax+0x108] = 5`;
   `pev->flags = 1` (FL_ONGROUND) → `[eax+0x10c] = 1`;
   `pev->effects &= ~0x80` then `|= 0x2` → `(pev->effects & ~0x80) | 0x2`;
   `UTIL_SetOrigin(pev, pev->origin)` → `push &pev->origin; push pev; call`;
   `UTIL_SetSize(pev, minsVec, maxsVec)` → two Vectors built on the stack
     from GOT constants, then push ecx/edx/pev per cdecl.
   Four trailing class-field writes (`[esi+0x14] =0xffff0000`,
   `[esi+0x18] = GOT+0x20c4`, `[esi+0xc] = 0`, `[esi+0x10] = 0`) all match.
5. No fabricated paths — ✅ — The asm has zero branches; the TS is also
   straight-line in the same order. Nothing invented.
6. No TODO body — ✅ — The body is fully expressed in code; the TODOs are
   inline annotations on specific asm-ambiguous details (effect bit names,
   GOT-constant identities, class-field names). Acceptable per the prompt.
7. Field names — ⚠️ — `pev.spawnflags` / `pev.flags` / `pev.effects` /
   `pev.origin` are correct entvars_t fields. The bit operations
   (`&= ~0x80`, `|= 0x2`) are consistent with `EF_NODRAW = 128` and
   `EF_DIMLIGHT = 2` in HL1 — the TODO acknowledges this needs cross-check.
   However, four class-field names (`field_0x0c`, `field_0x10`, `field_0x14`,
   `field_0x18`) and three GOT-derived names (`CUBE_MINS`, `CUBE_MAXS`,
   `AMMO_GROUND_STATE_GLOBAL`) are placeholders. They are TODO-justified,
   so technically pass, but they should be resolved before the function is
   committed.
8. Compiles in isolation — ❌ — Strictly speaking, no: `CTSGroundAmmo`,
   `UTIL_SetOrigin`, `UTIL_SetSize`, `CUBE_MINS`, `CUBE_MAXS`,
   `AMMO_GROUND_STATE_GLOBAL` are referenced but not declared. Per the
   "use `any` for unknowns" rule, the snippet needs ambient declarations
   (or `this: any` + casts) to compile standalone.

Issues to fix:
- **Pin which GOT slot is mins vs maxs.** The asm pushes `ecx` (Region A
  written from `GOT-0x6b68c`) last, making it arg3 = `vecMax`, and `edx`
  (Region B written from `GOT-0x6b688`) second, making it arg2 = `vecMin`.
  So `GOT-0x6b68c` = maxs and `GOT-0x6b688` = mins. The TS hides this
  behind `CUBE_MINS` / `CUBE_MAXS` placeholders without saying which GOT
  slot each maps to. Either annotate the constants (e.g.
  `const MIN = *(GOT_BASE - 0x6b688); const MAX = *(GOT_BASE - 0x6b68c);`)
  or rename so it's obvious from context.
- **Resolve the four class-field offsets.** `[esi+0x0c]`, `[esi+0x10]`,
  `[esi+0x14]`, `[esi+0x18]` need real field names. `field_0x14 = 0xffff0000`
  looks like a packed color or a state word — worth a note in the TODO
  ("packed short pair / color?").
- **Identify the `GOT+0x20c4` global.** `AMMO_GROUND_STATE_GLOBAL` is a
  guess; this should be tied back to a string in `strings-n5.txt` or a
  cross-reference against other CTSGroundAmmo methods.
- **Identify effect bits 0x80 / 0x2.** Almost certainly
  `EF_NODRAW` and `EF_DIMLIGHT` from HL1, but worth confirming in the TS
  include headers (the mod may have its own flag names).
- **Make it compile in isolation** by adding ambient declarations or
  using `any` for every external symbol. The current snippet won't type-
  check standalone.

Suggested rewrite (compiles in isolation, with the mins/maxs GOT mapping
pinned and the TODO names promoted to `any` so TS doesn't reject them):

```typescript
/**
 * CTSGroundAmmo::OnGround — Called when the ammo entity has landed on
 * the ground. Configures the entity as a static ground pickup: sets
 * spawnflags for the ground state, marks FL_ONGROUND, tweaks effects,
 * re-applies the current origin to sync the engine edict, sets a small
 * bounding box, and updates a handful of internal class fields.
 *
 * @param this  The CTSGroundAmmo entity instance
 * @returns     void
 *
 * GOT constants resolved from disassembly:
 *   GOT-0x6b68c → maxs constant  (ecx at call = arg3 = vecMax)
 *   GOT-0x6b688 → mins constant  (edx at call = arg2 = vecMin)
 *   GOT+0x20c4 → "ammo on ground" state global (loaded into field_0x18)
 *
 * TODO(D.4): cross-reference [esi+0xc/0x10/0x14/0x18] against other
 *   CTSGroundAmmo methods (WaitThink, WaitTouch, Spawn) to name the
 *   class fields. Likely candidates: m_flWaitUntil / m_iState /
 *   m_color / m_iNextThink.
 *
 * TODO(asm-ambiguous): bit 0x80 on pev.effects is almost certainly
 *   EF_NODRAW (128 in HL1) and bit 0x2 is EF_DIMLIGHT. Confirm against
 *   TS's local effects.h.
 */
export function OnGround(this: any): void {
  const pev = this.pev as any;

  // Ground-state spawnflags.
  pev.spawnflags = 5;

  // FL_ONGROUND = 1.
  pev.flags = 1;

  // Clear EF_NODRAW (bit 0x80), set EF_DIMLIGHT (bit 0x2).
  pev.effects = (pev.effects & ~0x80) | 0x2;

  // Re-apply the current origin so the engine re-syncs the edict's
  // server position from pev (no spatial change, just a sync trigger).
  UTIL_SetOrigin(pev, pev.origin);

  // Small ground-pickup bounding box from two GOT-resident cube
  // constants. The asm replicates each constant across all three Vector
  // components (the "cube mins/maxes" pattern). cdecl push order:
  //   push &maxs (ecx)  ← last in slice = arg3
  //   push &mins (edx)  ← middle = arg2
  //   push pev          ← first     = arg1
  // so this matches HLSDK UTIL_SetSize(pev, mins, maxs).
  const MIN: number = (GOT_BASE - 0x6b688) as any;  // mins constant
  const MAX: number = (GOT_BASE - 0x6b68c) as any;  // maxs constant
  const mins: [number, number, number] = [MIN, MIN, MIN];
  const maxs: [number, number, number] = [MAX, MAX, MAX];
  UTIL_SetSize(pev, mins, maxs);

  // Internal class bookkeeping:
  //   field_0x14 = 0xffff0000  (packed word — likely a state flag)
  //   field_0x18 = GOT+0x20c4  (32-bit global — likely an entity counter
  //                              or shared ammo state)
  //   field_0x0c = 0           (cleared timer / state word)
  //   field_0x10 = 0           (cleared timer / state word)
  this.field_0x0c = 0;
  this.field_0x10 = 0;
  this.field_0x14 = 0xffff0000;
  this.field_0x18 = (GOT_BASE + 0x20c4) as any;
}

// Ambient declarations so the snippet type-checks in isolation. In the
// real codebase these come from engine SDK + TS mod headers.
declare const UTIL_SetOrigin: (pev: any, origin: any) => void;
declare const UTIL_SetSize: (
  pev: any,
  mins: [number, number, number],
  maxs: [number, number, number]
) => void;
declare const GOT_BASE: number;
```

Summary: ship-ready after the GOT slot mapping for mins/maxs is pinned
(either by adding the constants as named globals or by annotating the
TS with the offsets), the four class-field offsets get resolved in D.4
via cross-reference against the other CTSGroundAmmo methods, and the
snippet is wrapped with the ambient declarations above so it compiles
standalone.
```
