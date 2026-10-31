// Progress never exceeds the model's actual progress. A cached model still
// gets a legible introduction; reduced-motion visitors get a short static one.
export const INTRO_DURATION_MS = 5200;
export const INTRO_REDUCED_MIN_MS = 1800;
export const INTRO_HOLD_MS = 350;
export const INTRO_REVEAL_MS = 900;

export function introProgress(actual, elapsed, reducedMotion = false) {
  const real = Math.max(0, Math.min(100, Math.floor(Number.isFinite(actual) ? actual : 0)));
  if (reducedMotion) return real;
  const time = Math.max(0, Number.isFinite(elapsed) ? elapsed : 0);
  const timedCeiling = Math.min(100, Math.floor((time / INTRO_DURATION_MS) * 100));
  return Math.min(real, timedCeiling);
}

export function introWait(elapsed, reducedMotion = false) {
  const time = Math.max(0, Number.isFinite(elapsed) ? elapsed : 0);
  if (reducedMotion) return Math.max(0, INTRO_REDUCED_MIN_MS - time);
  return Math.max(0, INTRO_DURATION_MS - time) + INTRO_HOLD_MS;
}
