/**
 * Resolve Playwright, wherever this happens to be running.
 *
 * The browser scripts used to hard-code a path on Kyle's machine, which
 * made them unrunnable anywhere else — including in CI, which is the
 * whole reason the deploy verifies itself.
 *
 * Order:
 *   1. PLAYWRIGHT_MODULE — an explicit path, for anything unusual.
 *   2. A normal `require('playwright')` — works when playwright is
 *      installed in this repo or a parent of it.
 *   3. The old hard-coded local path, so a bare checkout on Kyle's
 *      machine still works with nothing installed.
 */
const path = require('node:path');

function loadPlaywright() {
  const explicit = process.env.PLAYWRIGHT_MODULE;
  if (explicit) {
    return require(explicit);
  }
  try {
    return require('playwright');
  } catch (e) {
    if (e && e.code !== 'MODULE_NOT_FOUND') throw e;
  }
  try {
    return require('/home/kyle/Development/slot-protocol/node_modules/playwright');
  } catch (e) {
    if (e && e.code !== 'MODULE_NOT_FOUND') throw e;
  }
  throw new Error(
    'playwright not found. Install it (npm i -D playwright) or set PLAYWRIGHT_MODULE.'
  );
}

module.exports = { loadPlaywright };
