import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { drawText, fitText, GLYPH_HEIGHT, measureText } from './font.js';

export type RGBA = [number, number, number, number];

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function readPng(file: string): PNG {
  return PNG.sync.read(readFileSync(file));
}

export function decodePng(buffer: Buffer): PNG {
  return PNG.sync.read(buffer);
}

export function encodePng(png: PNG): Buffer {
  return PNG.sync.write(png, { colorType: 6, deflateLevel: 6 });
}

export function writePng(file: string, png: PNG): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, encodePng(png));
}

export function parseHexColor(hex: string): RGBA {
  const m = /^#?([0-9a-f]{3,8})$/i.exec(hex.trim());
  if (!m) return [255, 0, 128, 255];
  let h = m[1];
  if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
  return [n(0), n(2), n(4), h.length >= 8 ? n(6) : 255];
}

export function createImage(width: number, height: number, fill: RGBA = [255, 255, 255, 255]): PNG {
  const png = new PNG({ width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) });
  const { data } = png;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill[0];
    data[i + 1] = fill[1];
    data[i + 2] = fill[2];
    data[i + 3] = fill[3];
  }
  return png;
}

/** Copies a region of `src` into `dst` at (dx, dy), clipped to both images. */
export function blit(src: PNG, dst: PNG, dx: number, dy: number, sx = 0, sy = 0, w = src.width - sx, h = src.height - sy): void {
  let x0 = Math.round(sx);
  let y0 = Math.round(sy);
  let tx = Math.round(dx);
  let ty = Math.round(dy);
  const x1 = Math.min(x0 + Math.round(w), src.width);
  const y1 = Math.min(y0 + Math.round(h), src.height);
  if (x0 < 0) {
    tx -= x0;
    x0 = 0;
  }
  if (y0 < 0) {
    ty -= y0;
    y0 = 0;
  }
  if (tx < 0) {
    x0 -= tx;
    tx = 0;
  }
  if (ty < 0) {
    y0 -= ty;
    ty = 0;
  }
  const width = Math.min(x1 - x0, dst.width - tx);
  const height = Math.min(y1 - y0, dst.height - ty);
  if (width <= 0 || height <= 0) return;
  for (let row = 0; row < height; row++) {
    const s = ((y0 + row) * src.width + x0) * 4;
    const d = ((ty + row) * dst.width + tx) * 4;
    src.data.copy(dst.data, d, s, s + width * 4);
  }
}

export function clampBox(box: Box, width: number, height: number): Box {
  const x = Math.max(0, Math.min(width, Math.round(box.x)));
  const y = Math.max(0, Math.min(height, Math.round(box.y)));
  const right = Math.max(x, Math.min(width, Math.round(box.x + box.width)));
  const bottom = Math.max(y, Math.min(height, Math.round(box.y + box.height)));
  return { x, y, width: right - x, height: bottom - y };
}

export function unionBox(a: Box, b: Box): Box {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, width: Math.max(a.x + a.width, b.x + b.width) - x, height: Math.max(a.y + a.height, b.y + b.height) - y };
}

export function intersects(a: Box, b: Box, margin = 0): boolean {
  return a.x - margin < b.x + b.width && b.x - margin < a.x + a.width && a.y - margin < b.y + b.height && b.y - margin < a.y + a.height;
}

export function crop(src: PNG, box: Box, fill: RGBA = [255, 255, 255, 255]): PNG {
  const out = createImage(box.width, box.height, fill);
  blit(src, out, 0, 0, box.x, box.y, box.width, box.height);
  return out;
}

export function padTo(src: PNG, width: number, height: number, fill: RGBA): PNG {
  if (src.width === width && src.height === height) return src;
  const out = createImage(width, height, fill);
  blit(src, out, 0, 0);
  return out;
}

export function fillRect(png: PNG, box: Box, color: RGBA): void {
  const b = clampBox(box, png.width, png.height);
  const alpha = color[3] / 255;
  for (let y = b.y; y < b.y + b.height; y++) {
    for (let x = b.x; x < b.x + b.width; x++) {
      const i = (y * png.width + x) * 4;
      png.data[i] = Math.round(color[0] * alpha + png.data[i] * (1 - alpha));
      png.data[i + 1] = Math.round(color[1] * alpha + png.data[i + 1] * (1 - alpha));
      png.data[i + 2] = Math.round(color[2] * alpha + png.data[i + 2] * (1 - alpha));
      png.data[i + 3] = 255;
    }
  }
}

export function strokeRect(png: PNG, box: Box, color: RGBA, thickness: number): void {
  const t = Math.max(1, Math.round(thickness));
  fillRect(png, { x: box.x - t, y: box.y - t, width: box.width + 2 * t, height: t }, color);
  fillRect(png, { x: box.x - t, y: box.y + box.height, width: box.width + 2 * t, height: t }, color);
  fillRect(png, { x: box.x - t, y: box.y, width: t, height: box.height }, color);
  fillRect(png, { x: box.x + box.width, y: box.y, width: t, height: box.height }, color);
}

/** Grayscale copy blended towards white, used as the backdrop of the diff panel. */
export function fadeToGray(src: PNG, keep = 0.3): PNG {
  const out = new PNG({ width: src.width, height: src.height });
  const { data } = src;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255;
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const v = Math.round(255 - (255 - lum * alpha - 255 * (1 - alpha)) * keep);
    out.data[i] = v;
    out.data[i + 1] = v;
    out.data[i + 2] = v;
    out.data[i + 3] = 255;
  }
  return out;
}

/** Resizes to `width` (keeping aspect ratio): area averaging when shrinking, nearest neighbour when growing. */
export function resizeToWidth(src: PNG, width: number): PNG {
  const target = Math.max(1, Math.round(width));
  if (target === src.width) return src;
  const ratio = src.width / target;
  const height = Math.max(1, Math.round(src.height / ratio));
  const out = new PNG({ width: target, height });
  if (ratio < 1) {
    for (let y = 0; y < height; y++) {
      const sy = Math.min(src.height - 1, Math.floor(y * ratio));
      for (let x = 0; x < target; x++) {
        const sx = Math.min(src.width - 1, Math.floor(x * ratio));
        src.data.copy(out.data, (y * target + x) * 4, (sy * src.width + sx) * 4, (sy * src.width + sx) * 4 + 4);
      }
    }
    return out;
  }
  const yRatio = src.height / height;
  for (let y = 0; y < height; y++) {
    const y0 = Math.floor(y * yRatio);
    const y1 = Math.max(y0 + 1, Math.min(src.height, Math.floor((y + 1) * yRatio)));
    for (let x = 0; x < target; x++) {
      const x0 = Math.floor(x * ratio);
      const x1 = Math.max(x0 + 1, Math.min(src.width, Math.floor((x + 1) * ratio)));
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;
      for (let yy = y0; yy < y1; yy++) {
        let i = (yy * src.width + x0) * 4;
        for (let xx = x0; xx < x1; xx++, i += 4) {
          r += src.data[i];
          g += src.data[i + 1];
          b += src.data[i + 2];
          a += src.data[i + 3];
          n++;
        }
      }
      const o = (y * target + x) * 4;
      out.data[o] = Math.round(r / n);
      out.data[o + 1] = Math.round(g / n);
      out.data[o + 2] = Math.round(b / n);
      out.data[o + 3] = Math.round(a / n);
    }
  }
  return out;
}

export interface Panel {
  image: PNG;
  label: string;
  accent: RGBA;
}

export interface ComposeOptions {
  gap?: number;
  padding?: number;
  maxWidth?: number;
  background?: RGBA;
  /** Font scale; derived from the panel width when omitted. */
  scale?: number;
}

export const COLORS = {
  background: [243, 244, 246, 255] as RGBA,
  before: [75, 85, 99, 255] as RGBA,
  after: [22, 128, 61, 255] as RGBA,
  diff: [190, 24, 93, 255] as RGBA,
  variant: [67, 56, 202, 255] as RGBA,
  text: [255, 255, 255, 255] as RGBA,
  pad: [229, 231, 235, 255] as RGBA,
};

/** Places panels side by side, each under a coloured label bar. */
export function composeRow(panels: Panel[], opts: ComposeOptions = {}): PNG {
  const widest = Math.max(...panels.map((p) => p.image.width));
  const scale = opts.scale ?? Math.max(2, Math.min(8, Math.round(widest / 170)));
  const gap = opts.gap ?? Math.max(8, scale * 4);
  const padding = opts.padding ?? gap;
  const header = GLYPH_HEIGHT * scale + scale * 6;
  const width = padding * 2 + panels.reduce((sum, p) => sum + p.image.width, 0) + gap * (panels.length - 1);
  const height = padding * 2 + header + Math.max(...panels.map((p) => p.image.height));
  const out = createImage(width, height, opts.background ?? COLORS.background);
  let x = padding;
  for (const panel of panels) {
    fillRect(out, { x, y: padding, width: panel.image.width, height: header }, panel.accent);
    const label = fitText(panel.label, scale, panel.image.width - scale * 6);
    drawText(out, label, x + scale * 3, padding + scale * 3, scale, COLORS.text);
    blit(panel.image, out, x, padding + header);
    x += panel.image.width + gap;
  }
  if (opts.maxWidth && out.width > opts.maxWidth) return resizeToWidth(out, opts.maxWidth);
  return out;
}

export { measureText };
