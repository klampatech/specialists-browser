// A FAILURE PATH HAS TO REPORT, NOT CRASH.
//
// The harness formats numbers into its result lines, and the failure
// paths produce numbers that are not there: `median([])` is undefined,
// and `undefined.toFixed(2)` is a TypeError. That landed in the
// engine-cost harness AFTER the measurement — the worst moment to lose
// a run, and the best moment to have already said why. The same shape
// was in the A-B-A harness, where a phase that produced no samples
// would have killed the whole A-B-A.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = '/home/kyle/Development/specialists-browser';
const { num, ms } = require(join(ROOT, 'tools', 'perf', 'lib', 'format.cjs'));

function source(file) {
  return readFileSync(join(ROOT, 'tools', 'perf', file), 'utf8');
}

test('a number that is not there is a zero', () => {
  assert.equal(num(4.5), 4.5);
  assert.equal(num(0), 0);
  assert.equal(num(undefined), 0);
  assert.equal(num(null), 0);
  assert.equal(num(NaN), 0);
  assert.equal(num('7'), 0, 'a string is not a number here');
  assert.equal(num(Infinity), 0);
});

test('a missing duration is a question mark, not a zero', () => {
  // "how long did this take" with no answer is `?`. `0.00` would read
  // as "it took no time", which is a different claim entirely.
  assert.equal(ms(4.567), '4.57');
  assert.equal(ms(0), '0.00');
  assert.equal(ms(undefined), '?');
  assert.equal(ms(null), '?');
  assert.equal(ms(NaN), '?');
  assert.equal(ms(undefined, 'n/a'), 'n/a');
});

test('an empty sample list does not take a run down', () => {
  const median = (a) => {
    if (!a.length) return undefined;
    const s = [...a].sort((x, y) => x - y);
    return s[Math.floor(s.length / 2)];
  };

  assert.equal(median([]), undefined);
  assert.equal(num(median([])), 0);
  assert.equal(ms(median([])), '?');
  assert.equal(num(median([1, 2, 3])), 2);
  assert.equal(num(median([4, 1, 3, 2])), 3);
});

test('both harnesses format through the shared helper', () => {
  for (const file of ['measure-engine-cost.cjs', 'measure-geterror-ab.cjs']) {
    const s = source(file);
    assert.match(s, /require\('\.\/lib\/format\.cjs'\)/, `${file} does not use the shared formatter`);
  }
});

test('a page.evaluate block may not reach for a Node-side helper', () => {
  // THE SCOPE TRAP.
  //
  // `page.evaluate()` SERIALISES ITS CALLBACK AND RUNS IT IN THE
  // BROWSER. A helper defined in Node is not in scope there, and the
  // failure is a `ReferenceError` in the middle of a measurement —
  // which no source-scanning test and no unit test caught. The live
  // end-to-end run caught it in one attempt.
  //
  // So this test pins the exact block that had it: the in-page frame
  // statistics, which have their OWN `med` and `mean` because they
  // run in the page.
  const s = source('measure-engine-cost.cjs');

  const start = s.indexOf('const med = (a) => {');
  assert.ok(start > 0, 'the in-page median helper is gone');

  // The block ends at the `return {` that reports the stats.
  const end = s.indexOf('pacing,\n    };', start);
  assert.ok(end > start, 'the in-page stats block is gone');

  const block = s.slice(start, end);

  assert.match(block, /if \(!a\.length\) return 0;/, 'the in-page median must survive an empty list');
  assert.doesNotMatch(
    block,
    /\b(num|ms|medianOf)\(/,
    'a Node-side helper is referenced inside a page.evaluate block — it is not in scope in the browser'
  );
});
