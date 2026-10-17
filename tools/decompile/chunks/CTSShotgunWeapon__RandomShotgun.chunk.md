# `RandomShotgun__16CTSShotgunWeapon` — CTSShotgunWeapon::RandomShotgun

**Raw symbol:** `RandomShotgun__16CTSShotgunWeapon`
**Demangled:** `CTSShotgunWeapon::RandomShotgun()`
**Address:** `0x000b9638`
**Size:** 122 bytes (0x7a)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSShotgunWeapon`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Spawn__16CTSShotgunWeapon` | T | 0x000b9574 | 54 | `CTSShotgunWeapon::Spawn()` |
| `GetWeapon__16CTSShotgunWeaponP11CBaseEntity` | T | 0x000b95ac | 138 | `CTSShotgunWeapon::GetWeapon(p CBaseEntity)` |
| `RandomShotgun__16CTSShotgunWeapon` | T | 0x000b9638 | 122 | `CTSShotgunWeapon::RandomShotgun()` |
| `__tf16CTSShotgunWeapon` | W | 0x000ba8f8 | 70 | — |
| `__vt_16CTSShotgunWeapon` | V | 0x0010ad80 | 292 | — |
| `__ti16CTSShotgunWeapon` | B | 0x00195620 | 12 | — |

## Disassembly

```asm
   b9638:	push   ebx
   b9639:	sub    esp,0x8
   b963c:	call   b9641 <RandomShotgun__16CTSShotgunWeapon+0x9>
   b9641:	pop    ebx
   b9642:	add    ebx,0xac7cf
   b9648:	sub    esp,0x8
   b964b:	mov    eax,DWORD PTR [ebx+0x1aa8]
   b9651:	push   0x5
   b9653:	push   0x1
   b9655:	call   DWORD PTR [eax+0x168]
   b965b:	add    esp,0x10
   b965e:	sub    eax,0x1
   b9661:	cmp    eax,0x4
   b9664:	ja     b9688 <RandomShotgun__16CTSShotgunWeapon+0x50>
   b9666:	mov    edx,ebx
   b9668:	sub    edx,DWORD PTR [ebx+eax*4-0xac79c]
   b966f:	mov    eax,edx
   b9671:	jmp    eax
   b9673:	nop
   b9674:	mov    bh,al
   b9676:	or     al,BYTE PTR [eax]
   b9678:	add    bh,0xa
   b967b:	add    BYTE PTR [eax-0x39],bh
   b967e:	or     al,BYTE PTR [eax]
   b9680:	jo     b9649 <RandomShotgun__16CTSShotgunWeapon+0x11>
   b9682:	or     al,BYTE PTR [eax]
   b9684:	push   0xb8000ac7
   b9689:	add    al,0x0
   b968b:	add    BYTE PTR [eax],al
   b968d:	jmp    b96ad <RandomShotgun__16CTSShotgunWeapon+0x75>
   b968f:	nop
   b9690:	mov    eax,0x1a
   b9695:	jmp    b96ad <RandomShotgun__16CTSShotgunWeapon+0x75>
   b9697:	nop
   b9698:	mov    eax,0x21
   b969d:	jmp    b96ad <RandomShotgun__16CTSShotgunWeapon+0x75>
   b969f:	nop
   b96a0:	mov    eax,0x14
   b96a5:	jmp    b96ad <RandomShotgun__16CTSShotgunWeapon+0x75>
   b96a7:	nop
   b96a8:	mov    eax,0xb
   b96ad:	add    esp,0x8
   b96b0:	pop    ebx
   b96b1:	ret
```

## External calls in body

- `RandomShotgun__16CTSShotgunWeapon+0x9` (CTSShotgunWeapon::RandomShotgun(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSShotgunWeapon` is the class; method name is
  `RandomShotgun`.
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
