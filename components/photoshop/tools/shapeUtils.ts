/**
 * Shape and gradient canvas drawing utilities.
 */
export function drawShapeOnCanvas(
  ctx: CanvasRenderingContext2D,
  shapeType: string,
  x: number, y: number, w: number, h: number,
  fill: boolean, fillColor: string,
  stroke: boolean, strokeWidth: number, strokeColor: string,
  sides?: number, starRatio?: number
): void {
  ctx.save();
  if (fill) ctx.fillStyle = fillColor;
  if (stroke) { ctx.strokeStyle = strokeColor; ctx.lineWidth = strokeWidth; }

  switch (shapeType) {
    case 'rectangle':
      if (fill) ctx.fillRect(x, y, w, h);
      if (stroke) ctx.strokeRect(x, y, w, h);
      break;
    case 'ellipse': {
      const cx = x + w / 2, cy = y + h / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.closePath();
      if (fill) ctx.fill();
      if (stroke) ctx.stroke();
      break;
    }
    case 'line':
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y + h);
      ctx.stroke();
      break;
    case 'arrow': {
      const angle = Math.atan2(h, w);
      const headLen = Math.min(15, Math.sqrt(w * w + h * h) * 0.3);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y + h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + w, y + h);
      ctx.lineTo(x + w - headLen * Math.cos(angle - Math.PI / 6), y + h - headLen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(x + w - headLen * Math.cos(angle + Math.PI / 6), y + h - headLen * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      if (fill) ctx.fill();
      if (stroke) ctx.stroke();
      break;
    }
    case 'polygon': {
      const n = sides || 5;
      const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const a = (i * 2 * Math.PI) / n - Math.PI / 2;
        const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      if (fill) ctx.fill();
      if (stroke) ctx.stroke();
      break;
    }
    case 'star': {
      const n = sides || 5;
      const cx = x + w / 2, cy = y + h / 2;
      const outerR = Math.min(w, h) / 2, innerR = outerR * (starRatio ?? 0.4);
      ctx.beginPath();
      for (let i = 0; i < n * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const a = (i * Math.PI) / n - Math.PI / 2;
        const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      if (fill) ctx.fill();
      if (stroke) ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

export function drawGradientOnCanvas(
  ctx: CanvasRenderingContext2D,
  gradType: string,
  x: number, y: number, w: number, h: number,
  colorStops: { offset: number; color: string }[],
  angle: number, repeat: boolean
): void {
  ctx.save();
  let gradient: CanvasGradient | null = null;
  switch (gradType) {
    case 'linear': {
      const rad = (angle * Math.PI) / 180;
      const cx = x + w / 2, cy = y + h / 2;
      const len = Math.sqrt(w * w + h * h) / 2;
      gradient = ctx.createLinearGradient(
        cx - Math.cos(rad) * len, cy - Math.sin(rad) * len,
        cx + Math.cos(rad) * len, cy + Math.sin(rad) * len
      );
      break;
    }
    case 'radial': {
      const cx = x + w / 2, cy = y + h / 2, radius = Math.max(w, h) / 2;
      gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      break;
    }
    case 'conic': {
      gradient = ctx.createConicGradient((angle * Math.PI) / 180, x + w / 2, y + h / 2);
      break;
    }
  }
  if (gradient) {
    for (const stop of colorStops) gradient.addColorStop(stop.offset, stop.color);
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}
