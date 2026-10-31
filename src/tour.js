// Camera directions are measured around the car's Y axis (zero is its front).
// Targets and distances are fractions of the model's longest dimension, so the
// same tour works with the full and simplified copies of the supplied M4.
export const TOUR_STOPS = [
  { id: 'beginning', label: 'THE M4', yaw: 0.14, tilt: 0.055, distance: 1.32, target: [0, -0.035, 0], shift: 0.12, mobileFrame: 0.77, mobileShift: 0 },
  { id: 'the-face', label: 'THE FACE', yaw: 0.25, tilt: 0.045, distance: 0.78, target: [0.10, -0.06, 0.36], shift: 0.22, mobileFrame: 0.92, mobileShift: 0.08 },
  { id: 'the-profile', label: 'THE PROFILE', yaw: 1.40, tilt: 0.055, distance: 1.80, target: [0, -0.04, 0], shift: -0.17, mobileFrame: 0.90, mobileShift: -0.02 },
  { id: 'the-wheels', label: 'THE DETAILS', yaw: 1.18, tilt: 0.035, distance: 0.66, target: [0.19, -0.105, 0.27], shift: 0.19, mobileFrame: 0.85, mobileShift: 0.07 },
  { id: 'the-rear', label: 'THE REAR', yaw: 2.92, tilt: 0.045, distance: 0.82, target: [-0.05, -0.075, -0.36], shift: -0.10, mobileFrame: 0.92, mobileShift: 0.10 },
  { id: 'the-engine', label: 'THE ENGINE', yaw: 5.45, tilt: 0.075, distance: 1.45, target: [0, -0.03, 0], shift: 0.12, mobileFrame: 0.93, mobileShift: -0.02 },
  { id: 'end', label: 'THE M4', yaw: 6.40, tilt: 0.055, distance: 1.32, target: [0, -0.035, 0], shift: 0.12, mobileFrame: 0.77, mobileShift: 0 },
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const mix = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);

/** Continuous position between chapter anchors, robust to unequal heights. */
export function progressFromOffsets(scrollY, offsets) {
  if (!Array.isArray(offsets) || offsets.length < 2) return 0;
  const y = Number.isFinite(scrollY) ? Math.max(0, scrollY) : 0;
  if (y <= offsets[0]) return 0;
  for (let i = 0; i < offsets.length - 1; i += 1) {
    const start = offsets[i];
    const end = offsets[i + 1];
    if (y < end) return i + clamp((y - start) / Math.max(1, end - start), 0, 1);
  }
  return offsets.length - 1;
}

/** Smoothly move the camera in 3D; reduced motion uses discrete still views. */
export function getTourPose(progress, reducedMotion = false) {
  const max = TOUR_STOPS.length - 1;
  const p = clamp(Number.isFinite(progress) ? progress : 0, 0, max);
  const position = reducedMotion ? Math.round(p) : p;
  const index = Math.floor(position);
  const a = TOUR_STOPS[index];
  const b = TOUR_STOPS[Math.min(index + 1, max)];
  const t = ease(position - index);
  return {
    yaw: mix(a.yaw, b.yaw, t),
    tilt: mix(a.tilt, b.tilt, t),
    distance: mix(a.distance, b.distance, t),
    target: a.target.map((value, i) => mix(value, b.target[i], t)),
    shift: mix(a.shift, b.shift, t),
    mobileFrame: mix(a.mobileFrame, b.mobileFrame, t),
    mobileShift: mix(a.mobileShift, b.mobileShift, t),
  };
}

export function activeTourIndex(progress) {
  return clamp(Math.round(Number.isFinite(progress) ? progress : 0), 0, TOUR_STOPS.length - 1);
}
