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


// --- Clone Stamp / Healing Brush Utilities ---

/**
 * Apply clone stamp dab: copy pixels from (srcX, srcY) to (dstX, dstY) with the brush radius.
 * For healing mode, blend sampled color with surrounding destination pixels.
 */
export function drawCloneDab(
  dstCtx: CanvasRenderingContext2D,
  srcCanvas: HTMLCanvasElement,
  srcX: number, srcY: number,
  dstX: number, dstY: number,
  size: number,
  hardness: number,
  opacity: number,
  mode: 'clone' | 'heal',
): void {
  const radius = size / 2;
  const srcCtx = srcCanvas.getContext('2d');
  if (!srcCtx) return;

  // Get source pixels within the brush circle
  const x0 = Math.floor(srcX - radius);
  const y0 = Math.floor(srcY - radius);
  const diam = Math.ceil(size);

  if (diam <= 0) return;

  const clampedX0 = Math.max(0, x0);
  const clampedY0 = Math.max(0, y0);
  const clampedX1 = Math.min(srcCanvas.width, x0 + diam);
  const clampedY1 = Math.min(srcCanvas.height, y0 + diam);
  const w = clampedX1 - clampedX0;
  const h = clampedY1 - clampedY0;
  if (w <= 0 || h <= 0) return;

  let srcData: ImageData;
  try {
    srcData = srcCtx.getImageData(clampedX0, clampedY0, w, h);
  } catch { return; }

  // Get destination pixels in same region
  const dstX0 = Math.max(0, Math.floor(dstX - radius));
  const dstY0 = Math.max(0, Math.floor(dstY - radius));
  const dstX1 = Math.min(dstCtx.canvas.width, dstX0 + w);
  const dstY1 = Math.min(dstCtx.canvas.height, dstY0 + h);
  const dw = dstX1 - dstX0;
  const dh = dstY1 - dstY0;
  if (dw <= 0 || dh <= 0) return;

  let dstData: ImageData;
  try {
    dstData = dstCtx.getImageData(dstX0, dstY0, dw, dh);
  } catch { return; }

  for (let dy = 0; dy < dh; dy++) {
    for (let dx = 0; dx < dw; dx++) {
      // Position relative to brush center
      const relX = (dstX0 + dx) - dstX;
      const relY = (dstY0 + dy) - dstY;
      const dist = Math.sqrt(relX * relX + relY * relY);
      if (dist > radius) continue;

      // Hardness falloff
      const edge = hardness < 1 ? (1 - hardness) * radius : 0;
      let alpha = 1;
      if (edge > 0 && dist > radius - edge) {
        alpha = 1 - (dist - (radius - edge)) / edge;
      }
      alpha *= opacity;
      if (alpha <= 0) continue;

      const srcIdx = (dy * w + dx) * 4;
      const dstIdx = (dy * dw + dx) * 4;

      const sR = srcData.data[srcIdx];
      const sG = srcData.data[srcIdx + 1];
      const sB = srcData.data[srcIdx + 2];

      if (mode === 'heal') {
        // Simple healing: blend sampled color with destination average
        // Average surrounding destination pixels
        let avgR = 0, avgG = 0, avgB = 0, count = 0;
        const sampleRadius = Math.max(1, Math.floor(size / 4));
        for (let sy = -sampleRadius; sy <= sampleRadius; sy++) {
          for (let sx = -sampleRadius; sx <= sampleRadius; sx++) {
            const px = dx + sx;
            const py = dy + sy;
            if (px >= 0 && px < dw && py >= 0 && py < dh) {
              const i = (py * dw + px) * 4;
              avgR += dstData.data[i];
              avgG += dstData.data[i + 1];
              avgB += dstData.data[i + 2];
              count++;
            }
          }
        }
        if (count > 0) {
          avgR /= count; avgG /= count; avgB /= count;
          // Blend: sampled color matched to destination luminosity
          const srcLum = 0.299 * sR + 0.587 * sG + 0.114 * sB;
          const dstLum = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB;
          const ratio = dstLum > 0 ? dstLum / srcLum : 1;
          const blended = [
            Math.min(255, sR * ratio),
            Math.min(255, sG * ratio),
            Math.min(255, sB * ratio),
          ];
          dstData.data[dstIdx] = blended[0] * alpha + dstData.data[dstIdx] * (1 - alpha);
          dstData.data[dstIdx + 1] = blended[1] * alpha + dstData.data[dstIdx + 1] * (1 - alpha);
          dstData.data[dstIdx + 2] = blended[2] * alpha + dstData.data[dstIdx + 2] * (1 - alpha);
        }
      } else {
        // Direct clone
        dstData.data[dstIdx] = sR * alpha + dstData.data[dstIdx] * (1 - alpha);
        dstData.data[dstIdx + 1] = sG * alpha + dstData.data[dstIdx + 1] * (1 - alpha);
        dstData.data[dstIdx + 2] = sB * alpha + dstData.data[dstIdx + 2] * (1 - alpha);
      }
    }
  }

  dstCtx.putImageData(dstData, dstX0, dstY0);
}

// --- Retouch Tool Utilities ---

/**
 * Apply a box blur to a region of ImageData centered at (cx, cy) with the given radius.
 * Operates in-place on the data array.
 */
export function applyBlurRegion(
  data: Uint8ClampedArray, width: number, height: number,
  cx: number, cy: number, radius: number, strength: number,
): void {
  const r = Math.max(1, Math.floor(radius));
  const x0 = Math.max(0, Math.floor(cx - r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const x1 = Math.min(width, Math.ceil(cx + r) + 1);
  const y1 = Math.min(height, Math.ceil(cy + r) + 1);
  const w = x1 - x0;
  const h = y1 - y0;
  if (w <= 0 || h <= 0) return;

  const strengthF = strength / 100;

  // Copy original region
  const orig = new Uint8ClampedArray(w * h * 4);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = ((y - y0) * w + (x - x0)) * 4;
      orig[dstIdx] = data[srcIdx];
      orig[dstIdx + 1] = data[srcIdx + 1];
      orig[dstIdx + 2] = data[srcIdx + 2];
      orig[dstIdx + 3] = data[srcIdx + 3];
    }
  }

  // Box blur pass
  const blurR = Math.max(1, Math.floor(r * 0.5));
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist > r) continue;

      const localIdx = ((y - y0) * w + (x - x0)) * 4;
      let sumR = 0, sumG = 0, sumB = 0, count = 0;
      for (let ky = -blurR; ky <= blurR; ky++) {
        for (let kx = -blurR; kx <= blurR; kx++) {
          const px = x + kx;
          const py = y + ky;
          if (px >= x0 && px < x1 && py >= y0 && py < y1) {
            const i = ((py - y0) * w + (px - x0)) * 4;
            sumR += orig[i];
            sumG += orig[i + 1];
            sumB += orig[i + 2];
            count++;
          }
        }
      }
      if (count > 0) {
        sumR /= count; sumG /= count; sumB /= count;
        const srcIdx = (y * width + x) * 4;
        data[srcIdx] = sumR * strengthF + orig[localIdx] * (1 - strengthF);
        data[srcIdx + 1] = sumG * strengthF + orig[localIdx + 1] * (1 - strengthF);
        data[srcIdx + 2] = sumB * strengthF + orig[localIdx + 2] * (1 - strengthF);
      }
    }
  }
}

/**
 * Apply sharpen (unsharp mask) to a region of ImageData.
 * Kernel: center-weighted high-pass, e.g. [-1,-1,-1,-1,9,-1,-1,-1,-1]
 */
export function applySharpenRegion(
  data: Uint8ClampedArray, width: number, height: number,
  cx: number, cy: number, radius: number, strength: number,
): void {
  const r = Math.max(1, Math.floor(radius));
  const x0 = Math.max(1, Math.floor(cx - r));
  const y0 = Math.max(1, Math.floor(cy - r));
  const x1 = Math.min(width - 1, Math.ceil(cx + r) + 1);
  const y1 = Math.min(height - 1, Math.ceil(cy + r) + 1);

  const strengthF = strength / 100;
  const kernel = [-1, -1, -1, -1, 9, -1, -1, -1, -1];

  // Copy original region
  const orig = new Uint8ClampedArray(data);

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist > r) continue;

      for (let c = 0; c < 3; c++) {
        let val = 0;
        let ki = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            val += orig[idx] * kernel[ki++];
          }
        }
        const idx = (y * width + x) * 4 + c;
        data[idx] = Math.max(0, Math.min(255, val * strengthF + orig[idx] * (1 - strengthF)));
      }
    }
  }
}

/**
 * Apply smudge: push pixels from prev position toward current position with falloff.
 */
export function applySmudgeRegion(
  data: Uint8ClampedArray, width: number, height: number,
  fromX: number, fromY: number, toX: number, toY: number,
  radius: number, strength: number,
): void {
  const r = Math.max(1, Math.floor(radius / 2));
  const dist = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);
  const strengthF = strength / 100;

  const steps = Math.max(1, Math.floor(dist / Math.max(1, r * 0.3)));
  for (let s = 0; s < steps; s++) {
    const t = s / steps;
    const cx = fromX + (toX - fromX) * t;
    const cy = fromY + (toY - fromY) * t;

    const x0 = Math.max(0, Math.floor(cx - r));
    const y0 = Math.max(0, Math.floor(cy - r));
    const x1 = Math.min(width, Math.ceil(cx + r) + 1);
    const y1 = Math.min(height, Math.ceil(cy + r) + 1);
    const w = x1 - x0;
    const h = y1 - y0;
    if (w <= 0 || h <= 0) continue;

    // Copy destination region
    const dstOrig = new Uint8ClampedArray(w * h * 4);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const si = (y * width + x) * 4;
        const di = ((y - y0) * w + (x - x0)) * 4;
        dstOrig[di] = data[si];
        dstOrig[di + 1] = data[si + 1];
        dstOrig[di + 2] = data[si + 2];
        dstOrig[di + 3] = data[si + 3];
      }
    }

    // Sample source from the FROM position (previous cursor)
    const sx0 = Math.max(0, Math.floor(fromX - r));
    const sy0 = Math.max(0, Math.floor(fromY - r));

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const distFromCenter = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (distFromCenter > r) continue;

        const falloff = 1 - (distFromCenter / r);
        const alpha = falloff * falloff * strengthF;
        if (alpha < 0.01) continue;

        // Map destination position to source position (offset by from-to difference)
        const srcX = x + (fromX - toX) * t;
        const srcY = y + (fromY - toY) * t;

        const srcPx = Math.round(srcX);
        const srcPy = Math.round(srcY);
        if (srcPx < 0 || srcPx >= width || srcPy < 0 || srcPy >= height) continue;

        const srcIdx = (srcPy * width + srcPx) * 4;
        const dstIdx = (y * width + x) * 4;

        data[dstIdx] = data[srcIdx] * alpha + data[dstIdx] * (1 - alpha);
        data[dstIdx + 1] = data[srcIdx + 1] * alpha + data[dstIdx + 1] * (1 - alpha);
        data[dstIdx + 2] = data[srcIdx + 2] * alpha + data[dstIdx + 2] * (1 - alpha);
      }
    }
  }
}
