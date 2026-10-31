import test from 'node:test';
import assert from 'node:assert/strict';
import { TOUR_STOPS, activeTourIndex, getTourPose, progressFromOffsets } from '../src/tour.js';

test('scroll progress follows each chapter even when heights differ', () => {
  const offsets = [0, 900, 1800, 2900];
  assert.equal(progressFromOffsets(0, offsets), 0);
  assert.equal(progressFromOffsets(450, offsets), 0.5);
  assert.equal(progressFromOffsets(1350, offsets), 1.5);
  assert.equal(progressFromOffsets(99999, offsets), 3);
  assert.equal(progressFromOffsets(NaN, offsets), 0);
  assert.equal(progressFromOffsets(10, []), 0);
});

test('the opening camera is low and faces the front, not the roof', () => {
  const pose = getTourPose(0);
  assert.ok(Math.abs(pose.yaw) < 0.3);
  assert.ok(pose.tilt < 0.1);
  assert.ok(TOUR_STOPS[1].target[2] > 0, 'the face focuses on the front');
  assert.ok(TOUR_STOPS[4].target[2] < 0, 'the rear focuses behind the car');
});

test('the tour visits each detail and has portrait framing at every stop', () => {
  assert.deepEqual(TOUR_STOPS.map((stop) => stop.id), [
    'beginning', 'the-face', 'the-profile', 'the-wheels', 'the-rear', 'the-engine', 'end',
  ]);
  for (const [index] of TOUR_STOPS.entries()) {
    const pose = getTourPose(index);
    assert.ok(pose.mobileFrame > 0 && Number.isFinite(pose.mobileShift));
    assert.ok(pose.distance > 0);
  }
  const halfway = getTourPose(0.5);
  assert.ok(halfway.mobileFrame > TOUR_STOPS[0].mobileFrame);
  assert.ok(halfway.mobileFrame < TOUR_STOPS[1].mobileFrame);
});

test('poses interpolate smoothly, clamp to the tour and support still reduced-motion views', () => {
  const first = getTourPose(0);
  const second = getTourPose(1);
  const halfway = getTourPose(0.5);
  assert.ok(halfway.yaw > first.yaw && halfway.yaw < second.yaw);
  assert.equal(getTourPose(-10).yaw, first.yaw);
  assert.equal(getTourPose(999).yaw, TOUR_STOPS.at(-1).yaw);
  assert.equal(getTourPose(0.2, true).yaw, first.yaw);
  assert.equal(getTourPose(0.8, true).yaw, second.yaw);
  assert.equal(activeTourIndex(2.6), 3);
});
