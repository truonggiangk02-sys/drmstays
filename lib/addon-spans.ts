/**
 * Column spans (of a 12-column grid) for the big add-on tiles: wide and medium tiles alternate, and a short last row is stretched
 * to the full width so the grid never ends with a gap.
 */
export function addonSpans(count: number): number[] {
  const pattern = [6, 3, 3, 3, 3, 6];
  const spans = Array.from({ length: count }, (_, index) => pattern[index % pattern.length]);
  let row = 0, rowStart = 0;
  spans.forEach((span, index) => { row += span; if (row >= 12) { row = 0; rowStart = index + 1; } });
  if (row > 0 && spans.length > rowStart) {
    const left = spans.length - rowStart, each = Math.floor(12 / left);
    for (let i = rowStart; i < spans.length; i++) spans[i] = i === spans.length - 1 ? 12 - each * (left - 1) : each;
  }
  return spans;
}
