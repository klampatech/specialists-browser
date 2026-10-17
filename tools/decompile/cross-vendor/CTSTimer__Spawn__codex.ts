```typescript
/**
 * CTSTimer::Spawn — initializes the timer entity on spawn.
 *
 * Sets the entity classname to "ts_timer", marks the entity as a
 * server object (FL_OBJECT), initializes a pair of pev timing
 * fields, zeros the CTSTimer state fields, and either arms the
 * timer immediately (via ToggleTimer) or leaves it dormant based
 * on spawnflags bit 0.
 *
 * @param this  The CTSTimer entity instance (this in the original C++)
 * @returns     void
 */
export function Spawn(this: CTSTimer): void {
  // Set the entity classname via the engine's string pool.
  // The original C++ uses MAKE_STRING, which converts a static
  // string pointer to an offset into the engine's string table.
  // The PIC base ebx is used to resolve a global pointer that
  // participates in the STRING_OFFSET conversion.
  // TODO(asm-ambiguous): the indirect [ebx+0x1600] → [eax] → [edx+0x98]
  // chain is collapsed into a single MAKE_STRING call here.
  this.pev.classname = MAKE_STRING("ts_timer");

  // Mark as a server-only object (FL_OBJECT = 0x80).
  this.pev.flags |= 0x80;

  // Initialize two pev fields at offsets 0x108 and 0x10c.
  // The first is set to 5, the second to 0.
  // TODO: pev offsets 0x108 / 0x10c meaning unclear in this build
  // — they don't cleanly map to standard HL1 entvars_s fields.
  this.pev.field_0x108 = 5;
  this.pev.field_0x10c = 0;

  // Initialize CTSTimer-specific state fields:
  //   byte  at offset 0x68 — small state byte (active flag, etc.)
  //   dword at offset 0x14 — likely the configured duration
  //   dword at offset 0x18 — likely the elapsed/remaining time
  // TODO: CTSTimer field names at offsets 0x68 / 0x14 / 0x18 not
  // confirmed by decompile cross-reference.
  this.m_bStarted = 0;
  this.m_flDuration = 0;
  this.m_flWait = 0;

  // Branch on spawnflags bit 0:
  //   set   → leave the timer dormant (start/end fields zeroed)
  //   unset → call ToggleTimer() to arm the timer immediately
  if (this.pev.spawnflags & 1) {
    this.m_flStartTime = 0;
    this.m_flEndTime = 0;
  } else {
    this.ToggleTimer();
  }
}
```
