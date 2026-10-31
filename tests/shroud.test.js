import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REVEAL_DURATION_MS, SHROUD, blur, dilate, drapeHeights, fallToFloor, foldOffset, revealState, shade, shroudGrid, valueNoise,
} from '../src/shroud.js';

function carLikeHeightMap(cols, rows, carHeight) {
  // A box body in the middle of the grid with a lower bonnet at one end.
  const raw = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const inside = c >= cols * 0.3 && c < cols * 0.7 && r >= rows * 0.2 && r < rows * 0.8;
      if (!inside) continue;
      raw[r * cols + c] = r < rows * 0.4 ? carHeight * 0.6 : carHeight;
    }
  }
  return raw;
}

test('the grid covers the car and its floor margin at a consistent cell size', () => {
  const grid = shroudGrid(1.9, 4.8, 4.8);
  assert.ok(grid.cell > 0);
  assert.ok(grid.width > 1.9 && grid.depth > 4.8);
  assert.equal(grid.cols, Math.round(grid.width / grid.cell));
  assert.equal(grid.rows, Math.round(grid.depth / grid.cell));
  assert.ok(grid.rows > grid.cols, 'the long axis gets more cells');
});

test('dilation grows raised areas and never lowers anything', () => {
  const cols = 9;
  const rows = 9;
  const raw = new Float32Array(cols * rows);
  raw[4 * cols + 4] = 1;
  const grown = dilate(raw, cols, rows, 1);
  assert.equal(grown[3 * cols + 3], 1);
  assert.equal(grown[2 * cols + 2], 0);
  for (let i = 0; i < raw.length; i += 1) assert.ok(grown[i] >= raw[i]);
});

test('the cloth falls to the floor with a bounded slope in every direction', () => {
  const cols = 21;
  const rows = 21;
  const raw = new Float32Array(cols * rows);
  raw[10 * cols + 10] = 1;
  const drop = 0.1;
  const fallen = fallToFloor(raw, cols, rows, drop);
  assert.equal(fallen[10 * cols + 10], 1);
  assert.ok(Math.abs(fallen[10 * cols + 11] - 0.9) < 1e-6);
  assert.ok(Math.abs(fallen[9 * cols + 9] - (1 - drop * Math.SQRT2)) < 1e-6);
  assert.equal(fallen[0], 0, 'far cells rest on the floor, never below it');
  for (let r = 0; r < rows; r += 1) {
    for (let c = 1; c < cols; c += 1) {
      assert.ok(Math.abs(fallen[r * cols + c] - fallen[r * cols + c - 1]) <= drop + 1e-6);
    }
  }
});

test('blur preserves a flat field and smooths a step', () => {
  const cols = 8;
  const rows = 4;
  const flat = new Float32Array(cols * rows).fill(0.5);
  assert.deepEqual(Array.from(blur(flat, cols, rows, 2, 3)), Array.from(flat));
  const step = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r += 1) for (let c = 4; c < cols; c += 1) step[r * cols + c] = 1;
  const soft = blur(step, cols, rows, 1, 1);
  assert.ok(soft[3] > 0 && soft[3] < 1);
  assert.ok(soft[4] > soft[3]);
});

test('the draped surface clears the car everywhere and rests on the floor around it', () => {
  const grid = shroudGrid(1.9, 4.8, 4.8);
  const raw = carLikeHeightMap(grid.cols, grid.rows, 1.4);
  const cloth = drapeHeights(raw, grid.cols, grid.rows, grid.cell, 4.8);
  assert.equal(cloth.length, raw.length);
  const clearance = 4.8 * SHROUD.clearance;
  for (let i = 0; i < raw.length; i += 1) {
    if (raw[i] > 0) assert.ok(cloth[i] >= raw[i] + clearance - 1e-6, `cell ${i} intersects the car`);
    assert.ok(cloth[i] >= 0);
  }
  assert.equal(cloth[0], 0, 'the corner of the floor margin is bare floor');
  assert.equal(cloth[cloth.length - 1], 0);
  const roof = Math.floor(grid.rows * 0.6) * grid.cols + Math.floor(grid.cols * 0.5);
  const justOutside = Math.floor(grid.rows * 0.6) * grid.cols + Math.floor(grid.cols * 0.7) + SHROUD.dilate + 4;
  assert.ok(cloth[justOutside] > 0 && cloth[justOutside] < cloth[roof], 'the side of the cloth is mid-fall');
});

test('folds hang on the falling sides and the floor hem stays horizontal', () => {
  const onFloor = foldOffset(1.4, 0.2, 0, 0, 4.8);
  assert.ok(Math.abs(onFloor.dx) < 1e-9);
  assert.ok(Math.abs(onFloor.dz) < 1e-9);
  assert.ok(Math.abs(onFloor.dy) < 1e-9);
  const falling = foldOffset(1.0, 0.0, 0.35, 1.6, 4.8);
  assert.ok(Math.abs(falling.dx) <= SHROUD.foldAmplitude * 4.8 + 1e-9);
  assert.ok(Math.abs(falling.dz) < 1e-9, 'a fold on the x side pushes along x only');
  const roof = foldOffset(0.1, 0.4, 1.4, 0, 4.8);
  assert.ok(Math.abs(roof.dx) < 1e-9 && Math.abs(roof.dz) < 1e-9, 'flat surfaces have no hanging folds');
});

test('value noise is deterministic, bounded and continuous', () => {
  assert.equal(valueNoise(3.3, 7.1), valueNoise(3.3, 7.1));
  for (let i = 0; i < 200; i += 1) {
    const v = valueNoise(i * 0.37, i * 0.91);
    assert.ok(v >= -1 && v <= 1);
  }
  assert.ok(Math.abs(valueNoise(2.5, 2.5) - valueNoise(2.501, 2.5)) < 0.02);
});

test('shade is darkest at the hem and full at the top', () => {
  assert.equal(shade(0, 4.8), SHROUD.minShade);
  assert.equal(shade(4.8, 4.8), 1);
  assert.ok(shade(0.3, 4.8) > shade(0.1, 4.8));
});

test('the reveal pulls the cloth away, fades it late and finishes', () => {
  const start = revealState(0);
  assert.equal(start.travel, 0);
  assert.equal(start.opacity, 1);
  assert.equal(start.done, false);
  const middle = revealState(REVEAL_DURATION_MS * 0.5);
  assert.ok(middle.travel > 0 && middle.travel < 1);
  assert.ok(middle.flatten < 1);
  assert.equal(middle.opacity, 1, 'the cloth is still solid while it is clearly moving');
  const late = revealState(REVEAL_DURATION_MS * 0.9);
  assert.ok(late.opacity < 1 && late.opacity > 0);
  const end = revealState(REVEAL_DURATION_MS + 50);
  assert.equal(end.done, true);
  assert.equal(end.opacity, 0);
  const reduced = revealState(200, true);
  assert.equal(reduced.travel, 0);
  assert.ok(reduced.opacity < 1);
  assert.equal(revealState(Number.NaN).travel, 0);
});
