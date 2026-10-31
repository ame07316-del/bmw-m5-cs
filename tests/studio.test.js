import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_BRIGHTNESS, LIGHT_PRESETS, TURN_SPEED,
  advanceRotation, clampBrightness, getLighting, performanceProfile, rotationForDrag,
} from '../src/studio.js';

test('the studio has three unique, meaningful light presets', () => {
  assert.deepEqual(LIGHT_PRESETS.map((preset) => preset.id), ['studio', 'dramatic', 'warm']);
  assert.equal(new Set(LIGHT_PRESETS.map((preset) => preset.keyColor)).size, 3);
  assert.notEqual(getLighting('studio', 75).fill, getLighting('dramatic', 75).fill);
});

test('brightness actually changes scene lights, environment and exposure', () => {
  const dark = getLighting('studio', 0);
  const bright = getLighting('studio', 100);
  for (const property of ['key', 'fill', 'rim', 'hemisphere', 'environment', 'exposure']) {
    assert.ok(bright[property] > dark[property], `${property} should increase`);
  }
  assert.equal(getLighting('unknown', 50).id, 'studio');
  assert.equal(clampBrightness(-20), 0);
  assert.equal(clampBrightness(120), 100);
  assert.equal(clampBrightness('bad'), DEFAULT_BRIGHTNESS);
});

test('software WebGL is given a lighter frame rate and resolution', () => {
  const soft = performanceProfile('ANGLE (Google, Vulkan SwiftShader)', 1000, 2);
  assert.equal(soft.software, true);
  assert.equal(soft.fps, 8);
  assert.equal(soft.pixelRatio, 0.75);
  assert.equal(performanceProfile('Microsoft Basic Render Driver', 1000, 1).software, true);
  const gpu = performanceProfile('ANGLE (Intel, Iris Xe)', 1000, 2);
  assert.equal(gpu.software, false);
  assert.equal(gpu.fps, 30);
  assert.equal(gpu.pixelRatio, 1.5);
  assert.equal(performanceProfile('Intel', 390, 3).pixelRatio, 1.1);
});

test('automatic rotation is time-based and does not jump after a stalled frame', () => {
  assert.ok(Math.abs(advanceRotation(1, 0.05) - (1 + TURN_SPEED * 0.05)) < 1e-10);
  assert.equal(advanceRotation(1, 10), advanceRotation(1, 0.1));
  assert.equal(advanceRotation(1, -1), 1);
});

test('a horizontal drag turns the car and one full sweep is one rotation', () => {
  assert.equal(rotationForDrag(400, 400), Math.PI * 2);
  assert.equal(rotationForDrag(-100, 400), -Math.PI / 2);
  assert.equal(rotationForDrag(10, 0), 0);
});
