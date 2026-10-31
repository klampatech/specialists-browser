/**
 * admin — the ban endpoint, and the reason it cannot ban.
 *
 * THE BAN IS A STUB, ON PURPOSE
 * -----------------------------
 * Kyle's call (2026-10-31): *"stub this in the admin console for
 * now and spec / build it out separately."* So the endpoint exists,
 * the request shape is fixed, and the answer is always the same
 * refusal — the UI never has to move when the ban becomes real.
 *
 * WHY IT CANNOT BAN
 * -----------------
 * The engine's ban key is the **uniqueid**, and every browser client
 * on an instance shares ONE (§2.5). So `banid <minutes> <uniqueid>
 * kick` does not remove a cheater — it removes everybody in the
 * browser. The per-player identity does not exist yet: FEAT-004 (the
 * site issues an account id) and FEAT-005 (the bridge stamps it and
 * refuses banned accounts at the door).
 *
 * AND IT MUST NOT FALL BACK TO AN IP BAN
 * --------------------------------------
 * Every browser player reaches the game server through the bridge
 * from the SAME address, so an IP ban is the fleet-wide action
 * wearing a per-player tool's clothes. An IP fallback would be
 * worse than no ban at all, and it would look like it worked.
 *
 * THE FOUR INVARIANTS
 * -------------------
 *   1. It NEVER returns success. No `done`, no `no_output` — only
 *      501.
 *   2. It NEVER touches the engine. No `banid`, no `addip`, nothing
 *      — not even a read of the fleet.
 *   3. `banned` is ALWAYS false, so a client that ignores the
 *      status code still cannot conclude that a ban happened.
 *   4. The reason names the blocker AND where it is specified, so
 *      an operator who hits it learns what to do next instead of
 *      concluding the console is broken.
 *
 * THE CAPABILITY FLAG
 * -------------------
 * The UI renders the ban affordance from `GET /admin/session` →
 * `{"capabilities": {"ban": false}}` (§5.1). When FEAT-004 lands,
 * the server flips the flag to `true` and the button enables — one
 * flag, no UI change, because the request and response shapes are
 * already fixed.
 */

/** The error code the stub answers with. */
export const BAN_ERROR = 'ban_unavailable';

/** Why the ban cannot happen, and what it would remove. */
export const BAN_REASON =
  'Banning one player needs a per-browser identity. Today every ' +
  'browser client on an instance shares one uniqueid, so banning it ' +
  'would remove everyone.';

/** What has to land before the ban is real. */
export const BAN_REQUIRES =
  'FEAT-004/FEAT-005 — the bridge-stamped id (anti-cheat plan, Phases 5-6)';

/** Where the ban is specified. */
export const BAN_SPEC = 'docs/ADMIN-CONSOLE.md §2.5';

/**
 * The body the stub answers with.
 *
 * A fresh object every time, so a caller that mutates it cannot
 * change what the next caller gets.
 *
 * @returns {{error: string, reason: string, requires: string, spec: string, banned: boolean}}
 */
export function banUnavailableBody() {
  return {
    error: BAN_ERROR,
    reason: BAN_REASON,
    requires: BAN_REQUIRES,
    spec: BAN_SPEC,
    banned: false,
  };
}

/**
 * What the console can do, as the UI sees it.
 *
 * One flag today. It flips when the identity lands, and nothing
 * else in the console changes.
 *
 * @returns {{ban: boolean}}
 */
export function banCapabilities() {
  return { ban: false };
}
