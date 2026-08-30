/**
 * Canvas image processing utilities for the Photoshop Editor.
 * Pure Canvas 2D API — no external dependencies.
 * All pixel operations clamp values to 0-255.
 */

function clamp(val: number): number {
  return Math.max(0, Math.min(255, Math.round(val)));
}

function clampF(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360; s /= 100; l /= 100;
  if (s === 0) { const val = Math.round(l * 255); return [val, val, val]; }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1/3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1/3) * 255),
  ];
}

export function applyBrightnessContrast(imageData: ImageData, brightness = 0, contrast = 0): ImageData {
  brightness = clampF(brightness, -100, 100);
  contrast = clampF(contrast, -100, 100);
  const factor = contrast === 0 ? 1 : (259 * (contrast + 255)) / (255 * (259 - contrast));
  const data = new Uint8ClampedArray(imageData.data);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp(data[i] + brightness);
    data[i + 1] = clamp(data[i + 1] + brightness);
    data[i + 2] = clamp(data[i + 2] + brightness);
    if (contrast !== 0) {
      data[i] = clamp(factor * (data[i] - 128) + 128);
      data[i + 1] = clamp(factor * (data[i + 1] - 128) + 128);
      data[i + 2] = clamp(factor * (data[i + 2] - 128) + 128);
    }
  }
  return new ImageData(data, imageData.width, imageData.height);
}

export function applyHSL(imageData: ImageData, hue = 0, saturation = 0, lightness = 0): ImageData {
  hue = clampF(hue, -180, 180);
  saturation = clampF(saturation, -100, 100);
  lightness = clampF(lightness, -100, 100);
  const data = new Uint8ClampedArray(imageData.data);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    let [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    h = (h + hue + 360) % 360;
    s = clampF(s * (1 + saturation / 100), 0, 100);
    l = clampF(l + lightness, 0, 100);
    const [r, g, b] = hslToRgb(h, s, l);
    data[i] = r; data[i + 1] = g; data[i + 2] = b;
  }
  return new ImageData(data, imageData.width, imageData.height);
}

export function applyLevels(imageData: ImageData, black = 0, white = 255, gamma = 1.0): ImageData {
  black = clampF(black, 0, 255);
  white = clampF(white, 0, 255);
  gamma = clampF(gamma, 0.1, 10.0);
  if (white <= black) white = black + 1;
  const range = white - black;
  const invGamma = 1 / gamma;
  const data = new Uint8ClampedArray(imageData.data);
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const val = data[i + c];
      if (val <= black) { data[i + c] = 0; }
      else if (val >= white) { data[i + c] = 255; }
      else { data[i + c] = clamp(Math.pow((val - black) / range, invGamma) * 255); }
    }
  }
  return new ImageData(data, imageData.width, imageData.height);
}

export function applyBlur(imageData: ImageData, radius = 1): ImageData {
  radius = Math.max(1, Math.min(20, Math.round(radius)));
  const w = imageData.width, h = imageData.height;
  const src = new Uint8ClampedArray(imageData.data);
  const tmp = new Uint8ClampedArray(src);
  const dst = new Uint8ClampedArray(src);
  // Horizontal
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      for (let kx = -radius; kx <= radius; kx++) {
        const px = x + kx;
        if (px < 0 || px >= w) continue;
        const idx = (y * w + px) * 4;
        r += src[idx]; g += src[idx + 1]; b += src[idx + 2]; a += src[idx + 3];
        count++;
      }
      if (count > 0) {
        const idx = (y * w + x) * 4;
        tmp[idx] = r / count; tmp[idx + 1] = g / count;
        tmp[idx + 2] = b / count; tmp[idx + 3] = a / count;
      }
    }
  }
  // Vertical
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      for (let ky = -radius; ky <= radius; ky++) {
        const py = y + ky;
        if (py < 0 || py >= h) continue;
        const idx = (py * w + x) * 4;
        r += tmp[idx]; g += tmp[idx + 1]; b += tmp[idx + 2]; a += tmp[idx + 3];
        count++;
      }
      if (count > 0) {
        const idx = (y * w + x) * 4;
        dst[idx] = clamp(r / count); dst[idx + 1] = clamp(g / count);
        dst[idx + 2] = clamp(b / count); dst[idx + 3] = clamp(a / count);
      }
    }
  }
  return new ImageData(dst, w, h);
}

export function applySharpen(imageData: ImageData, amount = 0): ImageData {
  amount = clampF(amount, 0, 100) / 100;
  const w = imageData.width, h = imageData.height;
  const src = new Uint8ClampedArray(imageData.data);
  const dst = new Uint8ClampedArray(src);
  const k = [[0, -1, 0], [-1, 5, -1], [0, -1, 0]];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const px = x + kx, py = y + ky;
          if (px < 0 || px >= w || py < 0 || py >= h) continue;
          const idx = (py * w + px) * 4;
          r += src[idx] * k[ky + 1][kx + 1];
          g += src[idx + 1] * k[ky + 1][kx + 1];
          b += src[idx + 2] * k[ky + 1][kx + 1];
        }
      }
      const idx = (y * w + x) * 4;
      dst[idx] = clamp(amount * r + (1 - amount) * src[idx]);
      dst[idx + 1] = clamp(amount * g + (1 - amount) * src[idx + 1]);
      dst[idx + 2] = clamp(amount * b + (1 - amount) * src[idx + 2]);
      dst[idx + 3] = src[idx + 3];
    }
  }
  return new ImageData(dst, w, h);
}

export function applyFilterPreset(imageData: ImageData, preset = 'grayscale'): ImageData {
  const data = new Uint8ClampedArray(imageData.data);
  switch (preset) {
    case 'grayscale':
      for (let i = 0; i < data.length; i += 4) {
        const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = data[i + 1] = data[i + 2] = clamp(g);
      }
      break;
    case 'sepia':
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        data[i] = clamp(r * 0.393 + g * 0.769 + b * 0.189);
        data[i + 1] = clamp(r * 0.349 + g * 0.686 + b * 0.168);
        data[i + 2] = clamp(r * 0.272 + g * 0.534 + b * 0.131);
      }
      break;
    case 'invert':
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i]; data[i + 1] = 255 - data[i + 1]; data[i + 2] = 255 - data[i + 2];
      }
      break;
    case 'vintage':
      for (let i = 0; i < data.length; i += 4) {
        const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = clamp(g * 0.393 + g * 0.769 + g * 0.189 + 10);
        data[i + 1] = clamp(g * 0.349 + g * 0.686 + g * 0.168);
        data[i + 2] = clamp(g * 0.272 + g * 0.534 + g * 0.131 - 5);
      }
      break;
    case 'cool':
      for (let i = 0; i < data.length; i += 4) {
        data[i] = clamp(data[i] * 0.7); data[i + 2] = clamp(data[i + 2] * 1.3);
      }
      break;
    case 'warm':
      for (let i = 0; i < data.length; i += 4) {
        data[i] = clamp(data[i] * 1.3); data[i + 2] = clamp(data[i + 2] * 0.7);
      }
      break;
    case 'noir':
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const val = clamp((gray - 128) * 1.5 + 128 + (Math.random() - 0.5) * 16);
        data[i] = data[i + 1] = data[i + 2] = val;
      }
      break;
  }
  return new ImageData(data, imageData.width, imageData.height);
}

export function compositeAdjustment(
  canvas: HTMLCanvasElement,
  adjustment: string,
  params: Record<string, number | string>
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const offscreen = document.createElement('canvas');
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
      const ctx = offscreen.getContext('2d');
      if (!ctx) { reject(new Error('No context')); return; }
      ctx.drawImage(canvas, 0, 0);
      let imageData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
      switch (adjustment) {
        case 'brightnessContrast': imageData = applyBrightnessContrast(imageData, params.brightness, params.contrast); break;
        case 'hsl': imageData = applyHSL(imageData, params.hue, params.saturation, params.lightness); break;
        case 'levels': imageData = applyLevels(imageData, params.black || params.blackPoint, params.white || params.whitePoint, params.gamma); break;
        case 'blur': imageData = applyBlur(imageData, params.radius); break;
        case 'sharpen': imageData = applySharpen(imageData, params.amount); break;
        case 'filterPreset': imageData = applyFilterPreset(imageData, params.preset); break;
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(offscreen.toDataURL());
    } catch (err) { reject(err); }
  });
}
