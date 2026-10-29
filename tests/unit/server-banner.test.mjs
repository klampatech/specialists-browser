/**
 * The reconnect's PROOF OF LIFE.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The fast reconnect path works like this: put the transport back,
 * tell the engine to `retry`, and wait for the engine to say it is in
 * a game again. The last step is the only one that can be wrong in
 * both directions, and both directions are bad:
 *
 *   - a FALSE NEGATIVE (the banner is missed) means the player is
 *     actually back in the game but the CONNECTION LOST panel stays
 *     over a live world, and the fallback fires a reload that was not
 *     needed — the minute-long path this change exists to remove;
 *   - a FALSE POSITIVE (something else is taken for the banner) means
 *     the panel clears while the player is still staring at a frozen
 *     world, with no message and no way back.
 *
 * So the signal has to be the engine's OWN word and nothing weaker.
 * The engine prints the server's banner the moment the game server
 * answers the handshake (`Server #1  "bulletballet TS" ...`), which is
 * the same line the deploy's browser gate matches on. The page being
 * alive, the WebSocket being open, the bridge counting a connection —
 * none of those mean the player got in.
 *
 * The listener is attached by the caller BEFORE it triggers the
 * reconnect, so the banner cannot be missed between the trigger and
 * the wait. That is why this module exposes a wait, not a poll.
 *
 * WHAT IS TESTED
 * --------------
 *   - the banner resolves the wait, and it does so on the line that
 *     actually carries it;
 *   - the wait times out into a false rather than hanging;
 *   - lines that are NOT the banner do not resolve it (a state dump,
 *     a chat line, an engine warning);
 *   - the listener is removed when the wait settles, so a reconnect
 *     does not leave a listener behind on a long-lived page.
 *
 * The module under test is the REAL file the browser runs, imported
 * through a relative path so node's type stripping can load it.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// The module talks to `window` (the engine's stdout arrives as an
// `xash:stdout` window event). Node has no window, so it gets a
// minimal one BEFORE the import — the module only touches `window`
// inside its functions, so this is enough.
const listeners = new Set();
globalThis.window = {
  addEventListener: (type, fn) => {
    if (type === 'xash:stdout') listeners.add(fn);
  },
  removeEventListener: (type, fn) => {
    if (type === 'xash:stdout') listeners.delete(fn);
  },
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h),
  setInterval: (fn, ms) => setInterval(fn, ms),
  clearInterval: (h) => clearInterval(h),
};

const { waitForServerBanner } = await import(
  '../../webxash/src/services/server-banner.ts'
);

/** Deliver a line to the wait, the way the loader's stdout bridge does. */
function emit(line) {
  for (const fn of [...listeners]) {
    fn(new CustomEvent('xash:stdout', { detail: { line } }));
  }
}

test('the banner resolves the wait', async () => {
  const wait = waitForServerBanner(5000);
  // The engine's line, verbatim in shape.
  emit('Server #1  "bulletballet TS" ( rust-port )  ts_casa');
  assert.equal(await wait, true);
});

test('the listener is attached the moment the wait is called', async () => {
  // The engine's `retry` fires the handshake immediately, so the banner
  // can come back in the SAME TICK as the trigger. The listener has to
  // be up before that trigger — a wait that attaches lazily would miss
  // it, and a missed banner means the panel stays over a live world.
  const before = listeners.size;
  const wait = waitForServerBanner(5000);
  assert.equal(listeners.size, before + 1, 'the listener was not attached synchronously');
  emit('Server #1  "bulletballet TS"');
  assert.equal(await wait, true);
});

test('the wait times out into a false rather than hanging', async () => {
  const t0 = Date.now();
  assert.equal(await waitForServerBanner(120), false);
  assert.ok(Date.now() - t0 >= 100, 'it waited for the timeout');
});

test('a line that is not the banner does not resolve the wait', async () => {
  let settled = false;
  const wait = waitForServerBanner(400).then((v) => {
    settled = true;
    return v;
  });
  // Everything the engine prints that is NOT the banner.
  emit('TSBUY state open=1 hidden=0 page=0 budget=30000 total=4150');
  emit('TSBUY end');
  emit('[ts] gameplay: the server runs ruleset 30');
  emit('Bot Neo: Where you guys from?');
  emit('Unknown command: roundtime');
  emit('Server was reject the connection: server is full');
  await new Promise((r) => setTimeout(r, 150));
  assert.equal(settled, false, 'none of those may resolve the wait');
  assert.equal(await wait, false);
});

test('the listener is removed when the wait settles', async () => {
  const before = listeners.size;
  // The timeout path.
  await waitForServerBanner(60);
  assert.equal(listeners.size, before, 'the timeout left a listener behind');

  // The banner path.
  const wait = waitForServerBanner(5000);
  emit('Server #1  "bulletballet TS"');
  assert.equal(await wait, true);
  assert.equal(listeners.size, before, 'the banner left a listener behind');
});

test('a banner that arrives after the timeout does not throw', async () => {
  await waitForServerBanner(60);
  // The engine keeps printing; the settled wait must not blow up.
  emit('Server #1  "bulletballet TS"');
  emit('TSBUY end');
});

test('the wait ends early when the transport is gone', async () => {
  // The engine's handshake runs over the WebSocket. If the socket dies
  // again mid-wait, no banner can EVER arrive — waiting out the whole
  // window would just delay the fallback that has to take over.
  let transportUp = true;
  const wait = waitForServerBanner(30_000, {
    stillPossible: () => transportUp,
    pollMs: 10,
  });
  transportUp = false;
  const t0 = Date.now();
  assert.equal(await wait, false);
  assert.ok(Date.now() - t0 < 5_000, 'it gave up on the dead transport, not on the timeout');
});

test('the early exit does not fire while the transport is alive', async () => {
  const wait = waitForServerBanner(5_000, {
    stillPossible: () => true,
    pollMs: 10,
  });
  emit('Server #1  "bulletballet TS"');
  assert.equal(await wait, true);
});
