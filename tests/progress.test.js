import test from 'node:test';
import assert from 'node:assert/strict';
import { transferPercent } from '../src/progress.js';

test('reports actual transfer progress without claiming the model is ready', () => {
  assert.equal(transferPercent(50, 100, 200), 50);
  assert.equal(transferPercent(100, 100, 200), 99);
  assert.equal(transferPercent(180, 100, 200), 99);
});

test('uses the expected file size when a response omits content length', () => {
  assert.equal(transferPercent(250, 0, 1000), 25);
  assert.equal(transferPercent(-10, 100, 0), 0);
  assert.equal(transferPercent(20, 0, 0), 0);
});
