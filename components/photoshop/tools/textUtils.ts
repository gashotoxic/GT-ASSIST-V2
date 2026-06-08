/**
 * Render multi-line text onto an offscreen canvas, return the canvas.
 */
export function renderTextOnCanvas(
  text: string,
  fontFamily: string,
  fontSize: number,
  fontWeight: string,
  fontStyle: string,
  color: string,
  textAlign: string,
  lineHeight: number,
  bgColor?: string,
  maxWidth?: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context');

  const font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.font = font;

  const lineHeightPx = fontSize * lineHeight;
  const lines = wrapTextToLines(text, maxWidth ? undefined : maxWidth);

  // Measure each line
  const lineWidths: number[] = [];
  let maxLineWidth = 0;
  for (const line of lines) {
    const w = ctx.measureText(line).width;
    lineWidths.push(w);
    if (w > maxLineWidth) maxLineWidth = w;
  }

  const padding = 20;
  const cw = maxWidth || maxLineWidth + padding * 2;
  const ch = lines.length * lineHeightPx + padding * 2;

  canvas.width = Math.ceil(cw);
  canvas.height = Math.ceil(ch);

  // Re-apply font after canvas resize (context resets)
  const ctx2 = canvas.getContext('2d')!;
  ctx2.font = font;
  ctx2.textBaseline = 'top';

  if (bgColor) {
    ctx2.fillStyle = bgColor;
    ctx2.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx2.fillStyle = color;
  for (let i = 0; i < lines.length; i++) {
    const y = padding + i * lineHeightPx;
    let x = padding;
    if (textAlign === 'center') x = padding + (cw - padding * 2 - lineWidths[i]) / 2;
    else if (textAlign === 'right') x = cw - padding - lineWidths[i];
    ctx2.fillText(lines[i], x, y);
  }

  return canvas;
}

function wrapTextToLines(text: string, maxWidth?: number): string[] {
  const paragraphs = text.split('\n');
  const lines: string[] = [];
  for (const p of paragraphs) {
    if (!maxWidth) { lines.push(p); continue; }
    const words = p.split(' ');
    let cur = '';
    for (const word of words) {
      const test = cur ? cur + ' ' + word : word;
      if (test.length > maxWidth && cur) {
        lines.push(cur);
        cur = word;
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
  }
  return lines;
}
