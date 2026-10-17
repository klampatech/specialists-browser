# `Spawn__13CTSDeadCorpse` — CTSDeadCorpse::Spawn

**Raw symbol:** `Spawn__13CTSDeadCorpse`
**Demangled:** `CTSDeadCorpse::Spawn()`
**Address:** `0x0006040c`
**Size:** 82 bytes (0x52)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSDeadCorpse`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Spawn__13CTSDeadCorpse` | T | 0x0006040c | 82 | `CTSDeadCorpse::Spawn()` |
| `WaitThink__13CTSDeadCorpse` | T | 0x00060460 | 154 | `CTSDeadCorpse::WaitThink()` |
| `Precache__13CTSDeadCorpse` | T | 0x000604fc | 1 | `CTSDeadCorpse::Precache()` |
| `TraceAttack__13CTSDeadCorpseP9entvars_sfG6VectorP11TraceResulti` | T | 0x00060500 | 1 | `CTSDeadCorpse::TraceAttack(p ?, ?)` |
| `__tf13CTSDeadCorpse` | W | 0x00060588 | 70 | — |
| `ObjectCaps__13CTSDeadCorpse` | W | 0x000605d0 | 6 | `CTSDeadCorpse::ObjectCaps()` |
| `__vt_13CTSDeadCorpse` | V | 0x00101020 | 280 | — |
| `__ti13CTSDeadCorpse` | B | 0x001950f4 | 12 | — |

## Disassembly

```asm
   6040c:	push   esi
   6040d:	push   ebx
   6040e:	sub    esp,0x4
   60411:	call   60416 <Spawn__13CTSDeadCorpse+0xa>
   60416:	pop    ebx
   60417:	add    ebx,0x1059fa
   6041d:	mov    esi,DWORD PTR [esp+0x10]
   60421:	sub    esp,0xc
   60424:	mov    eax,DWORD PTR [esi+0x60]
   60427:	push   esi
   60428:	call   DWORD PTR [eax+0x28]
   6042b:	mov    ax,0x0
   6042f:	or     eax,0xffff0000
   60434:	mov    edx,DWORD PTR [ebx+0x1ec4]
   6043a:	mov    DWORD PTR [esi+0xc],eax
   6043d:	mov    DWORD PTR [esi+0x10],edx
   60440:	mov    edx,DWORD PTR [esi]
   60442:	mov    eax,DWORD PTR [ebx+0x1600]
   60448:	mov    eax,DWORD PTR [eax]
   6044a:	fld    QWORD PTR [ebx-0x6f010]
   60450:	fadd   DWORD PTR [eax]
   60452:	fstp   DWORD PTR [edx+0x104]
   60458:	add    esp,0x14
   6045b:	pop    ebx
   6045c:	pop    esi
   6045d:	ret
```

## External calls in body

- `Spawn__13CTSDeadCorpse+0xa` (CTSDeadCorpse::Spawn(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSDeadCorpse` is the class; method name is
  `Spawn`.
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
