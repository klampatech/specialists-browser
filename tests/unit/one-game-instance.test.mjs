/**
 * The guard that stops a perf harness from measuring beside another
 * live game instance.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * On 2026-11-07 two runs of the same measurement on Kyle's MacBook Pro
 * disagreed by 3.3x (3.88 ms vs 12.67 ms per frame) because the
 * harness had left four game tabs running. The contention inflated
 * every reading, and the contended run's own tick rate — 60 Hz on a
 * 120 Hz panel — was the tell.
 *
 * The guard is what stops that from happening again, so it needs to
 * catch the cases that matter:
 *
 *   - a live game page must be caught;
 *   - a blank tab must NOT be caught (the harness's own leftover
 *     about:blank is harmless, and refusing on it would make the guard
 *     noise the agent learns to ignore);
 *   - a production session must be caught even when the harness is
 *     pointed at the CI stack, because they compete for the same main
 *     thread exactly the same way.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);
const guard = require(join(ROOT, 'tools', 'perf', 'lib', 'one-game-instance.cjs'));

const { assertSingleGameInstance, findRunningGameInstances, isGameUrl } = guard;

/** A browser whose pages report the given URLs. */
function browserWith(urls) {
  const pages = urls.map((url, i) => ({
    url: () => url,
    id: `page-${i}`,
  }));
  return {
    contexts: () => [{ pages: () => pages }],
  };
}

test('a blank tab is not a game instance', () => {
  assert.equal(isGameUrl('about:blank'), false);
  assert.equal(isGameUrl(''), false);
  assert.equal(isGameUrl(undefined), false);
});

test('a live game page is a game instance', () => {
  assert.equal(isGameUrl('https://ci.bulletballet.dev/'), true);
  assert.equal(isGameUrl('https://bulletballet.dev/?server=x'), true);
  assert.equal(isGameUrl('http://127.0.0.1:8899/'), true);
  assert.equal(isGameUrl('http://localhost:5174/'), true);
});

test('a production session is caught even when the harness is on the CI stack', async () => {
  // The point of the check is the CPU, not the URL: they compete for
  // the same main thread exactly the same way.
  const found = await findRunningGameInstances(
    browserWith(['https://ci.bulletballet.dev/', 'https://bulletballet.dev/'])
  );
  assert.equal(found.length, 2);
});

test('the guard passes when only a blank tab is open', async () => {
  const browser = browserWith(['about:blank']);
  await assertSingleGameInstance(browser, 'test');
});

test('the guard refuses when a game instance is already running', async () => {
  const browser = browserWith(['about:blank', 'https://ci.bulletballet.dev/']);
  await assert.rejects(
    () => assertSingleGameInstance(browser, 'measure-engine-cost'),
    (err) => {
      assert.match(err.message, /refusing to measure/);
      assert.match(err.message, /1 game instance\(s\)/);
      // The message must say HOW to fix it, or the agent will guess.
      assert.match(err.message, /json\/list/);
      assert.match(err.message, /json\/close/);
      return true;
    }
  );
});

test('a page that cannot report its URL is not treated as a game', async () => {
  const pages = [
    {
      url: () => {
        throw new Error('the page is gone');
      },
      id: 'page-dead',
    },
  ];
  const browser = { contexts: () => [{ pages: () => pages }] };
  await assertSingleGameInstance(browser, 'test');
});
