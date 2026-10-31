import * as THREE from 'three';
import { SHROUD, clearanceMap, drapeHeights, foldOffset, shade, shroudGrid } from './shroud.js';

// A height-encoding material: the car is drawn once from directly above and
// each pixel stores how high its top surface is. Two 8-bit channels give a
// 16-bit height, more than enough for a cloth resting on the paint.
const HEIGHT_VERTEX = /* glsl */ `
  varying float vHeight;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vHeight = world.y;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;
const HEIGHT_FRAGMENT = /* glsl */ `
  uniform float minY;
  uniform float maxY;
  varying float vHeight;
  void main() {
    float h = clamp((vHeight - minY) / max(maxY - minY, 1e-5), 0.0, 1.0);
    float hi = floor(h * 255.0) / 255.0;
    float lo = fract(h * 255.0);
    gl_FragColor = vec4(hi, lo, 0.0, 1.0);
  }
`;

/**
 * Sample the car from above into a floor-relative height map. The model is
 * moved to a scratch scene for one off-screen frame and returned untouched.
 */
export function captureHeightMap(renderer, model, bounds, grid, floorY) {
  const parent = model.parent;
  const scratch = new THREE.Scene();
  const minY = bounds.min.y;
  const maxY = bounds.max.y;
  scratch.overrideMaterial = new THREE.ShaderMaterial({
    uniforms: { minY: { value: minY }, maxY: { value: maxY } },
    vertexShader: HEIGHT_VERTEX,
    fragmentShader: HEIGHT_FRAGMENT,
    side: THREE.DoubleSide,
  });
  const supersample = 2;
  const width = grid.cols * supersample;
  const height = grid.rows * supersample;
  const target = new THREE.WebGLRenderTarget(width, height, { depthBuffer: true, stencilBuffer: false });
  const camera = new THREE.OrthographicCamera(-grid.width / 2, grid.width / 2, grid.depth / 2, -grid.depth / 2, 0.01, maxY - minY + 2);
  camera.position.set(0, maxY + 1, 0);
  camera.up.set(0, 0, -1);
  camera.lookAt(0, (minY + maxY) / 2, 0);
  camera.updateMatrixWorld(true);

  const previousTarget = renderer.getRenderTarget();
  const previousColor = renderer.getClearColor(new THREE.Color());
  const previousAlpha = renderer.getClearAlpha();
  const pixels = new Uint8Array(width * height * 4);
  try {
    parent?.remove(model);
    scratch.add(model);
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    renderer.render(scratch, camera);
    renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);
  } finally {
    scratch.remove(model);
    parent?.add(model);
    renderer.setRenderTarget(previousTarget);
    renderer.setClearColor(previousColor, previousAlpha);
    target.dispose();
    scratch.overrideMaterial.dispose();
  }

  // Rows come back bottom-up: the first pixel row is the camera's bottom edge,
  // which is +z in the car's frame. Keep the finest (highest) sample per cell.
  const span = maxY - minY;
  const base = Math.max(0, minY - floorY);
  const raw = new Float32Array(grid.cols * grid.rows);
  for (let r = 0; r < grid.rows; r += 1) {
    for (let c = 0; c < grid.cols; c += 1) {
      let best = 0;
      for (let sy = 0; sy < supersample; sy += 1) {
        for (let sx = 0; sx < supersample; sx += 1) {
          const px = ((r * supersample + sy) * width + c * supersample + sx) * 4;
          const value = pixels[px] / 255 + pixels[px + 1] / 255 / 255;
          if (value > best) best = value;
        }
      }
      raw[r * grid.cols + c] = best > 0.002 ? best * span + base : 0;
    }
  }
  return raw;
}

/** Fragments below this alpha are cut away; the vertex alpha ramps at the hem. */
export const HEM_ALPHA_TEST = 0.5;

/** Build the draped cloth mesh for a model centred on the origin. */
export function createCarCover(renderer, model, bounds, maximum, floorY) {
  const size = bounds.getSize(new THREE.Vector3());
  const grid = shroudGrid(size.x, size.z, maximum);
  const raw = captureHeightMap(renderer, model, bounds, grid, floorY);
  const heights = drapeHeights(raw, grid.cols, grid.rows, grid.cell, maximum);
  const { guard } = clearanceMap(raw, grid.cols, grid.rows, maximum);

  const { cols, rows, cell } = grid;
  const positions = new Float32Array(cols * rows * 3);
  const colors = new Float32Array(cols * rows * 4);
  const hemFade = maximum * 0.004; // the hem's alpha ramps over ~2 cm so its contour is smooth, not stepped
  const hemLift = cell * 0.12; // keeps the hem just above the floor shadow plane
  for (let r = 0; r < rows; r += 1) {
    const z = grid.depth / 2 - (r + 0.5) * cell;
    for (let c = 0; c < cols; c += 1) {
      const x = -grid.width / 2 + (c + 0.5) * cell;
      const index = r * cols + c;
      const h = heights[index];
      const left = heights[r * cols + Math.max(c - 1, 0)];
      const right = heights[r * cols + Math.min(c + 1, cols - 1)];
      const front = heights[Math.max(r - 1, 0) * cols + c];
      const back = heights[Math.min(r + 1, rows - 1) * cols + c];
      const slope = Math.hypot(right - left, back - front) / (2 * cell);
      const fold = foldOffset(x, z, h, slope, maximum);
      const fx = x + fold.dx;
      const fz = z + fold.dz;
      // A fold may swing a vertex sideways over the bodywork; it must still sit above the paint there.
      const guardColumn = Math.min(cols - 1, Math.max(0, Math.round((fx + grid.width / 2) / cell - 0.5)));
      const guardRow = Math.min(rows - 1, Math.max(0, Math.round((grid.depth / 2 - fz) / cell - 0.5)));
      const minimum = guard[guardRow * cols + guardColumn];
      positions[index * 3] = fx;
      positions[index * 3 + 1] = floorY + hemLift + Math.max(h + fold.dy, minimum);
      positions[index * 3 + 2] = fz;
      const tone = shade(h, maximum);
      colors[index * 4] = tone;
      colors[index * 4 + 1] = tone;
      colors[index * 4 + 2] = tone * 1.012; // a whisper of cool in the shadows, like studio satin
      colors[index * 4 + 3] = Math.min(1, h / hemFade);
    }
  }
  // The cloth ends where it meets the floor: cells that are bare floor on all
  // four corners are not part of the cover, so no sheet spreads across the studio.
  const hem = maximum * 0.0001;
  const indices = [];
  for (let r = 0; r < rows - 1; r += 1) {
    for (let c = 0; c < cols - 1; c += 1) {
      const a = r * cols + c;
      const b = a + 1;
      const d = a + cols;
      const e = d + 1;
      if (heights[a] <= hem && heights[b] <= hem && heights[d] <= hem && heights[e] <= hem) continue;
      indices.push(a, d, b, b, d, e);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const material = new THREE.MeshPhysicalMaterial({
    color: 0xcfcfd4,
    vertexColors: true,
    roughness: 0.66,
    metalness: 0,
    sheen: 1,
    sheenRoughness: 0.42,
    sheenColor: new THREE.Color(0xffffff),
    specularIntensity: 0.55,
    side: THREE.DoubleSide,
    alphaTest: HEM_ALPHA_TEST,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'car-cover';
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  mesh.userData.length = grid.depth;
  mesh.userData.height = Math.max(...heights);
  mesh.userData.floorY = floorY;
  return mesh;
}

export function disposeCarCover(mesh) {
  if (!mesh) return;
  mesh.parent?.remove(mesh);
  mesh.geometry.dispose();
  mesh.material.dispose();
}

export { SHROUD };
