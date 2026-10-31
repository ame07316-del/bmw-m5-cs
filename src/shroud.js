// The car cover is a draped cloth computed from the car's own silhouette: a
// top-down height map of the model is lifted, dilated, allowed to fall to the
// floor at a cloth-like angle, softened, then given hanging folds. Everything
// here is plain arithmetic on typed arrays so it runs in tests without a GPU.

export const SHROUD = {
  cellsAlong: 150, // grid cells across the car's longest dimension
  margin: 0.13, // extra floor around the car, as a fraction of its longest dimension
  clearance: 0.012, // cloth thickness above the paint, as a fraction of the longest dimension
  dilate: 1, // cells of outward growth before the fall-off (cloth bridges small gaps)
  slope: 5.5, // vertical drop per horizontal unit while the cloth falls to the floor
  blur: 2, // separable box-blur passes
  blurRadius: 3, // in cells
  foldAmplitude: 0.011, // horizontal fold depth, as a fraction of the longest dimension
  foldFrequency: 34, // folds around the perimeter
  rippleAmplitude: 0.004, // small wrinkles on the top surfaces
  rippleScale: 9, // wrinkle cells across the longest dimension
  minShade: 0.4, // vertex shade at the hem; 1 at the highest point
};

export const REVEAL_DURATION_MS = 2600;
export const REVEAL_REDUCED_MS = 420;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Grid dimensions for a car footprint, including the floor margin. */
export function shroudGrid(sizeX, sizeZ, maximum, settings = SHROUD) {
  const longest = Math.max(maximum, 1e-6);
  const cell = longest / settings.cellsAlong;
  const margin = longest * settings.margin;
  const width = sizeX + margin * 2;
  const depth = sizeZ + margin * 2;
  return {
    cell,
    width,
    depth,
    cols: Math.max(4, Math.round(width / cell)),
    rows: Math.max(4, Math.round(depth / cell)),
  };
}

/** Max filter with a square radius; closes small gaps so the cloth bridges them. */
export function dilate(heights, cols, rows, radius) {
  if (radius <= 0) return Float32Array.from(heights);
  const pass = (source, strideX, strideY, length, lines) => {
    const out = new Float32Array(source.length);
    for (let line = 0; line < lines; line += 1) {
      for (let i = 0; i < length; i += 1) {
        let best = -Infinity;
        for (let k = -radius; k <= radius; k += 1) {
          const j = i + k;
          if (j < 0 || j >= length) continue;
          best = Math.max(best, source[line * strideY + j * strideX]);
        }
        out[line * strideY + i * strideX] = best;
      }
    }
    return out;
  };
  const horizontal = pass(heights, 1, cols, cols, rows);
  return pass(horizontal, cols, 1, rows, cols);
}

/** Two-pass chamfer: no cell may sit lower than a neighbour minus the allowed drop. */
export function fallToFloor(heights, cols, rows, drop) {
  const out = Float32Array.from(heights);
  const diagonal = drop * Math.SQRT2;
  const relax = (r, c, dr, dc, cost) => {
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) return;
    const candidate = out[nr * cols + nc] - cost;
    if (candidate > out[r * cols + c]) out[r * cols + c] = candidate;
  };
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      relax(r, c, 0, -1, drop);
      relax(r, c, -1, 0, drop);
      relax(r, c, -1, -1, diagonal);
      relax(r, c, -1, 1, diagonal);
    }
  }
  for (let r = rows - 1; r >= 0; r -= 1) {
    for (let c = cols - 1; c >= 0; c -= 1) {
      relax(r, c, 0, 1, drop);
      relax(r, c, 1, 0, drop);
      relax(r, c, 1, 1, diagonal);
      relax(r, c, 1, -1, diagonal);
    }
  }
  for (let i = 0; i < out.length; i += 1) if (out[i] < 0) out[i] = 0;
  return out;
}

/** Separable box blur with edge clamping. */
export function blur(heights, cols, rows, radius, passes = 1) {
  let current = Float32Array.from(heights);
  if (radius <= 0 || passes <= 0) return current;
  const span = radius * 2 + 1;
  for (let pass = 0; pass < passes; pass += 1) {
    const horizontal = new Float32Array(current.length);
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        let sum = 0;
        for (let k = -radius; k <= radius; k += 1) sum += current[r * cols + clamp(c + k, 0, cols - 1)];
        horizontal[r * cols + c] = sum / span;
      }
    }
    const vertical = new Float32Array(current.length);
    for (let c = 0; c < cols; c += 1) {
      for (let r = 0; r < rows; r += 1) {
        let sum = 0;
        for (let k = -radius; k <= radius; k += 1) sum += horizontal[clamp(r + k, 0, rows - 1) * cols + c];
        vertical[r * cols + c] = sum / span;
      }
    }
    current = vertical;
  }
  return current;
}

/** The car plus its cloth clearance, grown by one cell so folds cannot slip inside it. */
export function clearanceMap(raw, cols, rows, maximum, settings = SHROUD) {
  const clearance = maximum * settings.clearance;
  const threshold = maximum * 0.004;
  const lifted = new Float32Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) lifted[i] = raw[i] > threshold ? raw[i] + clearance : 0;
  return { lifted, guard: dilate(lifted, cols, rows, 1) };
}

/**
 * Turn a raw top-down height map (0 = floor) into the draped cloth surface.
 * The result never dips below the car plus its clearance.
 */
export function drapeHeights(raw, cols, rows, cell, maximum, settings = SHROUD) {
  const { lifted } = clearanceMap(raw, cols, rows, maximum, settings);
  const grown = dilate(lifted, cols, rows, settings.dilate);
  const fallen = fallToFloor(grown, cols, rows, settings.slope * cell);
  const soft = blur(fallen, cols, rows, settings.blurRadius, settings.blur);
  for (let i = 0; i < soft.length; i += 1) {
    const floor = lifted[i] > 0 ? lifted[i] : 0;
    if (soft[i] < floor) soft[i] = floor;
  }
  return soft;
}

/** Deterministic 2D value noise in [-1, 1]; no textures or randomness needed. */
export function valueNoise(x, y) {
  const hash = (ix, iy) => {
    let h = (ix * 374761393 + iy * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (((h ^ (h >>> 16)) >>> 0) % 10000) / 5000 - 1;
  };
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const top = hash(x0, y0) + (hash(x0 + 1, y0) - hash(x0, y0)) * sx;
  const bottom = hash(x0, y0 + 1) + (hash(x0 + 1, y0 + 1) - hash(x0, y0 + 1)) * sx;
  return top + (bottom - top) * sy;
}

/**
 * Hanging folds and surface wrinkles for one vertex. Folds are columns that run
 * down the falling sides, strongest near the hem; wrinkles are soft and only on
 * the raised surfaces so the hem stays flat on the floor.
 */
export function foldOffset(x, z, height, slope, maximum, settings = SHROUD) {
  const hMax = Math.max(maximum * 0.3, 1e-6);
  const level = clamp(height / hMax, 0, 1);
  const radial = Math.hypot(x, z) || 1;
  const angle = Math.atan2(z, x);
  const perimeter = angle * settings.foldFrequency;
  const column = Math.sin(perimeter) * 0.62 + Math.sin(perimeter * 2.3 + 1.7) * 0.26 + Math.sin(perimeter * 0.47 + 0.6) * 0.12;
  const hanging = smoothstep(0.25, 1.2, slope) * (0.35 + 0.65 * (1 - level));
  const fold = column * hanging * settings.foldAmplitude * maximum;
  const raised = smoothstep(0.02, 0.18, level);
  const scale = settings.rippleScale / Math.max(maximum, 1e-6);
  const ripple = (valueNoise(x * scale, z * scale) * 0.7 + valueNoise(x * scale * 2.1 + 7.3, z * scale * 2.1 + 3.1) * 0.3)
    * raised * settings.rippleAmplitude * maximum;
  return {
    dx: (x / radial) * fold,
    dz: (z / radial) * fold,
    dy: ripple + Math.abs(column) * hanging * settings.foldAmplitude * maximum * 0.35,
  };
}

/** Cloth is brightest on top and settles into shadow towards the hem. */
export function shade(height, maximum, settings = SHROUD) {
  const level = clamp(height / Math.max(maximum * 0.28, 1e-6), 0, 1);
  return settings.minShade + (1 - settings.minShade) * smoothstep(0, 1, level);
}

/** Pulling the cover towards the rear: progress, travel, lift, flattening, fade. */
export function revealState(elapsed, reducedMotion = false) {
  const duration = reducedMotion ? REVEAL_REDUCED_MS : REVEAL_DURATION_MS;
  const time = clamp(Number.isFinite(elapsed) ? elapsed : 0, 0, duration);
  const p = time / duration;
  if (reducedMotion) return { progress: p, travel: 0, lift: 0, flatten: 1, opacity: 1 - p, done: p >= 1 };
  const eased = p * p * (3 - 2 * p);
  const pull = p < 0.18 ? 0 : (p - 0.18) / 0.82;
  const pullEased = pull * pull * (2.2 - 1.2 * pull);
  return {
    progress: p,
    travel: pullEased, // fraction of the cloth length moved towards the rear
    lift: Math.sin(Math.min(1, pull * 1.25) * Math.PI) * 0.22, // a wave lifts the cloth as it is pulled
    flatten: 1 - 0.55 * pullEased,
    opacity: 1 - smoothstep(0.62, 1, eased),
    done: p >= 1,
  };
}
