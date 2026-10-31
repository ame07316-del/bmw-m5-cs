import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ESTABLISH_DRIFT_MS, ESTABLISH_FLY_MS, LIGHTS_UP_MS, WIDE_SHOT,
  advanceEstablish, blendPose, establishBlend, holdDrift, lightsUpLevel,
} from '../src/establish.js';
import { TOUR_STOPS, getTourPose } from '../src/tour.js';
import { STUDIO } from '../src/Studio.js';

test('the sweep eases out of the held wide shot and finishes on the tour view', () => {
  const start = establishBlend(0);
  assert.equal(start.blend, 0);
  assert.equal(start.done, false);
  const early = establishBlend(ESTABLISH_FLY_MS * 0.05);
  assert.ok(early.blend < 0.01, 'the sweep eases in, no jolt on ENTER');
  const soon = establishBlend(ESTABLISH_FLY_MS * 0.2);
  assert.ok(soon.blend > 0.08, 'but it is visibly under way within a second: ENTER never looks ignored');
  const middle = establishBlend(ESTABLISH_FLY_MS * 0.5);
  assert.ok(middle.blend > 0.3 && middle.blend < 0.7);
  const late = establishBlend(ESTABLISH_FLY_MS * 0.95);
  assert.ok(late.blend > 0.99, 'and settles gently on arrival');
  // No frame may move the camera by a jump: the steepest step at 60 fps is small.
  let largest = 0;
  for (let t = 0; t < ESTABLISH_FLY_MS; t += 16) largest = Math.max(largest, establishBlend(t + 16).blend - establishBlend(t).blend);
  assert.ok(largest < 0.006, `steepest per-frame step ${largest}`);
  const end = establishBlend(ESTABLISH_FLY_MS);
  assert.equal(end.blend, 1);
  assert.equal(end.done, true);
  assert.equal(establishBlend(Number.NaN).blend, 0);
});

test('the held wide shot is alive: it creeps in and then rests', () => {
  assert.equal(holdDrift(0), 0);
  const early = holdDrift(ESTABLISH_DRIFT_MS * 0.25);
  const later = holdDrift(ESTABLISH_DRIFT_MS * 0.75);
  assert.ok(early > 0 && later > early && later < 1);
  assert.equal(holdDrift(ESTABLISH_DRIFT_MS * 3), 1);
  assert.equal(holdDrift(Number.NaN), 0);
});

test('the studio lights ramp up smoothly over the arriving car', () => {
  assert.equal(lightsUpLevel(0), 0);
  assert.equal(lightsUpLevel(LIGHTS_UP_MS), 1);
  const quarter = lightsUpLevel(LIGHTS_UP_MS / 4);
  const half = lightsUpLevel(LIGHTS_UP_MS / 2);
  assert.ok(quarter > 0 && quarter < half && half < 1);
  assert.ok(quarter < 0.25, 'eases in rather than snapping on');
  assert.equal(lightsUpLevel(-5), 0);
});

test('the sweep cannot be rushed or skipped, and stalled frames are capped', () => {
  assert.equal(advanceEstablish(0, 0.016), 16);
  assert.equal(advanceEstablish(100, 0.016, true), 116, 'a second argument no longer speeds it up');
  assert.equal(advanceEstablish(0, 5), 100, 'a background tab or a shader stall does not jump the shot');
  assert.equal(advanceEstablish(Number.NaN, Number.NaN), 0);
  // A visitor who double-clicks ENTER or scrolls sees the same move as anyone else.
  let clock = 0;
  for (let i = 0; i < 300; i += 1) clock = advanceEstablish(clock, 1 / 60, true);
  assert.ok(Math.abs(clock - 5000) < 1);
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
  assert.ok(Math.abs(tour.yaw - pose.yaw) < 1e-9);
  assert.equal(tour.distance, pose.distance);
  assert.equal(tour.fov, 36);
  assert.equal(tour.shift, pose.shift);
  assert.deepEqual(tour.target, pose.target);
  const half = blendPose(pose, 0.5, 1, 36);
  assert.ok(half.distance > pose.distance && half.distance < WIDE_SHOT.distance);
  // The camera sweeps the short way round the car, through its side.
  assert.ok(half.yaw > pose.yaw && half.yaw < WIDE_SHOT.yaw);
});

test('the wide shot frames the covered car from behind, under the softbox', () => {
  // Rear three-quarter: the camera stands behind the car, off to one side.
  assert.ok(Math.cos(WIDE_SHOT.yaw) < -0.5 && Math.sin(WIDE_SHOT.yaw) > 0.5);
  assert.ok(WIDE_SHOT.target[1] > 0.1, 'it aims above the car so the softbox fills the top of the frame');
  const box = STUDIO.softbox;
  assert.ok(box.height > 0.5 && box.height < STUDIO.height, 'the softbox hangs over the car, below the ceiling');
  assert.ok(box.width > 1 && box.width < STUDIO.halfWidth * 2, 'wider than the car, well inside the room');
  assert.ok(box.depth < box.width);
  assert.ok(box.intensity > 0);
});

test('the opening, the whole sweep and every desktop tour framing fit inside the room without clamping', () => {
  const halfW = STUDIO.halfWidth;
  const halfD = STUDIO.halfDepth;
  const fits = (yaw, distance) => Math.abs(Math.sin(yaw)) * distance < halfW * 0.9 && Math.abs(Math.cos(yaw)) * distance < halfD * 0.9;
  assert.ok(fits(WIDE_SHOT.yaw, WIDE_SHOT.distance), 'the wide shot stands inside the room');
  for (const stop of TOUR_STOPS) assert.ok(fits(stop.yaw, stop.distance), `${stop.id} fits on desktop`);
  // The sweep passes the car's side: the camera must never reach the wall, or the lens would pulse.
  const hero = getTourPose(0);
  for (let t = 0; t <= ESTABLISH_FLY_MS; t += 40) {
    const pose = blendPose(hero, establishBlend(t).blend, 1, 36);
    assert.ok(fits(pose.yaw, pose.distance), `sweep at ${t} ms: yaw ${pose.yaw.toFixed(2)}, distance ${pose.distance.toFixed(2)}`);
  }
});
