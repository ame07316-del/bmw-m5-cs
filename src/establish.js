// The opening shot: a wide lens from the back of the studio that takes in the
// whole room with the car standing in its middle. It holds, then pushes in
// along the same line of sight to the first tour view, so the two frames read
// as one continuous move. Everything is a pure function of elapsed time so the scene
// stays deterministic and testable.

export const WIDE_SHOT = {
  yaw: 0.2, // almost the hero angle, so the fly-in is one continuous push-in
  tilt: 0.17, // camera height as a fraction of its distance: a raised eye line
  distance: 2.4, // fraction of the car's longest dimension; the camera sits at the back of the room
  target: [0, 0.05, 0], // aim a touch above the car so the ceiling line stays in frame
  fov: 50, // wide lens; the tour uses 36–39
  mobileFrame: 0.9,
};

export const ESTABLISH_HOLD_MS = 1600;
export const ESTABLISH_FLY_MS = 3200;
export const ESTABLISH_REDUCED_MS = 1500;
export const ESTABLISH_RUSH = 3.4; // time multiplier once the visitor interacts
export const ESTABLISH_PUSH_IN = 0.035; // slow push-in during the hold, so the frame is alive

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const mix = (a, b, t) => a + (b - a) * t;
const smootherstep = (t) => t * t * t * (t * (t * 6 - 15) + 10);

/**
 * Where the opening shot is at `elapsed` ms: 0 = wide studio, 1 = tour view.
 * `drift` is the slow push-in during the hold; `done` ends the shot.
 */
export function establishBlend(elapsed, reducedMotion = false) {
  const time = Math.max(0, Number.isFinite(elapsed) ? elapsed : 0);
  if (reducedMotion) {
    // A still wide view, then a cut; no sweeping camera.
    const done = time >= ESTABLISH_REDUCED_MS;
    return { blend: done ? 1 : 0, drift: 0, done };
  }
  if (time < ESTABLISH_HOLD_MS) return { blend: 0, drift: time / ESTABLISH_HOLD_MS, done: false };
  const p = clamp((time - ESTABLISH_HOLD_MS) / ESTABLISH_FLY_MS, 0, 1);
  return { blend: smootherstep(p), drift: 1, done: p >= 1 };
}

/** Advance the shot's clock; interaction rushes it rather than skipping abruptly. */
export function advanceEstablish(clock, elapsedSeconds, rushed = false) {
  const safe = Number.isFinite(clock) ? clock : 0;
  const step = Number.isFinite(elapsedSeconds) ? clamp(elapsedSeconds, 0, 0.1) : 0;
  return safe + step * 1000 * (rushed ? ESTABLISH_RUSH : 1);
}

/** Blend the wide shot into a tour pose. `blend` 0 is the wide shot. */
export function blendPose(pose, blend, drift = 0, baseFov = 36, wide = WIDE_SHOT) {
  const t = clamp(blend, 0, 1);
  const wideDistance = wide.distance * (1 - ESTABLISH_PUSH_IN * clamp(drift, 0, 1));
  return {
    yaw: mix(wide.yaw, pose.yaw, t),
    tilt: mix(wide.tilt, pose.tilt, t),
    distance: mix(wideDistance, pose.distance, t),
    target: pose.target.map((value, i) => mix(wide.target[i], value, t)),
    shift: pose.shift * t,
    mobileShift: pose.mobileShift * t,
    mobileFrame: mix(wide.mobileFrame, pose.mobileFrame, t),
    fov: mix(wide.fov, baseFov, t),
  };
}
