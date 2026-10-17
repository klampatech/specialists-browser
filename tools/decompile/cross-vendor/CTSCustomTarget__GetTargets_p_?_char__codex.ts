```typescript
/**
 * CTSCustomTarget::GetTargets — split a targetname string into an
 * inline list of up to 64 entries (32-byte slots each) and record the
 * parsed count on the entity.
 *
 * @param this         The CTSCustomTarget entity
 * @param targetName   Source targetname string (space-separated tokens)
 * @returns            void
 */
export function GetTargets(
  this: CTSCustomTarget,
  targetName: string
): void {
  const MAX_TARGETS = 64;
  const SLOT_BYTES = 32;

  // 1) Clear the 64-slot inline buffer at this+0x64 (asm emits a
  //    rep stos that zeros 0x200 DWORDs = 0x800 bytes) and reset
  //    the parsed-count field at this+0x864.
  // TODO(asm-ambiguous): field offsets inferred from the clear +
  //       shl-5 stride below; solidify against the class layout.
  this.m_Targets.fill(0);
  this.m_iNumTargets = 0;

  // 2) Tokenize. strtok mutates its first arg, so the asm first
  //    copies targetName into the 0x80c-byte local stack frame;
  //    we elide that copy here.
  // TODO(asm-ambiguous): the strtok delimiter is loaded from
  //       [ebx - 0x6ed73] — a single byte from the GOT-relative
  //       range. Most likely " " (single space). Verify against
  //       tools/decompile/analysis/strings-n5.txt.
  const delim = " ";

  let token = strtok(targetName, delim);

  // 3) Pull tokens until strtok returns null/empty or we hit 64
  //    entries (asm loop test: cmp counter, 0x3f; jle back-edge).
  while (
    token !== null &&
    token !== "" &&
    this.m_iNumTargets < MAX_TARGETS
  ) {
    // strcpy the token into the next 32-byte slot — unbounded copy.
    // A targetname >31 chars will overrun into the following slot.
    // TODO(asm-ambiguous): original C++ used strcpy, not strncpy.
    strcpy(this.m_Targets, this.m_iNumTargets * SLOT_BYTES, token);
    this.m_iNumTargets++;
    token = strtok(null, delim);
  }
}

// --- libc shims, bound through the project's HL1 runtime layer. ---
declare function strtok(s: string | null, delim: string): string | null;
declare function strcpy(
  dst: Uint8Array,
  dstOffset: number,
  src: string
): void;
```
