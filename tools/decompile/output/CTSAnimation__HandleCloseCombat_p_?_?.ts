/**
 * CTSAnimation::HandleCloseCombat — drives a melee close-combat
 * animation on `player` for `animId`. Picks the base animation
 * string via a 0x31-entry jump-table switch on (animId - 0xa);
 * for two special cases extends the string (one with a player
 * field, one with a hit-zone suffix chosen by an engine helper).
 * Asks GaitCloseCombat for the gait flag, then drives SetAnim
 * and writes back per-move timing fields on `this`.
 *
 * Demangled: `CTSAnimation::HandleCloseCombat(CBasePlayer*, int)`
 *
 * @param this    The CTSAnimation instance.
 * @param player  The CBasePlayer being animated.
 * @param animId  Close-combat move id (range 0xa..0x3a).
 * @returns void
 */
export function HandleCloseCombat(
  this: CTSAnimation,
  player: CBasePlayer,
  animId: number,
): void {
  // Local 16-byte stack buffer for the anim-name string. Each  // switch case loads7..15 bytes into [esp..esp+0x10]; two
  // cases append via strcat. In the TS port a JS string is
  // unbounded, so we just build a string.
  let animName = "";

  // ---- (1) Switch on (animId - 0xa) — 0x31-entry jump table ----
  // MSVC codegen: `cmp eax, 0x30; ja default; sub edx,
  // table[eax*4]; jmp edx`. Bounds: animId in [0xa, 0x3a].
  //
  // TODO(asm-ambiguous): the actual literal names are data-
  // section reads via `rep movs` / `mov [esp+...]` (offsets
  // GOT-0x6f411 .. GOT-0x6f52b). Without the strings dump
  // they cannot be reconstructed — placeholders below.
  switch (animId - 0xa) {
    case 0x00: animName = "cc_a00"; break;
    case 0x01: animName = "cc_a01"; break;
    case 0x02: animName = "cc_a02"; break;
    case 0x03: animName = "cc_a03"; break;
    case 0x04: animName = "cc_a04"; break;
    case 0x05: animName = "cc_a05"; break;
    case 0x06: animName = "cc_a06"; break;
    case 0x07: animName = "cc_a07"; break;
    case 0x08: animName = "cc_a08"; break;
    case 0x09: animName = "cc_a09"; break;
    case 0x0a: animName = "cc_a0a"; break;
    case 0x0b: animName = "cc_a0b"; break;
    case 0x0c: animName = "cc_a0c"; break;
    case 0x0d: animName = "cc_a0d"; break;
    case 0x0e: animName = "cc_a0e"; break;
    case 0x0f: animName = "cc_a0f"; break;
    case 0x10: animName = "cc_a10"; break;
    case 0x11: animName = "cc_a11"; break;
    case 0x12: animName = "cc_a12"; break;
    case 0x13: animName = "cc_a13"; break;
    case 0x14: animName = "cc_a14"; break;
    case 0x15: animName = "cc_a15"; break;
    case 0x16: animName = "cc_a16"; break;
    case 0x17: animName = "cc_a17"; break;
    case 0x18: animName = "cc_a18"; break;
    case 0x19: animName = "cc_a19"; break;
    case 0x1a: animName = "cc_a1a"; break;
    case 0x1b: animName = "cc_a1b"; break;
    case 0x1c: animName = "cc_a1c"; break;
    case 0x1d: animName = "cc_a1d"; break;
    case 0x1e: animName = "cc_a1e"; break;
    case 0x1f: animName = "cc_a1f"; break;
    case 0x20: animName = "cc_a20"; break;
    case 0x21: animName = "cc_a21"; break;
    case 0x22: animName = "cc_a22"; break;
    case 0x23: animName = "cc_a23"; break;
    case 0x24: animName = "cc_a24"; break;
    case 0x25: animName = "cc_a25"; break;
    case 0x26: animName = "cc_a26"; break;
    case 0x27: animName = "cc_a27"; break;
    case 0x28: animName = "cc_a28"; break;
    case 0x29: animName = "cc_a29"; break;
    case 0x2a: animName = "cc_a2a"; break;
    case 0x2b: animName = "cc_a2b"; break;
    case 0x2c: animName = "cc_a2c"; break;
    case 0x2d: animName = "cc_a2d"; break;
    case 0x2e: animName = "cc_a2e"; break;

    // Special: base 7-byte string (entry at 0x5dc60), then
    // strcat with a player field. Disassembly path:
    //   5dc60: lea esi, [ebx-0x6f411]; mov ecx, 0x1;
    //          rep movsd; movsw; movsb;          (copy 7 bytes)
    //   5dc7c: lea eax, [ebp+0xb58]; push eax;   (player field)
    //   5dc7d: lea eax, [esp+0xc]; push eax;
    //   5dc82: call strcat
    case 0x2f:
      animName = "cc_short";
      animName = animName + player.field0xb58; // strcat w/ player field
      break;

    // Special: model-override + hit-zone suffix (entry at 0x5dbb0).
    case 0x30: {
      // ---- (2a) Override anim-name based on the player's model ----
      // Two strncmp(player.modelName, literal, 3) tests; if neither
      // matches we keep a generic NPC variant. The literals live at
      // GOT-0x6f44e and GOT-0x6f43d (3-char prefixes).
      //
      // TODO(asm-ambiguous): exact prefixes — likely "bar"/"gma"/
      // "sci" (barney / gman / scientist) for TS-mob model
      // identities.
      const model = player.modelName; // offset 0x478 on CBasePlayer
      if (strncmp3(model, /* GOT-0x6f44e */ "???")) {
        animName = "cc_npc_a"; // GOT-0x6f44a
      } else if (strncmp3(model, /* GOT-0x6f43d */ "???")) {
        animName = "cc_npc_b"; // GOT-0x6f439
      } else {
        animName = "cc_npc_c"; // GOT-0x6f42d
      }

      // ---- (2b) Engine API → pick hit-zone suffix, strcat onto name ----
      // Inline-indirect call through the engine func table at
      // GOT+0x1aa8, slot 0x168, args (0, 1). Returns a flag;
      // based on it we pick one of two ~13-byte strings
      // (GOT-0x6b2ba / GOT-0x6b2a6) and append.
      //
      // TODO(asm-ambiguous): which engine func exactly — likely a
      // hit-location or sequence-lookup helper. The two chosen
      // strings are probably short hit-zone tags.
      const hitFlag = engineCall(/* slot */ 0x168, /* argA */ 0, /* argB */ 1);
      const hitTag =
        hitFlag !== 0
          ? /* GOT-0x6b2ba */ "hit_a"
          : /* GOT-0x6b2a6 */ "hit_b";
      animName = animName + hitTag;
      break;
    }

    default:
      // Many case entries `jmp 5dc8a` with no string copy at
      // all (e.g. entries at 0x5da08 / 0x5db3c / 0x5db54).
      // `animName` stays "".
      break;
  }

  // ---- (3) Ask GaitCloseCombat for the gait, derive flags ----
  // Disassembly:
  //   5dc8a:  mov    esi,0x10                 ; base flag = 0x10
  //   ... call GaitCloseCombat ...
  //   5dca3:  test   eax,eax
  //   5dca5:  je     5dcb0
  //   5dca7:  mov    esi,0x12                  ; gait ok  → esi = 0x12
  //   5dcae:  jmp    5dcb3
  //   5dcb0:  or     esi,0x4                   ; gait err → esi |= 0x4 (0x14)
  //   5dcb3:  or     esi,0x80                  ; both → esi |= 0x80
  //
  // Final flag values:
  //   gaitResult != 0 → 0x12 | 0x80 = 0x92
  //   gaitResult == 0 → 0x10 | 0x04 | 0x80 = 0x94
  //
  // The 0x10 base matters — it's a separate bit from 0x04 and
  // the previous TS simplified it away, producing0x84
  // instead of 0x94 on the failure path. Fixed below.
  const gaitResult = GaitCloseCombat(this, animId, player);
  let animFlags: number = 0x10; // matches `mov esi, 0x10` at 5dc8a
  if (gaitResult !== 0) {
    animFlags = 0x12;
  } else {
    animFlags |= 0x4;
  }
  animFlags |= 0x80;

  // TODO(asm-ambiguous): 0x10 / 0x12 / 0x04 / 0x80 — flag bit
  // semantics (AOSTATE / LOOP / HOLD / UPPERBODY / INTERP /
  // etc). Cross-reference with CTSAnimation::SetAnim /
  // ::Animate to decode.

  // ---- (4) Drive the animation on the player ----
  // SetAnim(this, player, animName, flags, capabilityMask=0).
  SetAnim(this, player, animName, animFlags, 0);

  // ---- (5) Refresh per-move timing fields on `this` ----
  // `[esp+0x80]` after SetAnim's pushes resolves back to
  // `this`. Three writes (in disassembly order):
  //   [this + 0x0c] = 2.0f      (0x40000000)
  //   [this + 0x08] = 3.0f      (0x40400000)
  //   [this + 0x1e8] = 0 (byte)
  // TODO: field names — likely m_flCloseCombatDur1 /
  // m_flCloseCombatDur2 / m_bCloseCombatBusy (0x1e8 byte is
  // a flag, not a timer).
  (this as any).field0x0c = 2.0;
  (this as any).field0x08 = 3.0;
  (this as any).field0x1e8 = 0;
}

// ---- Sibling methods + engine helpers (declared, not defined here) ----

declare function GaitCloseCombat(
  thisArg: CTSAnimation,
  animId: number,
  player: CBasePlayer,
): number;

declare function SetAnim(
  thisArg: CTSAnimation,
  player: CBasePlayer,
  animName: string,
  flags: number,
  capabilityMask: number,
): void;

// Inline-indirect call through the engine function table:
//   eax = *(GOT + 0x1aa8)            ; load engine fn table ptr
//   call *(eax + 0x168)              ; dispatch with args (0, 1)
declare function engineCall(slot: number, argA: number, argB: number): number;

// strncmp-style 3-byte prefix compare. Returns TRUE on EQUAL
// (i.e. true when raw strncmp returns 0). The disassembly
// uses `test eax, eax; jne next-test` so the equal-branch is
// the fall-through.
declare function strncmp3(a: string, b: string): boolean;

// ---- Minimal type stubs (full layout is D.4 / a separate task) ----

interface CTSAnimation {
  field0x08: number; // float — close-combat duration A (default 3.0)
  field0x0c: number; // float — close-combat duration B (default 2.0)
  field0x1e8: number; // byte — close-combat busy flag
}

interface CBasePlayer {
  modelName: string; // offset 0x478  field0xb58: string; // offset 0xb58 — unidentified, used by strcat
}
