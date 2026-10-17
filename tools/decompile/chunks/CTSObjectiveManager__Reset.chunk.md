# `Reset__19CTSObjectiveManager` — CTSObjectiveManager::Reset

**Raw symbol:** `Reset__19CTSObjectiveManager`
**Demangled:** `CTSObjectiveManager::Reset()`
**Address:** `0x0007b850`
**Size:** 422 bytes (0x1a6)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSObjectiveManager`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Save__19CTSObjectiveManagerR5CSave` | T | 0x0007b3cc | 80 | `CTSObjectiveManager::Save(r CSave)` |
| `Restore__19CTSObjectiveManagerR8CRestore` | T | 0x0007b41c | 80 | `CTSObjectiveManager::Restore(r CRestore)` |
| `KeyValue__19CTSObjectiveManagerP14KeyValueData_s` | T | 0x0007b46c | 847 | `CTSObjectiveManager::KeyValue(p KeyValueData_s)` |
| `Spawn__19CTSObjectiveManager` | T | 0x0007b7bc | 147 | `CTSObjectiveManager::Spawn()` |
| `Reset__19CTSObjectiveManager` | T | 0x0007b850 | 422 | `CTSObjectiveManager::Reset()` |
| `__tf19CTSObjectiveManager` | W | 0x0007e574 | 70 | — |
| `_19CTSObjectiveManager.m_SaveData` | D | 0x001034e0 | 208 | — |
| `__vt_19CTSObjectiveManager` | V | 0x001040a0 | 284 | — |
| `__ti19CTSObjectiveManager` | B | 0x00195250 | 12 | — |

## Disassembly

```asm
   7b850:	push   ebp
   7b851:	push   edi
   7b852:	push   esi
   7b853:	push   ebx
   7b854:	sub    esp,0xc
   7b857:	call   7b85c <Reset__19CTSObjectiveManager+0xc>
   7b85c:	pop    ebx
   7b85d:	add    ebx,0xea5b4
   7b863:	mov    ebp,DWORD PTR [esp+0x20]
   7b867:	cmp    DWORD PTR [ebp+0x64],0x0
   7b86b:	je     7b897 <Reset__19CTSObjectiveManager+0x47>
   7b86d:	sub    esp,0x8
   7b870:	mov    eax,DWORD PTR [ebx+0x1600]
   7b876:	mov    eax,DWORD PTR [eax]
   7b878:	mov    eax,DWORD PTR [eax+0x98]
   7b87e:	add    eax,DWORD PTR [ebp+0x64]
   7b881:	push   eax
   7b882:	push   0x1e
   7b884:	push   0x8
   7b886:	push   0x0
   7b888:	push   0xff
   7b88d:	push   0x0
   7b88f:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   7b894:	add    esp,0x20
   7b897:	cmp    DWORD PTR [ebp+0x68],0x0
   7b89b:	je     7b8c7 <Reset__19CTSObjectiveManager+0x77>
   7b89d:	sub    esp,0x8
   7b8a0:	mov    eax,DWORD PTR [ebx+0x1600]
   7b8a6:	mov    eax,DWORD PTR [eax]
   7b8a8:	mov    eax,DWORD PTR [eax+0x98]
   7b8ae:	add    eax,DWORD PTR [ebp+0x68]
   7b8b1:	push   eax
   7b8b2:	push   0x1e
   7b8b4:	push   0x8
   7b8b6:	push   0x0
   7b8b8:	push   0xff
   7b8bd:	push   0x0
   7b8bf:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   7b8c4:	add    esp,0x20
   7b8c7:	cmp    DWORD PTR [ebp+0x6c],0x0
   7b8cb:	je     7b8f7 <Reset__19CTSObjectiveManager+0xa7>
   7b8cd:	sub    esp,0x8
   7b8d0:	mov    eax,DWORD PTR [ebx+0x1600]
   7b8d6:	mov    eax,DWORD PTR [eax]
   7b8d8:	mov    eax,DWORD PTR [eax+0x98]
   7b8de:	add    eax,DWORD PTR [ebp+0x6c]
   7b8e1:	push   eax
   7b8e2:	push   0x1e
   7b8e4:	push   0x8
   7b8e6:	push   0x0
   7b8e8:	push   0xff
   7b8ed:	push   0x0
   7b8ef:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   7b8f4:	add    esp,0x20
   7b8f7:	cmp    DWORD PTR [ebp+0x70],0x0
   7b8fb:	je     7b927 <Reset__19CTSObjectiveManager+0xd7>
   7b8fd:	sub    esp,0x8
   7b900:	mov    eax,DWORD PTR [ebx+0x1600]
   7b906:	mov    eax,DWORD PTR [eax]
   7b908:	mov    eax,DWORD PTR [eax+0x98]
   7b90e:	add    eax,DWORD PTR [ebp+0x70]
   7b911:	push   eax
   7b912:	push   0x1e
   7b914:	push   0x8
   7b916:	push   0x0
   7b918:	push   0xff
   7b91d:	push   0x0
   7b91f:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   7b924:	add    esp,0x20
   7b927:	mov    DWORD PTR [esp+0x8],0x0
   7b92f:	lea    esi,[ebp+0x70]
   7b932:	mov    edi,esi
   7b934:	cmp    DWORD PTR [esi+0x4],0x0
   7b938:	je     7b95d <Reset__19CTSObjectiveManager+0x10d>
   7b93a:	sub    esp,0xc
   7b93d:	push   0x0
   7b93f:	push   0x3
   7b941:	push   ebp
   7b942:	push   ebp
   7b943:	mov    eax,DWORD PTR [ebx+0x1600]
   7b949:	mov    eax,DWORD PTR [eax]
   7b94b:	mov    eax,DWORD PTR [eax+0x98]
   7b951:	add    eax,DWORD PTR [edi+0x4]
   7b954:	push   eax
   7b955:	call   59630 <FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt>
   7b95a:	add    esp,0x20
   7b95d:	cmp    DWORD PTR [esi+0x8],0x0
   7b961:	je     7b986 <Reset__19CTSObjectiveManager+0x136>
   7b963:	sub    esp,0xc
   7b966:	push   0x0
   7b968:	push   0x3
   7b96a:	push   ebp
   7b96b:	push   ebp
   7b96c:	mov    eax,DWORD PTR [ebx+0x1600]
   7b972:	mov    eax,DWORD PTR [eax]
   7b974:	mov    eax,DWORD PTR [eax+0x98]
   7b97a:	add    eax,DWORD PTR [edi+0x8]
   7b97d:	push   eax
   7b97e:	call   59630 <FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt>
   7b983:	add    esp,0x20
   7b986:	cmp    DWORD PTR [esi+0xc],0x0
   7b98a:	je     7b9af <Reset__19CTSObjectiveManager+0x15f>
   7b98c:	sub    esp,0xc
   7b98f:	push   0x0
   7b991:	push   0x3
   7b993:	push   ebp
   7b994:	push   ebp
   7b995:	mov    eax,DWORD PTR [ebx+0x1600]
   7b99b:	mov    eax,DWORD PTR [eax]
   7b99d:	mov    eax,DWORD PTR [eax+0x98]
   7b9a3:	add    eax,DWORD PTR [edi+0xc]
   7b9a6:	push   eax
   7b9a7:	call   59630 <FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt>
   7b9ac:	add    esp,0x20
   7b9af:	cmp    DWORD PTR [esi+0x10],0x0
   7b9b3:	je     7b9d8 <Reset__19CTSObjectiveManager+0x188>
   7b9b5:	sub    esp,0xc
   7b9b8:	push   0x0
   7b9ba:	push   0x3
   7b9bc:	push   ebp
   7b9bd:	push   ebp
   7b9be:	mov    eax,DWORD PTR [ebx+0x1600]
   7b9c4:	mov    eax,DWORD PTR [eax]
   7b9c6:	mov    eax,DWORD PTR [eax+0x98]
   7b9cc:	add    eax,DWORD PTR [edi+0x10]
   7b9cf:	push   eax
   7b9d0:	call   59630 <FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt>
   7b9d5:	add    esp,0x20
   7b9d8:	add    edi,0x10
   7b9db:	add    esi,0x10
   7b9de:	add    DWORD PTR [esp+0x8],0x4
   7b9e3:	cmp    DWORD PTR [esp+0x8],0x7
   7b9e8:	jle    7b934 <Reset__19CTSObjectiveManager+0xe4>
   7b9ee:	add    esp,0xc
   7b9f1:	pop    ebx
   7b9f2:	pop    esi
   7b9f3:	pop    edi
   7b9f4:	pop    ebp
   7b9f5:	ret
```

## External calls in body

- `Reset__19CTSObjectiveManager+0xc` (CTSObjectiveManager::Reset(?))
- `TSHudMessageAll__FUcUcUciiPc@plt` (TSHudMessageAll__FUcUcUciiPc)
- `FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt` (FireTargets__FPCcP11CBaseEntityT18USE_TYPEf)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSObjectiveManager` is the class; method name is
  `Reset`.
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
