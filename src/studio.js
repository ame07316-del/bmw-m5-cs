// The lighting presets affect the actual Three.js lights as well as the room.
// Keep the public names and settings together so the controls cannot drift from
// what is rendered.
export const LIGHT_PRESETS = [
  {
    id: 'studio', label: 'Studio', room: '180, 185, 194',
    keyColor: 0xfff7ee, fillColor: 0xe6edff, rimColor: 0xfff5ef,
    key: 3.1, fill: 1.25, rim: 0.85, hemisphere: 0.95, environment: 0.75,
  },
  {
    id: 'dramatic', label: 'Dramatic', room: '147, 156, 180',
    keyColor: 0xfff2e9, fillColor: 0xb8c8ee, rimColor: 0xff6655,
    key: 2.9, fill: 0.48, rim: 1.55, hemisphere: 0.50, environment: 0.48,
  },
  {
    id: 'warm', label: 'Warm', room: '194, 151, 117',
    keyColor: 0xffd7b3, fillColor: 0xffe3cf, rimColor: 0xffa17c,
    key: 3.2, fill: 0.95, rim: 0.85, hemisphere: 0.85, environment: 0.65,
  },
];

export const DEFAULT_LIGHT_PRESET = 'studio';
export const DEFAULT_BRIGHTNESS = 75;
export const TURN_SPEED = 0.19; // radians per second; one slow turn in ~33 seconds
export const RESUME_AFTER_DRAG_MS = 3500;

/** Software WebGL can queue frames much faster than it can actually draw them. */
export function performanceProfile(rendererName, width, devicePixelRatio) {
  const software = /swiftshader|llvmpipe|softpipe|software rasterizer|basic render driver|mesa offscreen/i.test(String(rendererName || ''));
  const ratio = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return {
    software,
    fps: software ? 8 : 30,
    pixelRatio: software ? Math.min(ratio, 0.75) : Math.min(ratio, width < 700 ? 1.1 : 1.5),
  };
}

export function clampBrightness(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(100, Math.round(numeric))) : DEFAULT_BRIGHTNESS;
}

export function getLighting(presetId, brightness) {
  const preset = LIGHT_PRESETS.find((option) => option.id === presetId) || LIGHT_PRESETS[0];
  const level = clampBrightness(brightness);
  // A tiny amount of fill at zero keeps the object and the controls legible.
  const scale = 0.06 + (level / 100) * 0.94;
  return {
    ...preset,
    level,
    key: preset.key * scale,
    fill: preset.fill * scale,
    rim: preset.rim * scale,
    hemisphere: preset.hemisphere * scale,
    environment: preset.environment * scale,
    exposure: 0.76 + (level / 100) * 0.44,
  };
}

export function advanceRotation(angle, elapsedSeconds) {
  const safeAngle = Number.isFinite(angle) ? angle : 0;
  // Avoid a visible jump after a background tab or a stalled frame resumes.
  const elapsed = Number.isFinite(elapsedSeconds) ? Math.max(0, Math.min(elapsedSeconds, 0.1)) : 0;
  return safeAngle + elapsed * TURN_SPEED;
}

export function rotationForDrag(deltaX, width) {
  if (!Number.isFinite(deltaX) || !Number.isFinite(width) || width <= 0) return 0;
  // One full horizontal sweep across the interactive area equals one turn.
  return (deltaX / width) * Math.PI * 2;
}
