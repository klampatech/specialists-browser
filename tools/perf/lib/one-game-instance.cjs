/**
 * Refuse to measure while another game instance is running.
 *
 * WHY THIS EXISTS
 * ---------------
 * On 2026-11-07 two runs of the same measurement on Kyle's MacBook Pro
 * disagreed by 3.3x — 3.88 ms vs 12.67 ms per frame — with the SAME
 * engine, the SAME canvas and the SAME machine. A per-frame CPU cost
 * cannot differ by 3.3x for hardware reasons, so one of the two was
 * measuring something else.
 *
 * It was: the harness had left FOUR game tabs running on the machine at
 * once. Every instance's rAF callback shared one main thread, so each
 * callback waited much longer for the event loop, and the browser
 * missed half its vsyncs. The contended run's own tick rate — 60 Hz on
 * a 120 Hz panel — is the signature of that overload, and its GPU
 * backlog was still 0.00 ms, so the GPU was never the problem.
 *
 * Kyle noticed and said so. The lesson belongs in the tool, not in
 * somebody's memory: a measurement harness that can silently measure
 * the wrong thing is worse than one that refuses to measure.
 *
 * WHAT IT DOES
 * ------------
 * Before a harness opens its page, it looks for pages that are ALREADY
 * running the game. A blank tab is harmless; a live game instance is
 * not, because it competes for the same main thread. This module finds
 * them and refuses, with the command that lists them.
 */
'use strict';

/**
 * Does this URL look like a live game client?
 *
 * The check is for the game SITES rather than a specific one, because
 * a harness pointed at the CI stack must still refuse to run beside a
 * production session — they compete for the same main thread exactly
 * the same way.
 */
function isGameUrl(url) {
  if (!url) return false;
  return /bulletballet\.dev|localhost|127\.0\.0\.1|100\.95\.111\.112/.test(url);
}

/**
 * The game instances already running in this browser.
 *
 * @param {import('playwright').Browser} browser
 * @returns {Promise<Array<{url: string, id: string}>>}
 */
async function findRunningGameInstances(browser) {
  const pages = browser.contexts().flatMap((c) => c.pages());
  const running = [];
  for (const page of pages) {
    let url = '';
    try {
      url = page.url();
    } catch (e) {
      // A page that cannot report its URL is not one we can judge.
      continue;
    }
    if (isGameUrl(url)) {
      running.push({ url, id: page.id ? String(page.id) : '' });
    }
  }
  return running;
}

/**
 * Throw if another game instance is running.
 *
 * @param {import('playwright').Browser} browser
 * @param {string} label - the harness's name, for the error message
 */
async function assertSingleGameInstance(browser, label) {
  const running = await findRunningGameInstances(browser);
  if (running.length === 0) return;

  const lines = running.map((r) => `    ${r.url}`).join('\n');
  throw new Error(
    `${label}: refusing to measure — ${running.length} game instance(s) are ` +
      `already running in this browser, and they share the main thread with ` +
      `the one this harness is about to start. That contention inflates the ` +
      `per-frame cost and makes the measurement meaningless.\n` +
      `${lines}\n` +
      `  list them:  curl -s http://localhost:9223/json/list | grep -c '"type": "page"'\n` +
      `  close them: curl -s http://localhost:9223/json/close/<id>\n` +
      `  (or stop the browser outright and start it again clean)`
  );
}

module.exports = { assertSingleGameInstance, findRunningGameInstances, isGameUrl };
