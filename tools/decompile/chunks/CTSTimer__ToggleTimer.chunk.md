# `ToggleTimer__8CTSTimer` — CTSTimer::ToggleTimer

**Raw symbol:** `ToggleTimer__8CTSTimer`
**Demangled:** `CTSTimer::ToggleTimer()`
**Address:** `0x00062e44`
**Size:** 116 bytes (0x74)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSTimer`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__8CTSTimerP14KeyValueData_s` | T | 0x00062d50 | 93 | `CTSTimer::KeyValue(p KeyValueData_s)` |
| `Spawn__8CTSTimer` | T | 0x00062db0 | 146 | `CTSTimer::Spawn()` |
| `ToggleTimer__8CTSTimer` | T | 0x00062e44 | 116 | `CTSTimer::ToggleTimer()` |
| `WaitThink__8CTSTimer` | T | 0x00062eb8 | 180 | `CTSTimer::WaitThink()` |
| `Use__8CTSTimerP11CBaseEntityT18USE_TYPEf` | T | 0x00062f6c | 33 | `CTSTimer::Use(p ?, ?)` |
| `__tf8CTSTimer` | W | 0x00063c98 | 70 | — |
| `__8CTSTimer` | W | 0x00063ce0 | 44 | — |
| `__vt_8CTSTimer` | V | 0x001012e0 | 280 | — |
| `__ti8CTSTimer` | B | 0x00195118 | 12 | — |

## Disassembly

```asm
   62e44:	push   ebx
   62e45:	call   62e4a <ToggleTimer__8CTSTimer+0x6>
   62e4a:	pop    ebx
   62e4b:	add    ebx,0x102fc6
   62e51:	mov    ecx,DWORD PTR [esp+0x8]
   62e55:	cmp    DWORD PTR [ecx+0x64],0x0
   62e59:	jg     62e70 <ToggleTimer__8CTSTimer+0x2c>
   62e5b:	mov    DWORD PTR [ecx+0xc],0x0
   62e62:	mov    DWORD PTR [ecx+0x10],0x0
   62e69:	mov    BYTE PTR [ecx+0x68],0x0
   62e6d:	jmp    62eb6 <ToggleTimer__8CTSTimer+0x72>
   62e6f:	nop
   62e70:	xor    BYTE PTR [ecx+0x68],0x1
   62e74:	cmp    BYTE PTR [ecx+0x68],0x0
   62e78:	je     62ea8 <ToggleTimer__8CTSTimer+0x64>
   62e7a:	mov    ax,0x0
   62e7e:	or     eax,0xffff0000
   62e83:	mov    edx,DWORD PTR [ebx+0x1710]
   62e89:	mov    DWORD PTR [ecx+0xc],eax
   62e8c:	mov    DWORD PTR [ecx+0x10],edx
   62e8f:	mov    edx,DWORD PTR [ecx]
   62e91:	mov    eax,DWORD PTR [ebx+0x1600]
   62e97:	mov    eax,DWORD PTR [eax]
   62e99:	fild   DWORD PTR [ecx+0x64]
   62e9c:	fadd   DWORD PTR [eax]
   62e9e:	fstp   DWORD PTR [edx+0x104]
   62ea4:	jmp    62eb6 <ToggleTimer__8CTSTimer+0x72>
   62ea6:	mov    esi,esi
   62ea8:	mov    DWORD PTR [ecx+0xc],0x0
   62eaf:	mov    DWORD PTR [ecx+0x10],0x0
   62eb6:	pop    ebx
   62eb7:	ret

00062eb8 <WaitThink__8CTSTimer>:
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

- `ToggleTimer__8CTSTimer+0x6` (CTSTimer::ToggleTimer(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSTimer` is the class; method name is
  `ToggleTimer`.
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
