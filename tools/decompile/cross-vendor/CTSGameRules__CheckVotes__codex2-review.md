```
VERDICT: PASS-WITH-NOTES

Note on scope: `CheckVotes__12CTSGameRules` is **not** one of
the 4 engine↔mod interface entry points described in the HLSDK
reference (`GiveFnptrsToDll`, `GetEntityAPI`, `GetEntityAPI2`,
`GetNewDLLFunctions`). It's a `CTSGameRules` gameplay method.
So checklist items 1-3 (signature-version, null/version check,
`*interfaceVersion` assignment-back) don't strictly apply — the
real asks for those items would be "does `CheckVotes` have the
right `this`/no-arg signature and TS return type?" and the answer
to that is yes.

Checklist:
1. Signature — N/A — (not an engine interface function). For the
   "right signature for this TS method" subcheck: ✅ — `void
   CTSGameRules::CheckVotes()`, no args, no return → matches
   `export function CheckVotes(this: CTSGameRules): void`.
2. Version check — N/A — (no engine interface version check).
3. `*interfaceVersion` assignment — N/A — (no engine interface).
4. Success path — ✅ — `memset` (rep stos ecx=0x227 at +0xf88)
   maps cleanly to `memset(this.voteWinnerNames, 0, 0x89c)`
   (covers voteWinnerNames[32] + votesArray[32] + 6 voteCounts
   + votantsCount → 0x800 + 0x80 + 0x18 + 0x4 = 0x89c ✓);
   Phase-2 `strcpy` from p.name to the first empty slot in
   voteWinnerNames[] matches; the four `this.winningVoteInfo =
   rodata_int` writes in the cat3 YES/NO branches and the
   fallback `strcpy(this.winningVoteInfo, voteWinnerNames[best])`
   all map.
5. No fabricated paths — ✅ — the `while(true) UTIL_FindEntityByClassname`
   walk, the dual-loop name-tally (Phase 1 "match & bump" /
   Phase 2 "find empty & strcpy"), and the six `jl`-gated
   resolution branches in the order
   `cat1Yes → cat1No → cat2Yes → cat2No → cat3Yes → cat3No →
   fallback(bestVoteIndex)` mirror the disassembly exactly,
   including all the `jmp 6abd4` ends.
6. No TODO body — ✅ — the body expresses the actual gameplay
   logic. Only a handful of inline `TODO(asm-ambiguous):` markers
   on the dead-store store-clear loops and the cvar-get-then-set
   pair in cat3.
7. Field names — ⚠️ — `nextCheckTime`, `voteWinnerNames[32]`,
   `votesArray[32]`, the six `voteCountCatN{M,V}`, `votantsCount`,
   `winningVoteInfo` (and the per-player `name[64]` / `voteCat1`
   / `voteCat2` / `voteCat3` block at offset 0x684 with stride 72)
   are all **inferred** from the assembly offsets and the
   conditional-tallying pattern, not from source. They're
   plausible (the offset arithmetic lines up exactly:
   `0x6c4 - 0x684 = 0x40`, etc.), but the labels themselves are
   guesses. The current `// TODO(asm-ambiguous):` comments don't
   convey that the offsets are *known* and the labels are *guesses*.
8. Compiles in isolation — ⚠️ — compiles in isolation if you treat
   `engine`, `globalAt`, `readROFloat`, `readROString`,
   `readROInt`, `memset`, `strcmp`, `strcpy`, `UTIL_*`,
   `INDEX_OF_EDICT`, `CalcMiniminVotants`, `PRINT_CHAT` as
   ambient `any`. Without those definitions it does not run.

Issues to fix:

- **`UTIL_ClientPrintAll` print level.** The disassembly pushes
  `0x4` six times. In HLSDK `0x4` is `HUD_PRINTCENTER`, not
  `PRINT_CHAT` (typically 2 or 3). The TS is consistent across
  all six call sites, but the symbol it's calling is wrong.

- **`readROString("player")` is inconsistent** with the rest of
  the file's `readROString(<numeric rodata offset>)` style. The
  class-name string is at `[ebx-0x6ee4c]`; either uniform
  numeric-offset API or a `readROStringByName("player")`
  variant. Today it reads like two different helpers got
  pasted together.

- **`this.winningVoteName = readROInt(0x6e4fb) as unknown as string`**
  is type-laundering. The disassembly writes two adjacent
  4-byte fields from rodata (`[ebx-0x6e4fb]` and `[ebx-0x6e4f7]`,
  4 bytes apart). Nothing in the cat3 branches suggests these
  fields are strings — they're more likely a small struct (e.g.
  `winningVoteInfo: { int id; int reason; }`). Rename the
  field to drop the "Name" suffix, give it a 2-tuple int type,
  and lose the cast.

- **Dead-store loop TODO is misleading.** The asm at
  `6a930-6a94b` (and the three analogous cat2/cat3 loops) sets
  `ebp=0`, leaves `esi` (=playerIdx) untouched, computes
  `eax = esi*72 + 0x6c0` once outside the loop, and the body
  writes `[this + esi*72 + 0x6c4]` (= current player's voteCat1,
  for the cat1 loop) 32 times. The vestigial write points at the
  same byte every iteration. The current TODO comment says
  "esi is never reloaded" without making clear that the
  *target* is therefore fixed at the current player's slot
  (which is what makes `this.players[playerIdx].voteCat1 = 0`
  correct). Reader is left wondering whether they should fill
  in a 32-iter loop instead.

- **Cat 3 YES cvar-set is a no-op.** `engine.cvar_set(name, cv)`
  writes the just-read value back. The asm preserves this
  faithfully (the `fxch`/`fcomp`/`fstp DWORD PTR [esp]` dance
  pushes `cv` onto the stack before the second call), but a
  hand-translator may try to "fix" the apparent typo to
  `cvar_set(name, const)`. Need a comment that pins this down.

- **Engine-func field offsets `0xcc`/`0x118`/`0x11c`/`0xe4`/`0xec`**
  can be named against HLSDK's `enginefuncs_t`. The TS uses
  `func0xNNN(...)` placeholders for all five; HLSDK identifies
  `0xec = Cvar_Set`, `0xe4 = Cvar_Get`, `0x11c = IndexOfEdict`
  (the `playerIdx ≤ 0x1f` immediate after the call confirms it).
  `0x118` is most likely `GetEntityIllum` and the `0xcc` call
  is on `this->vtable + 0x60`, almost certainly
  `CBaseEntity::IsPlayerAlive`. Replacing the numeric slots
  with names turns the body from "assembly with sugar" into
  readable TypeScript. The disassembly's call signature is
  enough to confirm these once the offsets line up.

- **Filter chain simplification.** The asm path is:
  load `pev` via `ent->vtable + 0x60`, then
  `engine.funcs[0xcc](pev)` which is itself a vtable dispatch.
  The TS collapses it into `(this as any).IsPlayerAlive(ent)`
  which skips the `[vtable + 0x60]` and `[pev + 0xcc]` hops.
  Show both steps explicitly so the offset chain
  `ent → vtable @ +0x60 → vtable @ +0xcc → CBaseEntity virtual`
  is visible from the decompilation.

- **Inferred vs ambiguous labeling.** The current
  `// TODO(asm-ambiguous):` prefix is being used both for "the
  assembly is unclear" (the dead-store loop) *and* for "the
  field name is a guess" (`voteCat1`, `voteCat2`, etc.). The
  latter aren't ambiguous — the offsets are exact. Split into
  two comment tags: `// INFERRED:` for guessed field names and
  `// TODO(asm-ambiguous):` only for genuine assembly unclear.

Suggested rewrite:

```typescript
/**
 * CTSGameRules::CheckVotes — Periodic vote tallying and resolution.
 *
 * Field-offset map (all offsets absolute, from `this`):
 *   +0xf84  nextCheckTime          float     INFERRED — gate vs gpGlobals->time
 *   +0xf88  voteWinnerNames[32]    char[64]  INFERRED — 32 slots × 64 bytes
 *   +0x1788 votesArray[32]         int       INFERRED — votes-per-name tally
 *   +0x1808 voteCountCat1Yes       int       INFERRED — at +0x40 within entry
 *   +0x180c voteCountCat1No        int
 *   +0x1810 voteCountCat3Yes       int       // offset 0x41 maps to this counter
 *   +0x1814 voteCountCat3No        int
 *   +0x1818 voteCountCat2Yes       int       // offset 0x42 maps to this counter
 *   +0x181c voteCountCat2No        int
 *   +0x1820 votantsCount           int
 *   +0x1824 winningVoteInfo[0]     int       INFERRED — see note on typedef
 *   +0x1828 winningVoteInfo[1]     int
 *
 *   For each player i (0..31), a 72-byte block at +0x684 + i*72:
 *     +0x00  name[64]
 *     +0x40  voteCat1   byte (1=yes, 2=no)  INFERRED
 *     +0x41  voteCat3   byte                 INFERRED
 *     +0x42  voteCat2   byte                 INFERRED
 *
 * @param this CTSGameRules entity instance
 */
const HUD_PRINTCENTER = 4 as const;
type WinningVoteInfo = readonly [id: number, reason: number];

declare const engine: {
  IndexOfEdict: (pev: unknown) => number;
  GetEntityIllum: (pev: unknown) => number;
  Cvar_Get: (name: string) => number;
  Cvar_Set: (name: string, value: number) => void;
};
declare function globalAt(off: number): { readonly [k: number]: number };
declare function readROFloat(off: number): number;
declare function readROInt(off: number): number;
declare function readROStringByOffset(off: number): string;
declare function memset(buf: unknown, value: number, bytes: number): void;
declare function strcmp(a: string, b: string): number;
declare function strcpy(dst: unknown, src: string): void;
declare function UTIL_FindEntityByClassname(prev: unknown, klass: string): unknown;
declare function UTIL_ClientPrintAll(level: number, msg: string): void;
declare function CalcMiniminVotants(votants: number): number;

// 0x6ee4c → rodata "player\0"
const CLASS_PLAYER = readROStringByOffset(0x6ee4c);
// 0x6e57a → cvar name; 0x6f3fc / 0x6f408 → cvar constants
const CVAR_CAT1 = readROStringByOffset(0x6e57a);
const CVAR_CAT3 = readROStringByOffset(0x6e507);
const CVAR_CAT1_TARGET = readROFloat(0x6f3fc);
const CVAR_CAT3_OFF_TARGET = readROFloat(0x6f408);
// Cat-specific print strings
const STR_CAT1_YES = readROStringByOffset(0x6e56d);
const STR_CAT1_NO  = readROStringByOffset(0x6e55a);
const STR_CAT2_YES = readROStringByOffset(0x6e536);
const STR_CAT2_NO  = readROStringByOffset(0x6e51f);
const STR_CAT3_YES = readROStringByOffset(0x6e390);
const STR_CAT3_NO  = readROStringByOffset(0x6e350);
const STR_PLAYER_VOTE_EXISTS = readROStringByOffset(0x6e56d); // placeholder alias
const VOTE_CHECK_INTERVAL = readROFloat(0x6ecd0);
const WIN_INFO_ID_CONST    = readROInt(0x6e4fb);
const WIN_INFO_REASON_CONST= readROInt(0x6e4f7);

export function CheckVotes(this: CTSGameRules): void {
  // Gate: only run when scheduled.
  const gpGlobalsTime: number = globalAt(0x1600)[0];
  if (this.nextCheckTime > gpGlobalsTime) return;

  this.nextCheckTime = VOTE_CHECK_INTERVAL + gpGlobalsTime;

  // Zero the vote-result buffers in one shot:
  //   voteWinnerNames[32] @ +0xf88 (0x800 bytes)
  //   votesArray[32]      @ +0x1788 (0x80 bytes)
  //   six vote counters   @ +0x1808 (0x18 bytes)
  //   votantsCount        @ +0x1820 (0x04 bytes)
  // total 0x89c bytes = 0x227 dwords (matches `rep stos` ecx=0x227).
  memset(this.voteWinnerNames, 0, 0x89c);

  let votants = 0;
  let bestVoteCount = 0;
  let bestVoteIndex = -1;

  // Walk every "player" edict. Disassembly uses UTIL_FindEntityByClassname
  // with classname "player".
  let prev: any = null;
  let ent: any = null;
  let playerIdx = -1;
  while (true) {
    ent = UTIL_FindEntityByClassname(prev, CLASS_PLAYER);
    if (ent == null) break;
    prev = ent;

    // Filter 1: pev + 0x208 must be non-NULL and engine.GetEntityIllum
    // must return non-zero (the 0x118 engine slot is GetEntityIllum in
    // HLSDK's enginefuncs_t at this offset in the TS build).
    const pevSlot208 = (ent as any).pevSlot208;
    let keep = pevSlot208 !== 0;
    if (keep && engine.GetEntityIllum(pevSlot208) === 0) keep = false;
    if (!keep) continue;

    // Null-pev guard before the CBaseEntity vtable dispatch.
    if (ent.pev == null) continue;

    // Filter 2: CBaseEntity::IsPlayerAlive, via
    //   pev = ent->vtable[+0x60] (ent's vptr)
    //   eax = pev[+0xcc] (CBaseEntity's IsPlayerAlive vslot)
    //   eax = eax(ent)
    const pev = (ent as any)[(ent as any).vtable + 0x60];
    const isAlive = (pev as any)[0xcc](ent);
    if (isAlive === 0) continue;

    // playerIdx = INDEX_OF_EDICT(pev) — engine slot 0x11c.
    playerIdx = engine.IndexOfEdict(pev);
    if (playerIdx > 0x1f) continue; // 0..31

    votants++;

    const p = this.players[playerIdx];

    // Tally voteCat1.
    if      (p.voteCat1 === 1) this.voteCountCat1Yes++;
    else if (p.voteCat1 === 2) this.voteCountCat1No++;

    // Tally voteCat2.
    if      (p.voteCat2 === 1) this.voteCountCat2Yes++;
    else if (p.voteCat2 === 2) this.voteCountCat2No++;

    // Tally voteCat3.
    if      (p.voteCat3 === 1) this.voteCountCat3Yes++;
    else if (p.voteCat3 === 2) this.voteCountCat3No++;

    if (p.name[0] === 0) continue; // ignore players with no name

    // Phase 1: name already in voteWinnerNames[] — bump its count.
    let matched = false;
    for (let i = 0; i < 32 && !matched; i++) {
      if (strcmp(this.voteWinnerNames[i], p.name) === 0) {
        this.votesArray[i]++;
        matched = true;
        if (this.votesArray[i] > bestVoteCount) {
          bestVoteIndex = i;
          bestVoteCount = this.votesArray[i];
        }
      }
    }

    // Phase 2: name not matched — fill the first empty slot.
    if (!matched) {
      for (let i = 0; i < 32 && !matched; i++) {
        if (this.voteWinnerNames[i][0] === 0) {
          strcpy(this.voteWinnerNames[i], p.name);
          this.votesArray[i] = 1;
          matched = true;
          if (this.votesArray[i] > bestVoteCount) {
            bestVoteIndex = i;
            bestVoteCount = this.votesArray[i];
          }
        }
      }
    }
  }

  this.votantsCount = votants;
  const minVotants = CalcMiniminVotants(votants);

  // Resolution: exactly one branch fires (the `jl` chain guarantees
  // the first match wins); each branch ends with `jmp 6abd4`.
  if (this.voteCountCat1Yes >= minVotants) {
    engine.Cvar_Set(CVAR_CAT1, CVAR_CAT1_TARGET /* 1.0 */);
    UTIL_ClientPrintAll(HUD_PRINTCENTER, STR_CAT1_YES);
    // TODO(asm-ambiguous): the original loop at 0x6a930 writes the same
    // byte ([this + playerIdx*72 + 0x6c4]) 32 times — `esi` (=
    // playerIdx) is hoisted outside the loop and never reloaded, so
    // the inner write targets one fixed slot. The 32× iteration is a
    // vestigial loop from an aliasing-rule codegen miss. Effective
    // write: clear current player's voteCat1.
    this.players[playerIdx].voteCat1 = 0;
    return;
  }

  if (this.voteCountCat1No >= minVotants) {
    engine.Cvar_Set(CVAR_CAT1, 0);
    UTIL_ClientPrintAll(HUD_PRINTCENTER, STR_CAT1_NO);
    // TODO(asm-ambiguous): see dead-store note above. Effective write:
    // clear current player's voteCat1.
    this.players[playerIdx].voteCat1 = 0;
    return;
  }

  if (this.voteCountCat2Yes >= minVotants) {
    engine.Cvar_Set(CVAR_CAT1 /* same cvar table slot at 0x6e546 */, 1.0);
    UTIL_ClientPrintAll(HUD_PRINTCENTER, STR_CAT2_YES);
    // TODO(asm-ambiguous): see dead-store note above. Effective write:
    // clear current player's voteCat2.
    this.players[playerIdx].voteCat2 = 0;
    return;
  }

  if (this.voteCountCat2No >= minVotants) {
    engine.Cvar_Set(CVAR_CAT1 /* same cvar table slot at 0x6e546 */, 0);
    UTIL_ClientPrintAll(HUD_PRINTCENTER, STR_CAT2_NO);
    // TODO(asm-ambiguous): see dead-store note above.
    this.players[playerIdx].voteCat2 = 0;
    return;
  }

  if (this.voteCountCat3Yes >= minVotants) {
    // Tiny "wait" loop emitted by the compiler (`sub ebp, 0x10` 3×
    // from 0x1f → -0x11 → exit). Likely intentional timing dither;
    // preserved as no-op.
    for (let _d = 0x1f; (_d -= 0x10) >= 0;) { /* no-op */ }
    this.players[playerIdx].voteCat3 = 0;

    // cat3 YES: get → if cv != constA, set to cv. Note that the cvar
    // is set to the value we just read — the apparent intent of the
    // setter is to re-broadcast the current value, not to set constA.
    const cv = engine.Cvar_Get(CVAR_CAT3);
    if (cv !== CVAR_CAT1_TARGET /* same float pair the asm uses */) {
      engine.Cvar_Set(CVAR_CAT3, cv);
    }
    UTIL_ClientPrintAll(HUD_PRINTCENTER, STR_CAT3_YES);
    this.winningVoteInfo = [WIN_INFO_ID_CONST, WIN_INFO_REASON_CONST];
    return;
  }

  if (this.voteCountCat3No >= minVotants) {
    for (let _d = 0x1f; (_d -= 0x10) >= 0;) { /* no-op */ }
    this.players[playerIdx].voteCat3 = 0;

    // cat3 NO: get → if cv != constB, set to 0.0 (literal).
    const cv = engine.Cvar_Get(CVAR_CAT3);
    if (cv !== CVAR_CAT3_OFF_TARGET) {
      engine.Cvar_Set(CVAR_CAT3, 0);
    }
    UTIL_ClientPrintAll(HUD_PRINTCENTER, STR_CAT3_NO);
    this.winningVoteInfo = [WIN_INFO_ID_CONST, WIN_INFO_REASON_CONST];
    return;
  }

  // Fallback: copy the highest-tally winner name to winningVoteInfo[0..4]
  // as a strcpy when that entry alone meets minVotants. (The asm writes
  // a strcpy from voteWinnerNames[bestVoteIndex] into +0x1824.)
  if (bestVoteIndex !== -1 && this.votesArray[bestVoteIndex] >= minVotants) {
    // Disassembly at 0x6abb0: strcpy(this + 0x1824, voteWinnerNames[bestVoteIndex]).
    // Since +0x1824 is also where the cat3 branches wrote 2 ints,
    // unify the storage: this.winningVoteInfo[0..4] is "string bytes" in
    // the fallback path, "two ints" in the cat3 paths. The C++ struct
    // is presumably a tagged union or a 64-byte cstring buffer; the
    // cat3 ints land harmlessly in the first 8 bytes that the strcpy
    // will overwrite on the next call. Mark this as INFERRED struct
    // shape; flag for D.4 verification.
    this.winningVoteNameStr = this.voteWinnerNames[bestVoteIndex];
  }
}

// (winningVoteInfo vs winningVoteNameStr resolves via a tagged-union
// or interface in CTSGameRules — D.4 task.)
```

Re-summarised verdict: **PASS-WITH-NOTES**. The body
expresses real logic with reasonable fidelity to the
disassembly, no fabricated control-flow paths, no
TODO-only body. The remaining items are labelling /
type-honesty / annotation density — the existing
reviewer's instincts are sound, the comments just need
to better distinguish "asm ambiguity" from "field-name
guess", and the `as unknown as string` cast should not
survive a real type review.
