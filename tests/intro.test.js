import test from 'node:test';
import assert from 'node:assert/strict';
import { INTRO_DURATION_MS, INTRO_HOLD_MS, INTRO_REDUCED_MIN_MS, introProgress, introWait } from '../src/intro.js';

test('the intro never displays more than the real model progress', () => {
  for (const actual of [0, 8, 30, 66, 99, 100]) {
    for (const elapsed of [0, 1000, 3000, INTRO_DURATION_MS, 12000]) {
      const shown = introProgress(actual, elapsed);
      assert.ok(shown >= 0 && shown <= actual, `${shown} should be between 0 and ${actual}`);
    }
  }
  assert.equal(introProgress(99, 12000), 99, '100 is impossible until the model is rendered');
  assert.equal(introProgress(100, INTRO_DURATION_MS), 100);
});

test('fast transfers unfold over the reference-inspired introduction', () => {
  assert.equal(introProgress(100, 0), 0);
  assert.equal(introProgress(100, INTRO_DURATION_MS / 2), 50);
  assert.equal(introWait(1000), INTRO_DURATION_MS - 1000 + INTRO_HOLD_MS);
  assert.equal(introWait(INTRO_DURATION_MS + 1000), INTRO_HOLD_MS);
});

test('reduced motion shows a short static introduction without overstating progress', () => {
  assert.equal(introProgress(42, 0, true), 42);
  assert.equal(introWait(0, true), INTRO_REDUCED_MIN_MS);
  assert.equal(introWait(INTRO_REDUCED_MIN_MS + 1, true), 0);
  assert.equal(introProgress(NaN, -1), 0);
});
