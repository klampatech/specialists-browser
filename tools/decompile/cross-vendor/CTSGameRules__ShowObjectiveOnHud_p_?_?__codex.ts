```typescript
/**
 * CTSGameRules::ShowObjectiveOnHud — broadcast an objective's HUD show/hide state to clients.
 *
 * Resolves the objective's wire index via FindIndexByObjective(), then sends a
 * user message carrying that index and a normalized 0/1 show flag.
 *
 * @param this       The CTSGameRules game-rules singleton.
 * @param pObjective The objective to show or hide on the client HUD.
 * @param bShow      true → show the objective, false → hide it.
 * @returns          void
 */
export function ShowObjectiveOnHud(
  this: CTSGameRules,
  pObjective: CTSObjective,
  bShow: boolean,
): void {
  // Resolve the objective's wire index for the client-side objective table.
  const index: number = this.FindIndexByObjective(pObjective);

  // Begin a user message: (msgType=0x2, msgId, pOrigin=NULL, pEdict=NULL),
  // then WriteShort(index), WriteByte(bShow ? 1 : 0), End().
  //
  // TODO(asm-ambiguous): the GOT globals at [ebx+0x1884] and [ebx+0x1aa8]
  //   resolve to (a) the current user-message id (e.g. gmsgShowObjective,
  //   dereferenced once before being pushed) and (b) a message-buffer
  //   vtable object whose methods at +0xb8 (Begin), +0xc0 (WriteShort /
  //   WriteByte), and +0xbc (End) we invoke below.
  // TODO(asm-ambiguous): 0x2 is one of the engine's MSG_* msg-type
  //   constants (likely MSG_ONE / MSG_ALL) — confirm against the engine enum.
  const msgBuffer: any = null;
  const msgId: number = 0;
  msgBuffer.Begin(0x2, msgId, null, null);

  // WriteShort(index): the asm reuses the top stack slot (which originally
  // held the msgType literal) as the WriteShort arg, overwriting it with
  // `index` via `mov [esp], edi` before invoking WriteShort.
  msgBuffer.WriteShort(index);

  // Normalize bShow to 0/1 (`mov eax,0; cmp BYTE PTR [...],0; setne al`)
  // and call WriteByte.
  msgBuffer.WriteByte(bShow ? 1 : 0);

  // End the message.
  msgBuffer.End();
}
```
