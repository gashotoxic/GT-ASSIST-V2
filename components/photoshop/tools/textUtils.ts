/**
 * Text rendering utilities for the Photoshop Editor.
 * Renders text onto a canvas context so text layers are rendered live.
 */

export interface TextLayerData {
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'light' | 'regular' | 'bold' | 'black';
  fontStyle: 'normal' | 'italic';
  color: string;
  bgColor?: string;
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
  letterSpacing: number;
}

/**
 * Render multi-line text onto a canvas context at (x, y) with the given width/height bounds.
 */
export function renderTextOnCtx(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontFamily: string,
  fontSize: number,
  fontWeight: 'light' | 'regular' | 'bold' | 'black',
  fontStyle: 'normal' | 'italic',
  color: string,
  bgColor: string | undefined,
  textAlign: 'left' | 'center' | 'right',
  lineHeight: number,
  x: number, y: number,
  width: number, height: number
): void {
  ctx.save();
  ctx.textBaseline = 'top';
  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px "${fontFamily}", sans-serif`;
  ctx.textAlign = textAlign;

  // Background fill
  if (bgColor) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, width, height);
  }

  // Word-wrap text
  const lines: string[] = [];
  const words = text.split(' ');
  let current = '';
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    const metrics = ctx.measureText(test);
    if (metrics.width > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);

  // Calculate vertical centering
  const totalHeight = lines.length * fontSize * lineHeight;
  let startY = y + (height - totalHeight) / 2;
  if (startY < y) startY = y;

  ctx.fillStyle = color;
  let cursorX = x;
  for (const line of lines) {
    if (textAlign === 'center') cursorX = x + width / 2;
    else if (textAlign === 'right') cursorX = x + width;
    else cursorX = x;
    ctx.fillText(line, cursorX, startY);
    startY += fontSize * lineHeight;
  }
  ctx.restore();
}

/**
 * Render text to an offscreen canvas and return the data URL.
 * Used for initial text layer creation.
 */
export function renderTextToDataUrl(
  text: string,
  fontFamily: string,
  fontSize: number,
  fontWeight: 'light' | 'regular' | 'bold' | 'black',
  fontStyle: 'normal' | 'italic',
  color: string,
  bgColor: string | undefined,
  textAlign: 'left' | 'center' | 'right',
  lineHeight: number,
  maxWidth: number
): { dataUrl: string; width: number; height: number } {
  const offscreen = document.createElement('canvas');
  const ctx = offscreen.getContext('2d')!;

  // Measure text to determine canvas size
  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px "${fontFamily}", sans-serif`;
  const words = text.split(' ');
  let current = '';
  let maxLineWidth = 0;
  const lines: string[] = [];
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    const metrics = ctx.measureText(test);
    if (metrics.width > maxWidth && current) {
      lines.push(current);
      maxLineWidth = Math.max(maxLineWidth, ctx.measureText(current).width);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) {
    lines.push(current);
    maxLineWidth = Math.max(maxLineWidth, ctx.measureText(current).width);
  }

  const w = Math.max(maxLineWidth + fontSize, maxWidth);
  const h = Math.max(lines.length * fontSize * lineHeight + fontSize, fontSize * 2);
  offscreen.width = Math.ceil(w);
  offscreen.height = Math.ceil(h);

  renderTextOnCtx(
    ctx, text, fontFamily, fontSize, fontWeight, fontStyle,
    color, bgColor, textAlign, lineHeight,
    0, 0, offscreen.width, offscreen.height
  );

  return { dataUrl: offscreen.toDataURL(), width: offscreen.width, height: offscreen.height };
}

/**
 * Re-render a text layer's dataUrl from its text metadata.
 * Called when text properties change.
 */
export function rerenderTextLayer(textData: TextLayerData): { dataUrl: string; width: number; height: number } {
  return renderTextToDataUrl(
    textData.content, textData.fontFamily, textData.fontSize,
    textData.fontWeight, textData.fontStyle,
    textData.color, textData.bgColor,
    textData.textAlign, textData.lineHeight, 400
  );
}
