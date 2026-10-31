import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

// The studio is a dark room: matte walls that catch a little light at the top,
// a continuous LED line let into the ceiling, and large dark tiles polished
// enough to carry a reflection of whatever stands on them.

export const STUDIO = {
  halfWidth: 3.6, // room half-size as a multiple of the car's longest dimension
  halfDepth: 3.6,
  height: 1.4,
  ledInset: 0.1, // LED line inset from the walls, as a fraction of the half-size
  tileWidth: 1.2, // metres, running bond, landscape
  tileHeight: 0.6,
  grout: 0.012,
  tileGloss: 0.3, // how much of the mirror image shows through a tile
};

function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** Dark porcelain tiles in running bond. Alpha carries the gloss: grout is opaque, tiles let the reflection through. */
export function makeTileTexture(settings = STUDIO) {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  const unit = settings.tileWidth; // the texture covers one tile width in both directions (two rows)
  const scale = size / unit;
  const rows = Math.round(unit / settings.tileHeight);
  const grout = Math.max(2, settings.grout * scale);
  const tileW = settings.tileWidth * scale;
  const tileH = size / rows;
  context.fillStyle = 'rgba(9, 9, 11, 1)';
  context.fillRect(0, 0, size, size);
  for (let row = 0; row < rows; row += 1) {
    const offset = row % 2 ? tileW / 2 : 0;
    for (let col = -1; col <= 1; col += 1) {
      const x = col * tileW + offset;
      const y = row * tileH;
      const tone = 22 + hash(col + 7, row + 3) * 7;
      const gradient = context.createLinearGradient(x, y, x + tileW, y + tileH);
      gradient.addColorStop(0, `rgba(${tone + 3}, ${tone + 3}, ${tone + 6}, ${1 - settings.tileGloss})`);
      gradient.addColorStop(1, `rgba(${tone - 3}, ${tone - 3}, ${tone}, ${1 - settings.tileGloss * 0.8})`);
      context.fillStyle = gradient;
      // The grout stays opaque; each tile is cleared first so its alpha really is the gloss.
      context.clearRect(x + grout / 2, y + grout / 2, tileW - grout, tileH - grout);
      context.fillRect(x + grout / 2, y + grout / 2, tileW - grout, tileH - grout);
    }
  }
  // Fine grain so the tiles do not read as flat vector shapes.
  const image = context.getImageData(0, 0, size, size);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (hash(i % (size * 4), Math.floor(i / (size * 4))) - 0.5) * 6;
    data[i] = Math.max(0, Math.min(255, data[i] + n));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

/** Matte wall: a little light from the LED line at the top, falling to near black. */
function makeWallTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, 'rgb(86, 88, 96)');
  gradient.addColorStop(0.1, 'rgb(44, 45, 50)');
  gradient.addColorStop(0.36, 'rgb(15, 15, 17)');
  gradient.addColorStop(1, 'rgb(7, 7, 8)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Soft halo painted on the ceiling around the LED line. */
function makeGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, 'rgba(255,255,255,0)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,1)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Build the room around a car of the given size. `floorY` is the top of the
 * tiles; `reflective` adds the planar reflection (skipped on software WebGL).
 */
export function createStudio(renderer, { maximum, floorY, reflective = true, textureSize = 1024, multisample = 4 }, settings = STUDIO) {
  const group = new THREE.Group();
  group.name = 'studio';
  const halfW = maximum * settings.halfWidth;
  const halfD = maximum * settings.halfDepth;
  const height = maximum * settings.height;
  const ceilingY = floorY + height;
  const disposables = [];

  // Floor: mirror underneath, tiles on top with the grout fully opaque.
  let reflector = null;
  if (reflective) {
    reflector = new Reflector(new THREE.PlaneGeometry(halfW * 2, halfD * 2), {
      clipBias: 0.002,
      textureWidth: textureSize,
      textureHeight: textureSize,
      color: 0x9a9aa0,
      multisample,
    });
    reflector.rotation.x = -Math.PI / 2;
    reflector.position.y = floorY - 0.006;
    group.add(reflector);
    disposables.push(() => { reflector.getRenderTarget().dispose(); reflector.geometry.dispose(); reflector.material.dispose(); });
  }
  const tileTexture = makeTileTexture(settings);
  tileTexture.repeat.set((halfW * 2) / settings.tileWidth, (halfD * 2) / settings.tileWidth);
  const tiles = new THREE.Mesh(
    new THREE.PlaneGeometry(halfW * 2, halfD * 2),
    new THREE.MeshBasicMaterial({ map: tileTexture, transparent: reflective, depthWrite: true, side: THREE.FrontSide }),
  );
  tiles.rotation.x = -Math.PI / 2;
  tiles.position.y = floorY - 0.004;
  tiles.renderOrder = -1;
  group.add(tiles);
  disposables.push(() => { tiles.geometry.dispose(); tiles.material.dispose(); tileTexture.dispose(); });

  // Walls and ceiling.
  const wallTexture = makeWallTexture();
  const wallMaterial = new THREE.MeshBasicMaterial({ map: wallTexture, side: THREE.FrontSide });
  const wall = (width, x, z, rotationY) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), wallMaterial);
    mesh.position.set(x, floorY + height / 2, z);
    mesh.rotation.y = rotationY;
    group.add(mesh);
    disposables.push(() => mesh.geometry.dispose());
    return mesh;
  };
  wall(halfW * 2, 0, -halfD, 0);
  wall(halfW * 2, 0, halfD, Math.PI);
  wall(halfD * 2, -halfW, 0, Math.PI / 2);
  wall(halfD * 2, halfW, 0, -Math.PI / 2);
  disposables.push(() => { wallMaterial.dispose(); wallTexture.dispose(); });
  const ceilingMaterial = new THREE.MeshBasicMaterial({ color: 0x0b0b0d, side: THREE.FrontSide });
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 2, halfD * 2), ceilingMaterial);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = ceilingY;
  group.add(ceiling);
  disposables.push(() => { ceiling.geometry.dispose(); ceilingMaterial.dispose(); });

  // The LED line: four emissive bars let into the ceiling, each with a halo.
  const insetW = halfW * (1 - settings.ledInset);
  const insetD = halfD * (1 - settings.ledInset);
  const barThickness = maximum * 0.012;
  const ledMaterial = new THREE.MeshBasicMaterial({ color: 0xf4f6ff, toneMapped: false });
  const glowTexture = makeGlowTexture();
  const glowMaterial = new THREE.MeshBasicMaterial({ map: glowTexture, color: 0xcfd4e6, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide, toneMapped: false });
  const bar = (length, x, z, rotationY) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(length, barThickness, barThickness * 1.6), ledMaterial);
    mesh.position.set(x, ceilingY - barThickness / 2, z);
    mesh.rotation.y = rotationY;
    group.add(mesh);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(length + maximum * 0.3, maximum * 0.46), glowMaterial);
    glow.rotation.x = Math.PI / 2;
    glow.rotation.z = rotationY;
    glow.position.set(x, ceilingY - 0.015, z);
    group.add(glow);
    disposables.push(() => { mesh.geometry.dispose(); glow.geometry.dispose(); });
  };
  bar(insetW * 2, 0, -insetD, 0);
  bar(insetW * 2, 0, insetD, 0);
  bar(insetD * 2, -insetW, 0, Math.PI / 2);
  bar(insetD * 2, insetW, 0, Math.PI / 2);
  disposables.push(() => { ledMaterial.dispose(); glowMaterial.dispose(); glowTexture.dispose(); });

  const tint = new THREE.Color();
  return {
    group,
    reflector,
    bounds: { halfW, halfD, height, ceilingY },
    /** Lighting presets tint the walls and scale the room with the intensity slider. */
    setLighting(lighting) {
      const [r, g, b] = String(lighting.room || '180, 185, 194').split(',').map((part) => Number(part) / 255);
      const scale = 0.45 + 0.55 * (lighting.level / 100);
      tint.setRGB(r, g, b).multiplyScalar(scale / Math.max(r, g, b, 1e-3));
      wallMaterial.color.copy(tint);
      tiles.material.color.copy(tint).lerp(new THREE.Color(1, 1, 1), 0.6);
      glowMaterial.opacity = 0.18 + 0.2 * (lighting.level / 100);
    },
    resize(width, height) {
      if (!reflector) return;
      const size = Math.min(textureSize, Math.max(256, Math.round(Math.max(width, height))));
      const target = reflector.getRenderTarget();
      if (target.width !== size) target.setSize(size, size);
    },
    dispose() {
      group.parent?.remove(group);
      for (const dispose of disposables) dispose();
    },
  };
}
