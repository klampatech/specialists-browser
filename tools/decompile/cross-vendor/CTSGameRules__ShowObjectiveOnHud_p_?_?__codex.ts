The shell is unresponsive so I'll work from the disassembly + project rules directly. Here's my read of the chunk:

**Calling convention.** After `push edi; push esi; push ebx` (12 B of callee-saves) and `sub esp, 0x8` (8 B of locals), `[esp+0x18]` holds the first caller-pushed arg and `[esp+0x1c]` holds the second. The eventual `cmp BYTE PTR [esp+0x24]` lands exactly on the second caller arg, confirming the second arg is a `bool` and the first is the `CTSObjective*` — i.e. **MSVC `__thiscall`, `this` in ECX**.

**The two pushes of `[esp+0x1c]`.** That's the *bool*, not the pointer — odd shape, almost certainly a compiler artifact around calling `FindIndexByObjective`. The effective behavior is `this->FindIndexByObjective(pObjective) → index`.

**The rest is classic HL1 message-burst.** `MESSAGE_BEGIN(MSG_ONE=2, *pPlayer, 0, 0)` → `WRITE_BYTE(index)` → `WRITE_BYTE(show ? 1 : 0)` → `MESSAGE_END()`, with the engine dispatcher's vtable resolved from `[ebx+0x1aa8]` and the player handle from `[ebx+0x1884]`.

```typescript
/**
 * CTSGameRules::ShowObjectiveOnHud — emit a HUD-update message to the
 * local player to show or hide the given objective's indicator.
 *
 * Sequence: look up the objective's slot index, then write a 2-byte
 * payload (slot index, show flag) to the client via the engine's
 * message API (begin → write byte → write byte → end).
 *
 * @param this       The CTSGameRules game-rules singleton
 * @param pObjective The objective whose HUD state to update
 * @param show       true = show on HUD, false = hide
 * @returns          void
 */
export function ShowObjectiveOnHud(
  this: CTSGameRules,
  pObjective: CTSObjective,
  show: boolean,
): void {
  // 1. Resolve the objective's slot index.
  // TODO(asm-ambiguous): the asm pushes [esp+0x1c] (the bool arg) twice
  // before calling FindIndexByObjective — likely a __thiscall callee
  // with `this` in ECX and `pObjective` passed via a register, but the
  // chunk doesn't make the second arg explicit. Behavior: returns index.
  const index: number = this.FindIndexByObjective(pObjective);

  // 2. Globals via the PIC/GOT base in ebx.
  //    [ebx + 0x1884] -> handle for the local player (recipient).
  //    [ebx + 0x1aa8] -> engine / message-dispatcher vtable.
  // TODO: confirm names against tools/decompile/analysis/strings-n5.txt.
  const pPlayer = GOT_0x1884;        // TODO: real symbol
  const pEngine = GOT_0x1aa8;        // TODO: real symbol

  // 3. Begin a MSG_ONE (msgtype = 2) message targeting *pPlayer, origin (0, 0).
  //    pfnMessageBegin analog lives at vtable + 0xb8.
  pEngine.vtable[0xb8](2, pPlayer[0], 0, 0);

  // 4. Write the objective index as the first payload byte.
  //    pfnWriteByte analog lives at vtable + 0xc0.
  pEngine.vtable[0xc0](index);

  // 5. Write the show/hide flag (1 = show, 0 = hide) as the second byte.
  pEngine.vtable[0xc0](show ? 1 : 0);

  // 6. End the message. pfnMessageEnd analog lives at vtable + 0xbc.
  pEngine.vtable[0xbc]();
}
```
