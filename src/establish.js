// The opening. The studio is live from the first frame: a wide rear
// three-quarter view of the covered car standing in the middle of the room
// under the softbox, held behind the loading counter and the ENTER gate. When
// the visitor enters, the camera sweeps round the car and pushes in to the
// first tour view in one continuous move. Everything is a pure function of
// elapsed time so the scene stays deterministic and testable.

export const WIDE_SHOT = {
  yaw: 2.4, // rear three-quarter, 45° to the car, so the softbox reads as a diamond above it
  tilt: 0.02, // camera height as a fraction of its distance: an eye line near the roof
  distance: 2.6, // fraction of the car's longest dimension: far back, so the car stands small in the middle
  target: [0, 0.23, 0], // aim well above the car: it sits in the lower half, the softbox fills the top
  fov: 40,
  mobileFrame: 0.9,
};

export const ESTABLISH_FLY_MS = 4800; // the sweep from the wide shot to the first tour view
export const ESTABLISH_REDUCED_MS = 400; // reduced motion: a beat, then a cut
export const ESTABLISH_RUSH = 3.4; // time multiplier once the visitor interacts during the sweep
export const ESTABLISH_PUSH_IN = 0.04; // how far the held wide shot creeps in, as a fraction of distance
export const ESTABLISH_DRIFT_MS = 14000; // over this long; the held frame is alive, never static
export const LIGHTS_UP_MS = 1600; // the studio lights come up over the car once it is in the room

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const mix = (a, b, t) => a + (b - a) * t;
const smoothstep = (t) => t * t * (3 - 2 * t);
const smootherstep = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const safeTime = (value) => Math.max(0, Number.isFinite(value) ? value : 0);

/** How far the held wide shot has crept in, 0–1, easing out so it never visibly stops. */
export function holdDrift(heldMs) {
  const p = clamp(safeTime(heldMs) / ESTABLISH_DRIFT_MS, 0, 1);
  return 1 - (1 - p) * (1 - p);
}

/** The studio lights ramp up over the covered car: 0 dark, 1 fully lit. */
export function lightsUpLevel(elapsedMs) {
  return smoothstep(clamp(safeTime(elapsedMs) / LIGHTS_UP_MS, 0, 1));
}

/**
 * Where the sweep is at `elapsed` ms after ENTER: 0 = wide studio, 1 = tour view.
 * `done` ends the opening.
 */
export function establishBlend(elapsed, reducedMotion = false) {
  const time = safeTime(elapsed);
  if (reducedMotion) {
    // A still wide view, then a cut; no sweeping camera.
    const done = time >= ESTABLISH_REDUCED_MS;
    return { blend: done ? 1 : 0, done };
  }
  const p = clamp(time / ESTABLISH_FLY_MS, 0, 1);
  return { blend: smootherstep(p), done: p >= 1 };
}

/** Advance the sweep's clock; interaction rushes it rather than skipping abruptly. */
export function advanceEstablish(clock, elapsedSeconds, rushed = false) {
  const safe = Number.isFinite(clock) ? clock : 0;
  const step = Number.isFinite(elapsedSeconds) ? clamp(elapsedSeconds, 0, 0.1) : 0;
  return safe + step * 1000 * (rushed ? ESTABLISH_RUSH : 1);
}

/** Blend the wide shot into a tour pose. `blend` 0 is the wide shot; `drift` is the held creep-in. */
export function blendPose(pose, blend, drift = 0, baseFov = 36, wide = WIDE_SHOT) {
  const t = clamp(blend, 0, 1);
  const wideDistance = wide.distance * (1 - ESTABLISH_PUSH_IN * clamp(drift, 0, 1));
  // Sweep the short way round the car.
  const turn = Math.atan2(Math.sin(pose.yaw - wide.yaw), Math.cos(pose.yaw - wide.yaw));
  return {
    yaw: wide.yaw + turn * t,
    tilt: mix(wide.tilt, pose.tilt, t),
    distance: mix(wideDistance, pose.distance, t),
    target: pose.target.map((value, i) => mix(wide.target[i], value, t)),
    shift: pose.shift * t,
    mobileShift: pose.mobileShift * t,
    mobileFrame: mix(wide.mobileFrame, pose.mobileFrame, t),
    fov: mix(wide.fov, baseFov, t),
  };
}
