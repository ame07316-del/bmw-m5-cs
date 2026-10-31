// Reserve 100% for the moment the model is parsed and ready to render.
export function transferPercent(loaded, total, expectedSize) {
  const size = total > 0 ? total : expectedSize;
  if (!Number.isFinite(loaded) || !Number.isFinite(size) || size <= 0) return 0;
  return Math.max(0, Math.min(99, Math.floor((loaded / size) * 100)));
}
