/**
 * The browser's CDP targets, before Playwright connects.
 *
 * WHY THIS EXISTS
 * ---------------
 * `chromium.connectOverCDP()` fails with:
 *
 *     Protocol error (Browser.setDownloadBehavior):
 *     Browser context management is not supported.
 *
 * when the browser has **no pages open at all**. That message is
 * about the protocol, and the actual cause is that every tab was
 * closed — which is exactly what happens after a harness finishes and
 * cleans up, or after a person closes the last tab themselves.
 *
 * It cost real time on 2026-11-07: the profiler was re-run, failed
 * with that message, and the obvious reading ("the browser is broken")
 * was wrong. The fix is a single blank tab.
 *
 * So every harness makes sure the browser has at least one page
 * BEFORE it connects, and says plainly what it did.
 */
'use strict';

/**
 * The page targets the browser currently has.
 *
 * @param {string} cdpUrl - the browser's CDP HTTP endpoint
 * @returns {Promise<Array<{id: string, type: string, url: string}>>}
 */
async function listTargets(cdpUrl) {
  const res = await fetch(`${cdpUrl.replace(/\/$/, '')}/json/list`);
  if (!res.ok) {
    throw new Error(
      `could not reach the browser's CDP endpoint at ${cdpUrl} ` +
        `(HTTP ${res.status}). Is the browser running with ` +
        `--remote-debugging-port, and is the tunnel up?`
    );
  }
  return await res.json();
}

/**
 * Open a blank page in the browser.
 *
 * Chrome wants `PUT /json/new`; older builds answer `GET`. Both are
 * tried, because a harness that only works on one Chrome version is a
 * harness that breaks on a Tuesday.
 */
async function openBlankPage(cdpUrl) {
  const base = cdpUrl.replace(/\/$/, '');
  const url = encodeURIComponent('about:blank');
  for (const method of ['PUT', 'GET']) {
    try {
      const res = await fetch(`${base}/json/new?${url}`, { method });
      if (res.ok) return await res.json();
    } catch (e) {
      // Try the next method.
    }
  }
  throw new Error(
    `could not open a blank page in the browser at ${cdpUrl}. ` +
      `Open a tab by hand and try again.`
  );
}

/**
 * Make sure the browser has at least one page, and report what it found.
 *
 * @param {string} cdpUrl
 * @returns {Promise<{pages: number, opened: boolean}>}
 */
async function ensureAtLeastOnePage(cdpUrl) {
  const targets = await listTargets(cdpUrl);
  const pages = targets.filter((t) => t.type === 'page');
  if (pages.length > 0) return { pages: pages.length, opened: false };

  // Playwright cannot connect to a browser with no pages, and says so
  // in a way that does not mention pages at all. So say it here.
  await openBlankPage(cdpUrl);
  return { pages: 1, opened: true };
}

module.exports = { ensureAtLeastOnePage, listTargets, openBlankPage };
