/**
 * The pre-join identity modal.
 *
 * WHY THIS EXISTS (2026-10-28)
 * ---------------------------
 * PLAY and Join no longer connect to the server. They open a modal
 * first — the player picks the name they play under and the character
 * they spawn as — and the launch happens after they confirm.
 *
 * The deploy's own browser gate was written for the old flow. It
 * clicked PLAY and waited for the server's handshake, and with the
 * modal in the way the handshake never came. The gate failed on a
 * perfectly good game — the deploy went red, the run read as a broken
 * release, and the player-facing flow was fine the whole time.
 *
 * That is the failure this file prevents: a gate that asserts a flow
 * the player no longer takes measures nothing, and it breaks the one
 * time it is needed.
 *
 * The modal is not an obstacle to the test. It IS the flow now. The
 * test drives it the way a player does: type a name, confirm.
 *
 * WHERE THE MODAL LIVES
 * ---------------------
 *   webxash/src/components/PlayerIdentityModal.vue
 *     .ident           the dialog
 *     .ident__input    the name field
 *     .ident__model    one button per character (TS's seven)
 *     .ident__btn--go  the confirm button ("Join as <name>")
 *
 * The confirm button's LABEL also contains the word "Join", which is
 * worth knowing: a test that finds a button by its text ("/join/i")
 * can find the MODAL's button instead of the landing page's. Select by
 * class, not by text.
 */

/**
 * Wait for the identity modal, answer it, and wait for the launch to
 * start (the dialog leaves the DOM when the player confirms).
 *
 * @param {import('playwright').Page} page
 * @param {string} name          the name to play under. The server logs
 *                                it, and an empty one is refused.
 * @param {object} [opts]
 * @param {number} [opts.timeout]        how long to wait, ms
 * @param {boolean} [opts.required]       true fails when the modal never
 *                                        appears; false (the default)
 *                                        reports it and returns, so the
 *                                        caller's own retry loop decides
 *                                        what to do about it.
 * @returns {Promise<{appeared: boolean, confirmed: boolean}>}
 */
async function confirmIdentity(page, name, opts = {}) {
  const timeout = opts.timeout || 30_000;
  const required = opts.required === true;

  let appeared = false;
  try {
    await page.waitForSelector('.ident', { timeout });
    appeared = true;
  } catch (e) {
    if (required) {
      throw new Error(
        'the pre-join identity modal never appeared: ' + String(e).slice(0, 160)
      );
    }
    return { appeared: false, confirmed: false };
  }

  // A name, because the server logs it and the launch carries it as
  // `+setinfo name`, so the server learns it on the CONNECT.
  await page.fill('.ident__input', name);

  // The character: the first one is the server's own first model, and
  // the model is refused if it is not one the server knows. The default
  // selection is already a valid one, so this is a no-op today — but it
  // is here so that a test which picks a character is picking a real
  // one, not whatever the modal happened to default to.
  await page.click('.ident__model').catch(() => {});

  // The confirm button. BY CLASS: its label contains "Join", which is
  // also what the landing page's per-server Join button says.
  await page.click('.ident__btn--go');

  // The launch starts when the dialog leaves the DOM. The modal is
  // `v-if`, so it is removed rather than hidden.
  await page
    .waitForSelector('.ident', { state: 'detached', timeout })
    .catch(() => {});

  return { appeared: true, confirmed: true };
}

module.exports = { confirmIdentity };
