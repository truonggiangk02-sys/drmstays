/**
 * Splits photos (given by width over height) into rows so that every row fills the full width and has about the same height,
 * with no photo cropped. Rows are cut where the running total of ratios passes an equal share, so the last row is never a stray one.
 * Returns the indices of the photos of each row.
 */
export function balancedRows(ratios: number[], width: number, target: number): number[][] {
  const n = ratios.length;
  if (!n) return [];
  const total = ratios.reduce((sum, ratio) => sum + ratio, 0);
  const k = Math.min(n, Math.max(1, Math.round((total * target) / Math.max(width, 1))));
  const rows: number[][] = Array.from({ length: k }, () => []);
  let used = 0;
  ratios.forEach((ratio, index) => {
    const row = Math.min(k - 1, Math.floor(((used + ratio / 2) * k) / total));
    rows[row].push(index);
    used += ratio;
  });
  return rows.filter(row => row.length > 0);
}

/** Width over height of a photo, kept to a sane range so one extreme picture cannot ruin a row or a frame. */
export const photoRatio = (photo: { width?: number; height?: number }) => photo.width && photo.height ? Math.min(2.4, Math.max(0.55, photo.width / photo.height)) : 1.4;
