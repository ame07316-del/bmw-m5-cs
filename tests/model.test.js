import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

test('the full and lite web models are compressed, self-contained GLBs', () => {
  for (const path of ['../public/models/m4.glb', '../public/models/m4-lite.glb']) {
    const buffer = readFileSync(new URL(path, import.meta.url));
    assert.equal(buffer.readUInt32LE(0), 0x46546c67); // glTF magic
    assert.equal(buffer.readUInt32LE(4), 2);
    assert.equal(buffer.readUInt32LE(8), buffer.length);
    assert.ok(buffer.length < 10_000_000);
    const jsonLength = buffer.readUInt32LE(12);
    const model = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString());
    assert.ok(model.extensionsRequired.includes('EXT_meshopt_compression'));
    assert.ok(model.extensionsRequired.includes('EXT_texture_webp'));
    assert.ok(model.meshes.length > 0);
    assert.ok(model.images.every((image) => image.bufferView !== undefined));
  }
  assert.ok(statSync(new URL('../public/models/m4-lite.glb', import.meta.url)).size < statSync(new URL('../public/models/m4.glb', import.meta.url)).size);
});

test('the loading artwork and all three local M4 recordings exist', () => {
  for (const path of ['../public/images/m4-poster.png', '../public/images/m4-outline.png', '../public/audio/m4-start.mp3', '../public/audio/m4-idle.mp3', '../public/audio/m4-rev.mp3']) {
    assert.ok(statSync(new URL(path, import.meta.url)).size > 1000, path);
  }
});

test('the linked asset credits retain the model attribution and license', () => {
  const credits = readFileSync(new URL('../public/credits.html', import.meta.url), 'utf8');
  assert.match(credits, /VTDAT23/);
  assert.match(credits, /creativecommons\.org\/licenses\/by\/4\.0/);
  assert.match(credits, /optimized for the web/);
  assert.match(credits, /Amr Eskander/);
});
