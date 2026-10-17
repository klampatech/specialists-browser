I notice the cross-vendor review prompt is structured for engine↔mod interface functions (GetEntityAPI*), but the function under review is a gameplay method (`CTSShotgunWeapon::GetWeapon`). The HLSDK reference doesn't directly apply — I'll review against the disassembly, which is what matters here. Items 2-4 of the checklist are not applicable to a gameplay method, so I'll mark them ⚠️ N/A.

Tracing the prologue carefully:
- 4 pushes (ebp, edi, esi, ebx) + `sub esp, 0xc` = 28 bytes of prologue.
- Per GCC x86 cdecl for member functions, `this` is the first implicit arg at `[E+4]`, so after the prologue `[esp+0x20] = this`, `[esp+0x24] = pEntity`.
- At `b95cf-b95d2`: `sub esp, 0x8; push [esp+0x2c]` — this pushes `[new_esp - 8 + 0x2c] = [new_esp + 0x24] = pEntity`. Then `push ebp` pushes `this`.

So the parent call is `parent.GetWeapon(this, pEntity)`, not `parent.GetWeapon(pEntity, ???)` as the TS comment claims. The TS appears to have miscounted the prologue (forgetting `sub esp, 0xc`) and missed the `sub esp, 0x8` adjustment before b95d2.

```
VERDICT: FAIL

Checklist:
1. Signature — ✅ — `GetWeapon(this: CTSShotgunWeapon, pEntity: CBaseEntity): void` matches the demangled symbol `CTSShotgunWeapon::GetWeapon(p CBaseEntity)`. Free-function form with explicit `this` is fine for decompiled TS.
2. Version check — ⚠️ N/A — not an engine-interface function.
3. interfaceVersion assignment — ⚠️ N/A — not an engine-interface function.
4. Success path: struct copy — ⚠️ N/A — no struct copy involved.
5. No fabricated paths — ❌ — The TS systematically misidentifies `this` (the shotgun) as `pEntity` (the picker-upper). The asm loads `[esp+0x20]` into `ebp` once and uses `ebp` for every field access — that is `this`, not `pEntity`. Every flag check, vtable lookup, cache write, receiver load, and the cached-id push is on `this` in the asm but on `pEntity` in the TS. Additionally, the parent call is `parent.GetWeapon(this, pEntity)` (a method call with `this` as the implicit `this`), but the TS calls it as a free function `groundWeaponGetWeapon(pEntity, undefined)` — args are in the wrong order and `undefined as any` is a phantom placeholder.
6. No TODO body — ✅ — Real code, not placeholder-only. The `TODO(asm-ambiguous)` comments annotate genuine unknowns (field identities) without replacing the code.
7. Field names — ⚠️ — `pev`, `flags` are standard. Offsets `0x60`, `0xa4`, `0x118`, `0x208`, `0x11c`, `0x1f2`, `0x1aa8`, `0x8` are magic numbers from the asm; the TODO comments justify them. Inconsistent representation: `vtable[0x11c]` uses byte offset while `funcTable[2]` uses DWORD index for the same kind of access (`[esi+0x8]` is byte offset 0x8 = DWORD index 2).
8. Compiles in isolation — ✅ — `any` is used for unknown offsets, external types (`CTSShotgunWeapon`, `CBaseEntity`) and helpers (`getWeaponInfo`, `groundWeaponGetWeapon`) are referenced but not defined here, which is acceptable for a decompiled fragment.

Issues to fix:
- `ebp = [esp+0x20]` is `this`, not `pEntity`. Every field access that uses `ebp` in the asm must use `this` in the TS:
  - Flag check (`pEntity.pev.flags` → `this.pev.flags`).
  - Vtable ptr load (`(pEntity as any)[0x60]` → `(this as any)[0x60]`).
  - Vtable call target (`vtable[0x11c](pEntity)` → `vtable[0x11c](this)`).
  - Cache write (`(pEntity as any)[0xa4] = …` → `(this as any)[0xa4] = …`).
  - Receiver (`(pEntity.pev as any)[0x208]` → `(this.pev as any)[0x208]`).
  - `getWeaponInfo` arg (`(pEntity as any)[0xa4]` → `(this as any)[0xa4]`).
- Parent call: the asm pushes `pEntity` then `ebp = this`, then calls the parent. That's `parent.GetWeapon(this, pEntity)`. Replace `groundWeaponGetWeapon(pEntity, undefined as any)` with `groundWeaponGetWeapon.call(this, pEntity)`. Drop the `undefined` placeholder and the misleading "second arg from the caller's stack" comment — the asm's `push [esp+0x2c]` (after the `sub esp, 0x8`) is `pEntity` itself, not something above the args. The demangler's single explicit arg is correct; there is no missing second arg.
- `0x80` flag interpretation: the asm tests `BYTE [pev+0x118]`. The TS comment "kill-queue / notarget-style marker" is speculation; `0x80` is bit 7 of a byte, not a standard HLSDK flag at the standard offsets. Mark as ambiguous rather than asserting semantics.
- Pick one offset convention: either byte offsets (`funcTable[0x8]`, `vtable[0x11c]`) or DWORD indices (`funcTable[2]`, `vtable[0x47]`). The asm is byte-offset, so byte-offset is the more faithful choice.
- `globalThis as any` for the GOT entry is a representation choice; the comment should make clear this stands in for the .so data segment at `[ebx+0x1aa8]`, not for an actual JS global.

Suggested rewrite:

```typescript
/**
 * CTSShotgunWeapon::GetWeapon — pickup handler invoked when an entity
 * picks up a shotgun weapon from the ground.
 *
 * Behaviour (from the asm):
 *   1. If `this->pev->byte_at_0x118 & 0x80` is set, skip the pickup.
 *   2. Delegate to CTSGroundWeapon::GetWeapon (called as a method on
 *      `this`, with `pEntity` as the explicit CBaseEntity*).
 *   3. Re-check the same flag; if set, dispatch through a function-
 *      pointer table at `this+0x60` (entry at offset 0x11c) and cache
 *      the returned weapon-type id at `this+0xa4`.
 *   4. Resolve the weapon-info struct via `get_weapon_info(cached_id)`
 *      and dispatch a global at `[GOT+0x1aa8]+0x8` with
 *      `(this->pev->field_at_0x208, weaponInfo + 0x1f2)`.
 */
export function GetWeapon(this: CTSShotgunWeapon, pEntity: CBaseEntity): void {
  // 1. Early-out: skip the pickup if `this` is flagged at pev+0x118.
  if (((this.pev as any)[0x118] & 0x80) !== 0) {
    return;
  }

  // 2. Delegate to the parent class. The asm pushes (pEntity, this)
  // right-to-left, which at the callee yields (this, pEntity) — i.e.,
  // a method call with `this` bound.
  groundWeaponGetWeapon.call(this, pEntity);

  // 3. If `this` is now flagged, fetch its weapon-type id via a
  // virtual dispatch and cache it at field offset 0xa4.
  if (((this.pev as any)[0x118] & 0x80) !== 0) {
    // TODO(asm-ambiguous): `this+0x60` is treated as a function-pointer
    // table (likely a TS-specific vtable). The entry at offset 0x11c is
    // called with `this` as the receiver; the returned value is cached.
    const vtable = (this as any)[0x60] as {
      [offset: number]: (self: any) => number;
    };
    (this as any)[0xa4] = vtable[0x11c](this);
  }

  // 4. Look up the TS weapon-info struct for the cached weapon-type id,
  // then dispatch through a global function table to apply the pickup
  // effect.
  // TODO(asm-ambiguous): `this->pev+0x208` is a TS-specific field whose
  // meaning is unclear from this chunk alone.
  const receiver = (this.pev as any)[0x208];
  // TODO(asm-ambiguous): the global at GOT+0x1aa8 (represented here as
  // a stand-in slot on `globalThis`) holds a function-pointer table;
  // the entry at byte offset 0x8 is called with (receiver, info+0x1f2).
  const funcTable = (globalThis as any)[0x1aa8] as Array<
    (receiver: any, info: number) => void
  >;
  const info = getWeaponInfo((this as any)[0xa4]);
  funcTable[2](receiver, info + 0x1f2);
}
```

Note on context: I didn't read `HANDOFF.md` or `SPEC.md` because this prompt is self-contained (disassembly + TS + checklist inline) and `AGENTS.md` instructs agents to read them when picking up phase work, not when answering a scoped review question. If you'd like me to also surface anything from the project's `HANDOFF.md` that's relevant to this review (e.g., whether there's an established convention for representing `this`-binding in the TS), say the word and I'll go fetch it.
