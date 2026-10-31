import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ESTABLISH_FLY_MS, ESTABLISH_HOLD_MS, ESTABLISH_REDUCED_MS, ESTABLISH_RUSH, WIDE_SHOT,
  advanceEstablish, blendPose, establishBlend,
} from '../src/establish.js';
import { TOUR_STOPS, getTourPose } from '../src/tour.js';

test('the opening holds wide, then flies in smoothly and finishes', () => {
  const start = establishBlend(0);
  assert.equal(start.blend, 0);
  assert.equal(start.done, false);
  const hold = establishBlend(ESTABLISH_HOLD_MS * 0.5);
  assert.equal(hold.blend, 0, 'the wide frame is held');
  assert.ok(hold.drift > 0 && hold.drift < 1, 'but it slowly pushes in');
  const middle = establishBlend(ESTABLISH_HOLD_MS + ESTABLISH_FLY_MS * 0.5);
  assert.ok(middle.blend > 0.3 && middle.blend < 0.7);
  const early = establishBlend(ESTABLISH_HOLD_MS + ESTABLISH_FLY_MS * 0.05);
  assert.ok(early.blend < 0.01, 'the fly-in eases in, no jolt');
  const end = establishBlend(ESTABLISH_HOLD_MS + ESTABLISH_FLY_MS);
  assert.equal(end.blend, 1);
  assert.equal(end.done, true);
  assert.equal(establishBlend(Number.NaN).blend, 0);
});

test('reduced motion shows a still wide view and then cuts', () => {
  assert.deepEqual(establishBlend(ESTABLISH_REDUCED_MS - 1, true), { blend: 0, drift: 0, done: false });
  assert.deepEqual(establishBlend(ESTABLISH_REDUCED_MS, true), { blend: 1, drift: 0, done: true });
});

test('interaction rushes the clock without skipping; stalled frames are capped', () => {
  assert.equal(advanceEstablish(0, 0.016), 16);
  assert.equal(advanceEstablish(100, 0.016, true), 100 + 16 * ESTABLISH_RUSH);
  assert.equal(advanceEstablish(0, 5), 100, 'a background tab does not jump the shot');
  assert.equal(advanceEstablish(Number.NaN, Number.NaN), 0);
});

test('blending reaches the exact tour pose at 1 and the wide shot at 0', () => {
  const pose = getTourPose(0);
  const wide = blendPose(pose, 0, 0, 36);
  assert.equal(wide.yaw, WIDE_SHOT.yaw);
  assert.equal(wide.distance, WIDE_SHOT.distance);
  assert.equal(wide.fov, WIDE_SHOT.fov);
  assert.equal(wide.shift, 0, 'the car is centred in the wide frame');
  const pushed = blendPose(pose, 0, 1, 36);
  assert.ok(pushed.distance < wide.distance);
  const tour = blendPose(pose, 1, 1, 36);
  assert.equal(tour.yaw, pose.yaw);
  assert.equal(tour.distance, pose.distance);
  assert.equal(tour.fov, 36);
  assert.equal(tour.shift, pose.shift);
  assert.deepEqual(tour.target, pose.target);
  const half = blendPose(pose, 0.5, 1, 36);
  assert.ok(half.distance > pose.distance && half.distance < WIDE_SHOT.distance);
});

test('the wide shot stays inside the studio room for every tour framing', () => {
  // Room half-size is 3.6× the car; the camera cap keeps a margin at the widest yaw.
  const cap = WIDE_SHOT.maxDistance;
  assert.ok(cap * Math.max(Math.abs(Math.sin(WIDE_SHOT.yaw)), Math.abs(Math.cos(WIDE_SHOT.yaw))) < 3.6);
  for (const stop of TOUR_STOPS) assert.ok(stop.distance * 2 < cap, `${stop.id} fits even with the phone framing`);
});
