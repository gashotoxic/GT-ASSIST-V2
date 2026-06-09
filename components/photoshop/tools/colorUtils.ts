/**
 * Color and brush utilities for Photoshop drawing tools.
 */

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Draw a single brush dab at (x, y) using arc() — fast and hardware-accelerated.
 */
export function drawDab(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  size: number, hardness: number,
  color: string,
  mode: 'brush' | 'eraser'
): void {
  ctx.save();

  if (mode === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'white';
  } else {
    ctx.fillStyle = color;
  }

  // Soft brush: use radial gradient for smooth falloff
  if (hardness < 1 && mode === 'brush') {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, size / 2);
    grad.addColorStop(0, color);
    grad.addColorStop(hardness, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
  }

  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draw a brush stroke segment between two points using interpolated dabs.
 */
export function drawBrushStroke(
  ctx: CanvasRenderingContext2D,
  fromX: number, fromY: number,
  toX: number, toY: number,
  size: number, hardness: number,
  opacity: number,
  color: string,
  mode: 'brush' | 'eraser'
): void {
  const dist = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);
  if (dist < 0.5) {
    // Single dot
    ctx.globalAlpha = opacity;
    drawDab(ctx, toX, toY, size, hardness, color, mode);
    ctx.globalAlpha = 1;
    return;
  }

  const step = Math.max(1, size * 0.3);
  const steps = Math.max(1, Math.floor(dist / step));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = fromX + (toX - fromX) * t;
    const py = fromY + (toY - fromY) * t;
    ctx.globalAlpha = opacity;
    drawDab(ctx, px, py, size, hardness, color, mode);
    ctx.globalAlpha = 1;
  }
}

/**
 * Fill the entire canvas with a solid color (for Fill tool).
 */
export function fillCanvas(
  canvas: HTMLCanvasElement,
  color: string
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}
