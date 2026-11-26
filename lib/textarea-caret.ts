const COPIED = [
  'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'lineHeight', 'textTransform', 'wordSpacing', 'textIndent', 'tabSize',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
] as const;

/**
 * How far down the inside of a textarea the text at `offset` is, in pixels (before any scrolling). Measured on a hidden copy
 * of the text with the same font and width, so it is exact however the lines wrap. Browser only.
 */
export function caretTop(area: HTMLTextAreaElement, offset: number): number {
  const style = getComputedStyle(area);
  const mirror = document.createElement('div');
  for (const name of COPIED) mirror.style[name] = style[name];
  Object.assign(mirror.style, { position: 'absolute', visibility: 'hidden', top: '0', left: '-9999px', boxSizing: 'border-box', width: `${area.clientWidth}px`, whiteSpace: 'pre-wrap', overflowWrap: 'break-word', overflow: 'hidden', border: '0' });
  mirror.textContent = area.value.slice(0, offset);
  const marker = document.createElement('span');
  marker.textContent = area.value.slice(offset) || '.';
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
  const top = marker.offsetTop;
  mirror.remove();
  return top;
}
