/**
 * Which instance slot to use.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * Scale-out originally took "the next number after the highest one". The
 * port range is contiguous, so that walks off the end of it on the first
 * scale-out and collides with a port the range already covers. The
 * correct answer is the LOWEST FREE INDEX — and the lowest index is also
 * the one the bridge and the registry already know about.
 *
 * The related bug: the orchestrator treated a slot with no container as
 * a crashed instance and retried it 50 times against names the Docker
 * daemon had to look up and reject. Slot selection and slot EXISTENCE
 * are different questions.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { lowestFreeSlot, highestSlot } from '../../services/orchestrator/lib/slot.mjs';

test('the lowest free slot is chosen, not the next after the highest', () => {
  // ts-1 and ts-3 exist; ts-0 was scaled in earlier. The answer is 0.
  assert.equal(lowestFreeSlot([1, 3], 8), 0);
});

test('the lowest free slot of an empty fleet is 0', () => {
  assert.equal(lowestFreeSlot([], 8), 0);
});

test('the lowest free slot skips a contiguous run', () => {
  assert.equal(lowestFreeSlot([0, 1, 2, 3], 8), 4);
});

test('a full fleet has no free slot', () => {
  assert.equal(lowestFreeSlot([0, 1, 2, 3, 4, 5, 6, 7], 8), undefined);
});

test('the slot never runs past the maximum', () => {
  // The bug: "highest + 1" would return 8 here, which is outside the
  // port range entirely.
  assert.equal(lowestFreeSlot([0, 1, 2, 3, 4, 5, 6, 7], 8), undefined);
  assert.equal(lowestFreeSlot([7], 8), 0);
});

test('the slot does not walk off the end as the fleet grows', () => {
  let used = [];
  const chosen = [];
  for (let i = 0; i < 8; i++) {
    const slot = lowestFreeSlot(used, 8);
    assert.ok(slot !== undefined, `slot ${i} should exist`);
    assert.ok(slot >= 0 && slot < 8, `slot ${slot} is outside the range`);
    chosen.push(slot);
    used.push(slot);
  }
  assert.deepEqual(chosen, [0, 1, 2, 3, 4, 5, 6, 7]);
});

test('the highest slot is the one to remove when scaling in', () => {
  assert.equal(highestSlot([0, 3, 5]), 5);
  assert.equal(highestSlot([2]), 2);
  assert.equal(highestSlot([]), undefined);
});
