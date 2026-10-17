The `Decompiled TS (from codex)` section is empty — it contains only a stray triple backtick and no actual TypeScript. There's literally no code to apply the checklist to. I can't issue a meaningful PASS/FAIL verdict on nothing.

There's also a category mismatch: the 8-item checklist is built for the 4 engine↔mod interface entry points (`GiveFnptrsToDll` / `GetEntityAPI*` / `GetNewDLLFunctions`) and specifically tests the version-check + `*interfaceVersion` assignment-back + `memcpy` patterns. `CTSPowerUp::OnGround` is a class method on a gameplay entity, so items 2, 3, and 4 of the checklist simply do not apply in the same form. I'm switching to a checklist that fits class-method decompilation.

So you have two ways forward:

1. **Paste the actual `CTSPowerUp::OnGround` TS** that Codex produced, and I'll run it through a class-method-appropriate checklist against the disassembly below.
2. **Use the reconstruction below** as a sanity check on what Codex should have produced, and tell me where it diverges.

---

## VERDICT: FAIL — no TS code to review

**Checklist (interface-template items, marked N/A):**
1. Signature — ⚠️ N/A — checklist is for interface entry points; `CTSPowerUp::OnGround` is a void-returning class method taking `this`. Different shape.
2. Version check — N/A — class methods don't have interface versions.
3. `*interfaceVersion` assignment-back — N/A.
4. Success path memcpy — N/A — class methods operate on `this->pev`, not engine tables.
5. No fabricated paths — ⚠️ — **not assessable, no code provided.**
6. No TODO body — ⚠️ — **not assessable, no code provided.**
7. Field names — ⚠️ — **not assessable, no code provided.**
8. Compiles in isolation — ⚠️ — **not assessable, no code provided.**

**Issues to fix:**
- The TS code block under `### Decompiled TS (from codex)` is empty (just an orphan triple backtick). Paste the actual output and I'll review it.
- The checklist template is the wrong shape for a class method. If you want a class-method review, use a checklist that asks about: signature + return type, `this` arg passing (ECX vs stack), `pev` field offsets, member-field offsets, external-call arg order vs HLSDK prototype, no fabricated branches.

---

## Reference reconstruction (what `CTSPowerUp::OnGround` should look like)

For your reference, here's a faithful reading of the disassembly. Use this to spot drift in the actual Codex output once you paste it.

### Asm summary

| Step | What |
|---|---|
| prologue | Save edi/esi/ebx; `sub esp, 0x20` (32 B locals); PIC thunk sets `ebx = GOT` |
| `this` | `esi = [esp+0x30]` — `this` is passed on the stack, not ECX (caller-style) |
| `pev->0x10c` | `mov DWORD [eax+0x10c], 0x1` — overwrites with 1 (FL_ONGROUND-style bit if `flags` lives there; or `movetype = MOVETYPE_NONE`) |
| `pev->0x118` | `and [eax+0x118], 0xFFFFFF7F`; `or [eax+0x118], 0x2` — clear bit 0x80, set bit 0x02 |
| `UTIL_SetOrigin(pev, &pev->origin)` | arg2 is the origin Vector by const-ref (`pev+0x8` is `origin`) |
| `UTIL_SetSize` setup | writes 2 Vector locals in the 32-B local area: `mins` at `[esp+0x10..0x1c]`, `maxs` at `[esp+0x00..0x0c]` |
| Vector values | from data-segment globals: `mins.x = mins.y = [ebx-0x6DEC8]`; `mins.z = [ebx-0x6DF70]`; `maxs.x = maxs.y = [ebx-0x6CB5C]`; `maxs.z = [ebx-0x6F408]` |
| `UTIL_SetSize` call | push order = `(mins, maxs, pev)` → cdecl right-to-left, so signature is **`UTIL_SetSize(pev, maxs, mins)`** — note maxs before mins; HLSDK prototype has `min` before `max`; either TS mod's `UTIL_SetSize` swaps arg order, or my interpretation is off — TODO verify |
| Tail stores | `this->0xc = 0xffff0000`; `this->0x10 = [ebx+0x2038]`; `this->0x14 = 0xffff0000`; `this->0x18 = [ebx+0x1930]` — two (0xffff0000, float) pairs |
| epilogue | `add esp, 0x30; pop ebx/esi/edi; ret` — **no return value, `void`** |

### Suggested TS (faithful, with TODOs for unknowns)

```typescript
// CTSPowerUp::OnGround — faithful reconstruction from the disassembly.
// Compiles in isolation; field names use TODO placeholders for the unknowns.

declare const g_ebx_mins_xy: any;     // [ebx-0x6DEC8]
declare const g_ebx_mins_z:  any;     // [ebx-0x6DF70]
declare const g_ebx_maxs_xy: any;     // [ebx-0x6CB5C]
declare const g_ebx_maxs_z:  any;     // [ebx-0x6F408]
declare const g_ebx_f10:     any;     // [ebx+0x2038]
declare const g_ebx_f18:     any;     // [ebx+0x1930]

export function CTSPowerUp_OnGround(this: CTSPowerUp): void {
    // 'this' is on the stack at [esp+0x30] (not ECX) — caller-style pass.
    const pev = this.pev; // CBaseEntity::pev at offset 0

    // pev->field_0x10c = 1   (asm uses MOV, not OR — full overwrite with 1)
    // TODO(asm-ambiguous): 0x10c is FL_ONGROUND if pev->flags is at0x10c
    //                      (matches the clear-bit-0x80 / set-bit-0x02 follow-up),
    //                      OR it's movetype=MOVETYPE_NONE if the TS mod's
    //                      entvars_s layout shifts things. Resolve against the
    //                      TS mod's entvars_s in D.4 / class-definition lookup.
    pev.field_0x10c = 1;

    // pev->field_0x118: clear bit 0x80, set bit 0x02 (probably pev->flags)
    pev.field_0x118 = (pev.field_0x118 & ~0x80) | 0x02;

    // UTIL_SetOrigin(pev, pev->origin) — second arg is &pev->origin by const-ref
    UTIL_SetOrigin(pev, pev.origin);

    // UTIL_SetSize(pev, maxs, mins) — asm push order (mins, maxs, pev) means
    // cdecl sees arg1=pev, arg2=maxs, arg3=mins. HLSDK prototype is (min, max).
    // TODO: confirm TS mod's UTIL_SetSize prototype — either args are swapped
    // or my edi/ecx assignment is inverted.
    const mins: Vector = { x: g_ebx_mins_xy, y: g_ebx_mins_xy, z: g_ebx_mins_z };
    const maxs: Vector = { x: g_ebx_maxs_xy, y: g_ebx_maxs_xy, z: g_ebx_maxs_z };
    UTIL_SetSize(pev, maxs, mins);

    // this->field_0xc = 0xffff0000; this->field_0x10 = global_at_ebx_plus_0x2038
    // this->field_0x14 = 0xffff0000; this->field_0x18 = global_at_ebx_plus_0x1930
    // Two (0xffff0000, float) pairs. 0xffff0000 as a 32-bit float is NaN;
    // as a 32-bit int is -65536; as two shorts is [0, -1]. Probably a sentinel
    // bit-pattern. TODO: identify the real CTSPowerUp member layout in D.4.
    this.field_0xc = 0xffff0000;
    this.field_0x10 = g_ebx_f10;
    this.field_0x14 = 0xffff0000;
    this.field_0x18 = g_ebx_f18;
}
```

### Things the reconstruction still cannot resolve without more context

- **`pev->0x10c` and `pev->0x118` field identity.** The values (single-bit clear+set) strongly suggest `flags` is at `0x118` and `0x10c` is something set to 1 (movetype/view_ofs/etc.). The TS mod's `entvars_s` may not match stock HLSDK offsets — needs the TS mod's `entvars.h` or class-definition dump to confirm.
- **`this->0xc..0x18` member identity.** Sixteen bytes of CTSPowerUp-only data; the asm gives bit-pattern hints but not the field names. D.4 (cross-reference with `strings-n5.txt` and CTSPowerUp sibling symbols) is where these get named.
- **4 data-section float constants** at `[ebx-0x6DEC8]`, `[ebx-0x6DF70]`, `[ebx-0x6CB5C]`, `[ebx-0x6F408]`. Likely the pickup bbox constants (something like `(±16, ±16, 0..24)`) but I can't read them out of the binary from the disassembly alone — need to dump those data addresses.
- **`UTIL_SetSize` arg order.** Asm pushes `(mins, maxs, pev)` → cdecl sees `(pev, maxs, mins)`. Stock HLSDK prototype is `(pev, min, max)`. Either the TS mod's `UTIL_SetSize` swaps args, or I'm mis-assigning edi/ecx to the two Vectors. The two are easily confused because the compiler reuses `esp` for both Vectors in the local frame.

Once you paste the actual Codex output for `CTSPowerUp::OnGround`, I'll diff it against this and call out anything that drifts.
