export const PHOTO_DATA_URL_LIMIT = 350_000;

export function fittedPhotoEdge(width: number, height: number, maxEdge = 960) {
  const safeWidth = Math.max(1, Math.round(width) || 1);
  const safeHeight = Math.max(1, Math.round(height) || 1);
  const longest = Math.max(safeWidth, safeHeight);
  if (longest <= maxEdge) return { width: safeWidth, height: safeHeight };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
  };
}

export function photoWithinLimit(dataUrl: string, limit = PHOTO_DATA_URL_LIMIT) {
  return dataUrl.length > 0 && dataUrl.length <= limit;
}
