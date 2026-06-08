/**
 * Color utilities for the Photoshop drawing tools.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Creates a circle brush alpha mask (1D array).
 */
export function createCircleBrush(size: number, hardness: number): Uint8ClampedArray {
  const mask = new Uint8ClampedArray(size * size);
  const radius = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - radius + 0.5;
      const dy = y - radius + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist >= radius) {
        mask[y * size + x] = 0;
      } else {
        const t = dist / radius;
        let alpha: number;
        if (t <= hardness) {
          alpha = 255;
        } else {
          const s = (t - hardness) / (1 - hardness);
          alpha = Math.round((1 - s * s * (3 - 2 * s)) * 255);
        }
        mask[y * size + x] = Math.max(0, alpha);
      }
    }
  }
  return mask;
}

/**
 * Paint a dab on a canvas at (x, y) with brush parameters.
 */
export function applyPaintOnCanvas(
  canvas: HTMLCanvasElement,
  x: number, y: number,
  size: number, hardness: number, opacity: number,
  color: string,
  mode: 'brush' | 'eraser'
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const mask = createCircleBrush(size, hardness);
  const radius = size / 2;
  const sx = Math.round(x - radius);
  const sy = Math.round(y - radius);
  const startX = Math.max(0, sx);
  const startY = Math.max(0, sy);
  const endX = Math.min(canvas.width, sx + size);
  const endY = Math.min(canvas.height, sy + size);

  if (mode === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = color;
  }

  for (let py = startY; py < endY; py++) {
    for (let px = startX; px < endX; px++) {
      const mx = px - sx;
      const my = py - sy;
      const a = mask[my * size + mx] / 255;
      if (a > 0) {
        ctx.globalAlpha = a * opacity;
        ctx.fillRect(px, py, 1, 1);
      }
    }
  }

  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}
