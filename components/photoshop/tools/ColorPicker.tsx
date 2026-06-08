import React, { useCallback, useEffect, useRef } from 'react';
import { ColorState, DEFAULT_COLOR, hexToRgb, rgbToHsl, rgbToHex, hslToRgb } from '../../../types/photoshop';

interface ColorPickerProps {
  color: ColorState;
  onChange: (color: ColorState) => void;
}

const SWATCHES = [
  '#1abc9c', '#3498db', '#9b59b6', '#e74c3c', '#e67e22', '#f1c40f',
  '#2ecc71', '#1a1a2e', '#34495e', '#95a5a6', '#ffffff', '#000000',
];

export const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange }) => {
  const satCanvasRef = useRef<HTMLCanvasElement>(null);
  const hueCanvasRef = useRef<HTMLCanvasElement>(null);
  const alphaCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef<string | null>(null);

  // Render saturation-brightness square
  useEffect(() => {
    const canvas = satCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    // Background hue
    const base = hslToRgb(color.hsl.h, 100, 50);
    ctx.fillStyle = rgbToHex(base.r, base.g, base.b);
    ctx.fillRect(0, 0, w, h);
    // White gradient (saturation left->right)
    const whiteGrad = ctx.createLinearGradient(0, 0, w, 0);
    whiteGrad.addColorStop(0, '#ffffff');
    whiteGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = whiteGrad;
    ctx.fillRect(0, 0, w, h);
    // Black gradient (brightness bottom->top)
    const blackGrad = ctx.createLinearGradient(0, h, 0, 0);
    blackGrad.addColorStop(0, '#000000');
    blackGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = blackGrad;
    ctx.fillRect(0, 0, w, h);
    // Crosshair at current position
    const sx = (color.hsl.s / 100) * w;
    const sy = (1 - color.hsl.l / 100) * h;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx - 5, sy - 5, 10, 10);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx - 5, sy - 5, 10, 10);
  }, [color]);

  // Render hue slider
  useEffect(() => {
    const canvas = hueCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    for (let i = 0; i <= 360; i += 60) {
      const { r, g, b } = hslToRgb(i, 100, 50);
      grad.addColorStop(i / 360, rgbToHex(r, g, b));
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    // Indicator
    const y = (color.hsl.h / 360) * h;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, y - 4, w, 8);
  }, [color]);

  // Render alpha slider
  useEffect(() => {
    const canvas = alphaCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    // Checkerboard
    const ts = 6;
    for (let y = 0; y < h; y += ts) {
      for (let x = 0; x < w; x += ts) {
        const even = (Math.floor(x / ts) + Math.floor(y / ts)) % 2 === 0;
        ctx.fillStyle = even ? '#ccc' : '#888';
        ctx.fillRect(x, y, ts, ts);
      }
    }
    // Alpha gradient: current color → transparent
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, color.hex);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    // Indicator
    const y = (1 - color.alpha) * h;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, y - 4, w, 8);
  }, [color]);

  const handleSatMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    isDragging.current = 'sat';
    handleSatMove(e);
  }, [color]);
  const handleSatMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging.current) return;
    const canvas = satCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const s = Math.round(x * 100);
    const l = Math.round((1 - y) * 100);
    const rgb = hslToRgb(color.hsl.h, s, l);
    onChange({ hex: rgbToHex(rgb.r, rgb.g, rgb.b), rgb, hsl: { h: color.hsl.h, s, l }, alpha: color.alpha });
  }, [color, onChange]);

  const handleHueMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    isDragging.current = 'hue';
    handleHueMove(e);
  }, [color]);
  const handleHueMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging.current) return;
    const canvas = hueCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const h = Math.round(y * 360);
    const rgb = hslToRgb(h, color.hsl.s, color.hsl.l);
    onChange({ hex: rgbToHex(rgb.r, rgb.g, rgb.b), rgb, hsl: { h, s: color.hsl.s, l: color.hsl.l }, alpha: color.alpha });
  }, [color, onChange]);

  const handleAlphaMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    isDragging.current = 'alpha';
    handleAlphaMove(e);
  }, [color]);
  const handleAlphaMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging.current) return;
    const canvas = alphaCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    onChange({ ...color, alpha: Math.round((1 - y) * 100) / 100 });
  }, [color, onChange]);

  const handleMouseUp = useCallback(() => { isDragging.current = null; }, []);

  const handleHexChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      const rgb = hexToRgb(val);
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      onChange({ hex: val, rgb, hsl, alpha: color.alpha });
    }
  }, [color, onChange]);

  return (
    <div className="p-2 space-y-2" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Color</div>
      {/* Current color preview */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded border border-slate-600" style={{ backgroundColor: color.hex, opacity: color.alpha }} />
        <input
          value={color.hex}
          onChange={handleHexChange}
          className="flex-1 bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-200 font-mono uppercase outline-none"
          maxLength={7}
        />
      </div>
      {/* Saturation/Brightness square */}
      <canvas ref={satCanvasRef} width={200} height={150}
        className="w-full h-[110px] rounded cursor-crosshair"
        onMouseDown={handleSatMouseDown} onMouseMove={handleSatMove} />
      {/* Hue slider */}
      <canvas ref={hueCanvasRef} width={20} height={150}
        className="w-full h-[18px] rounded cursor-pointer"
        onMouseDown={handleHueMouseDown} onMouseMove={handleHueMove} />
      {/* Alpha slider */}
      <canvas ref={alphaCanvasRef} width={20} height={150}
        className="w-full h-[18px] rounded cursor-pointer"
        onMouseDown={handleAlphaMouseDown} onMouseMove={handleAlphaMove} />
      {/* Swatches */}
      <div className="flex flex-wrap gap-1">
        {SWATCHES.map(s => (
          <button key={s} onClick={() => {
            const rgb = hexToRgb(s);
            const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
            onChange({ hex: s, rgb, hsl, alpha: color.alpha });
          }}
            className="w-5 h-5 rounded border border-slate-600 hover:scale-110 transition-transform"
            style={{ backgroundColor: s }}
          />
        ))}
      </div>
    </div>
  );
};
