# `GetDescription__8CTSKnife` — CTSKnife::GetDescription

**Raw symbol:** `GetDescription__8CTSKnife`
**Demangled:** `CTSKnife::GetDescription()`
**Address:** `0x0006db04`
**Size:** 80 bytes (0x50)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSKnife`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `CreateKnife__8CTSKnifeP11CBasePlayerG6VectorT2i` | T | 0x0006d9e4 | 285 | `CTSKnife::CreateKnife(p ?, ?)` |
| `GetDescription__8CTSKnife` | T | 0x0006db04 | 80 | `CTSKnife::GetDescription()` |
| `Spawn__8CTSKnife` | T | 0x0006db54 | 403 | `CTSKnife::Spawn()` |
| `WaitTouch__8CTSKnifeP11CBaseEntity` | T | 0x0006dce8 | 185 | `CTSKnife::WaitTouch(p CBaseEntity)` |
| `Use__8CTSKnifeP11CBaseEntityT18USE_TYPEf` | T | 0x0006dda4 | 293 | `CTSKnife::Use(p ?, ?)` |
| `BounceTouch__8CTSKnifeP11CBaseEntity` | T | 0x0006decc | 2915 | `CTSKnife::BounceTouch(p CBaseEntity)` |
| `WaitThink__8CTSKnife` | T | 0x0006ea30 | 803 | `CTSKnife::WaitThink()` |
| `ShouldCollide__8CTSKnifeP11CBaseEntity` | T | 0x0006ed54 | 6 | `CTSKnife::ShouldCollide(p CBaseEntity)` |
| `__tf8CTSKnife` | W | 0x0006f004 | 70 | — |
| `ObjectCaps__8CTSKnife` | W | 0x0006f04c | 6 | `CTSKnife::ObjectCaps()` |
| `__vt_8CTSKnife` | V | 0x00102d20 | 296 | — |
| `__ti8CTSKnife` | B | 0x001951c0 | 12 | — |

## Disassembly

```asm
   6db04:	push   ebx
   6db05:	call   6db0a <GetDescription__8CTSKnife+0x6>
   6db0a:	pop    ebx
   6db0b:	add    ebx,0xf8306
   6db11:	mov    eax,DWORD PTR [esp+0x8]
   6db15:	mov    eax,DWORD PTR [eax+0xa0]
   6db1b:	cmp    eax,0x7
   6db1e:	je     6db44 <GetDescription__8CTSKnife+0x40>
   6db20:	cmp    eax,0x7
   6db23:	jg     6db2c <GetDescription__8CTSKnife+0x28>
   6db25:	cmp    eax,0x6
   6db28:	je     6db3c <GetDescription__8CTSKnife+0x38>
   6db2a:	jmp    6db4c <GetDescription__8CTSKnife+0x48>
   6db2c:	cmp    eax,0x8
   6db2f:	jne    6db4c <GetDescription__8CTSKnife+0x48>
   6db31:	lea    eax,[ebx-0x6e02d]
   6db37:	jmp    6db52 <GetDescription__8CTSKnife+0x4e>
   6db39:	lea    esi,[esi+0x0]
   6db3c:	lea    eax,[ebx-0x6e01d]
   6db42:	jmp    6db52 <GetDescription__8CTSKnife+0x4e>
   6db44:	lea    eax,[ebx-0x6e007]
   6db4a:	jmp    6db52 <GetDescription__8CTSKnife+0x4e>
   6db4c:	lea    eax,[ebx-0x6f7b9]
   6db52:	pop    ebx
   6db53:	ret

0006db54 <Spawn__8CTSKnife>:
```

## PIC / GOT base computation
> **Note on PIC/GOT pattern:** The first 6 bytes of this function
> (`call $+5; pop ebx; add ebx, 0x<got_offset>`) is a standard
> position-independent-code (PIC) pattern used to compute the
> global offset table (GOT) base. After this, `ebx` holds the
> base address of the .got section, and `[ebx + offset]` /
> `[ebx - offset]` accesses are global data (cvars, singletons,
> global state).

## External calls in body

- `GetDescription__8CTSKnife+0x6` (CTSKnife::GetDescription(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSKnife` is the class; method name is
  `GetDescription`.
- Field offsets in the disassembly (`[esi+0xf8]`, `[esi+0x64]`)
  correspond to `this` fields. Infer the field's purpose from
  the operations (float = time/value, byte = flag, ptr = object).
  Use the GoldSrc entity class as a reference for field names.
- Globals via `[ebx+offset]` (after PIC setup) are cvars or
  singletons. Compare with the cvar names in `strings-n5.txt`
  if relevant (e.g. `slowamt`, `ts_slowmotion`).
- Add `// TODO(asm-ambiguous):` comments where the assembly is
  ambiguous (e.g. conditional branches where the condition is
  unclear without knowing the GoldSrc engine semantics).
- Output ONE TypeScript function declaration. Don't try to
  reconstruct the full class yet — that's a separate D.4 task.
- The output should compile in isolation (no external type
  references we don't define here).
