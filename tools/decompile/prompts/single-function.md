# Single-function AI decompile prompt

You are decompiling a single function from the closed-source
The Specialists (TS) mod for Half-Life 1. The binary is
`ts/dlls/ts_i386.so` — a 32-bit Linux ELF, NOT stripped, with full
debug symbols and 619 exported class methods.

Your job: read the disassembly + symbol context in the chunk below
and produce a clean, idiomatic TypeScript function declaration that
captures what the function **does**.

## Output format

Respond with ONE TypeScript function declaration (no class wrapper,
no imports beyond what's needed). Use this skeleton:

```typescript
/**
 * CTSSlowMotion::ActivateSlow — what this function does in 1-2 lines.
 *
 * @param this  The CTSSlowMotion entity instance (this in the original C++)
 * @returns     void
 */
export function ActivateSlow(this: CTSSlowMotion): void {
  // ... your TS body ...
}
```

The skeleton type names (`CTSSlowMotion`) come from the chunk's
demangled class name; use them as-is.

## Decompilation principles

1. **Treat the disassembly as a specification, not source.**
   Don't do 1:1 line-by-line translation. Produce TS that captures
   the function's *behavior* — what it does, in what order, with
   what side effects.

2. **Use clear names from context.**
   - `cvarName` for `[ebx+offset]` reads after the PIC pattern.
     The cvar names are in `tools/decompile/analysis/strings-n5.txt`
     — if a string in that file matches an offset you see, that's
     probably the cvar being accessed.
   - `this.someField` for `[esi+offset]` / `[this+offset]` reads
     and writes. Field purpose from operation type:
     - Float (`fld`/`fcomp`/`fadd`/`fstp`) = time, value, vector coord
     - Byte (`xor BYTE` / `cmp BYTE`) = flag, mode byte
     - Dword (`mov DWORD` / `cmp DWORD`) = pointer, int, time-as-int

3. **PIC / GOT pattern:** the first 6 bytes
   `call $+5; pop ebx; add ebx, <got_offset>` compute the global
   offset table base. After this, `[ebx ± k]` accesses globals.
   The chunk flags this with a "PIC / GOT base computation" note
   if present.

4. **Calling convention:**
   - `push esi; push ebx; sub esp, N` = prologue saving callee-saved
     registers + allocating N bytes of locals
   - `[esp+0x10]` = first argument (after `push esi; push ebx`)
   - `[esp+0x4]` = return address (after `call`)
   - `[esi+offset]` = `this` field access (the compiler uses
     esi/edi as the `this` register in 32-bit MSVC builds)

5. **Comments for ambiguity.** Add `// TODO(asm-ambiguous):` where
   the assembly is unclear:
   - Conditional branches where the condition depends on engine
     semantics not visible in the chunk
   - Float comparisons where you can't tell if it's >, <, or ==
   - Multi-byte struct access patterns where the field layout is
     inferred rather than documented

6. **No magic numbers without context.** If you can't determine what
   an offset means, leave it as `0x68` (or whatever) and add a
   `// TODO: offset meaning unclear` comment.

7. **The output must compile in isolation.** No imports beyond
   what's standard. If you reference types we haven't defined
   yet, use `any` and add a TODO.

8. **What's NOT in scope:**
   - Don't try to reconstruct the full class (that's D.4).
   - Don't add engine-callback scaffolding we haven't built yet.
   - Don't write tests — those come later.

## Deliverable

Output ONLY the TypeScript code block, nothing else. No prose
before or after (unless absolutely necessary for context). The
code will be saved verbatim to `tools/decompile/output/<demangled>.ts`.

## The chunk

Here is the disassembly + class context for this function. Use
the demangled name, class context table, and external calls to
guide your interpretation.