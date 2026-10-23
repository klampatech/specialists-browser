/**
 * The pull-request gate.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * The gate is the thing standing between a direct push to main and a
 * deploy to production. The first version of it had a FALSE NEGATIVE,
 * and it was silent.
 *
 * The check counts the pull requests associated with a commit, and the
 * natural way to count them is `jq 'length'`. But GitHub does not always
 * answer with an array — when the token lacks the `pull-requests`
 * permission it answers with an ERROR OBJECT, and `jq 'length'` on an
 * object returns the number of KEYS.
 *
 *     { "message": "Resource not accessible by integration",
 *       "documentation_url": "...", "status": "403" }
 *
 * That response has three keys. So the gate read "3 pull requests" and
 * APPROVED A DIRECT PUSH TO MAIN. The deploy workflow had exactly that
 * permission gap, and it really happened.
 *
 * A gate that approves what it exists to refuse is worse than no gate,
 * because it looks like it is working.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { parsePullRequestCount, verdict } = require('../../tools/ci/pr-gate-logic.cjs');

test('a list of pull requests is counted', () => {
  assert.equal(parsePullRequestCount([{ number: 2 }]), 1);
  assert.equal(parsePullRequestCount([{}, {}, {}]), 3);
});

test('an empty list is zero', () => {
  assert.equal(parsePullRequestCount([]), 0);
});

test('an ERROR OBJECT is not a count', () => {
  // The bug. `jq length` on this returns 3 — the number of keys — and
  // the gate reads that as "three pull requests".
  const errorBody = {
    message: 'Resource not accessible by integration',
    documentation_url: 'https://docs.github.com/rest',
    status: '403',
  };
  assert.notEqual(parsePullRequestCount(errorBody), 3);
  assert.equal(parsePullRequestCount(errorBody), -1);
});

test('anything that is not a list is not a count', () => {
  assert.equal(parsePullRequestCount(null), -1);
  assert.equal(parsePullRequestCount(undefined), -1);
  assert.equal(parsePullRequestCount('a string'), -1);
  assert.equal(parsePullRequestCount(42), -1);
  assert.equal(parsePullRequestCount({ length: 7 }), -1);
});

test('a commit with a pull request may deploy', () => {
  const v = verdict(parsePullRequestCount([{ number: 1 }]));
  assert.equal(v.ok, true);
});

test('a commit with NO pull request may not deploy', () => {
  const v = verdict(parsePullRequestCount([]));
  assert.equal(v.ok, false);
  assert.match(v.reason, /not associated with any pull request/);
});

test('an unverifiable commit may NOT deploy', () => {
  // The failure mode that shipped: the gate could not tell, and the
  // safe answer has to be no.
  const v = verdict(parsePullRequestCount({ status: '403' }));
  assert.equal(v.ok, false);
  assert.match(v.reason, /could not verify/);
});

test('the gate fails closed on every unrecognised input', () => {
  for (const body of [null, undefined, {}, 'x', 7, true]) {
    const v = verdict(parsePullRequestCount(body));
    assert.equal(v.ok, false, `body ${JSON.stringify(body)} must not pass`);
  }
});
