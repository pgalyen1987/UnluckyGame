import { parseColor } from './palette';

export class PixelBuffer {
  readonly w: number;
  readonly h: number;
  readonly data: Uint8ClampedArray;
  private readonly ox: number;
  private readonly oy: number;

  constructor(w: number, h: number, ox = 0, oy = 0) {
    this.w = w;
    this.h = h;
    this.ox = ox;
    this.oy = oy;
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  px(x: number, y: number, color: string, alpha = 255): void {
    x = (x + this.ox) | 0;
    y = (y + this.oy) | 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const [r, g, b, a] = parseColor(color);
    const i = (y * this.w + x) * 4;
    const fa = (a / 255) * (alpha / 255);
    if (fa >= 0.999) {
      this.data[i] = r;
      this.data[i + 1] = g;
      this.data[i + 2] = b;
      this.data[i + 3] = 255;
      return;
    }
    const da = this.data[i + 3]! / 255;
    const oa = fa + da * (1 - fa);
    if (oa <= 0) return;
    this.data[i] = Math.round((r * fa + this.data[i]! * da * (1 - fa)) / oa);
    this.data[i + 1] = Math.round((g * fa + this.data[i + 1]! * da * (1 - fa)) / oa);
    this.data[i + 2] = Math.round((b * fa + this.data[i + 2]! * da * (1 - fa)) / oa);
    this.data[i + 3] = Math.round(oa * 255);
  }

  rect(x: number, y: number, w: number, h: number, color: string, alpha = 255): void {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) this.px(xx, yy, color, alpha);
    }
  }

  hline(x0: number, x1: number, y: number, color: string, alpha = 255): void {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.px(x, y, color, alpha);
  }

  vline(x: number, y0: number, y1: number, color: string, alpha = 255): void {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.px(x, y, color, alpha);
  }

  line(x0: number, y0: number, x1: number, y1: number, color: string, alpha = 255): void {
    x0 |= 0;
    y0 |= 0;
    x1 |= 0;
    y1 |= 0;
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    for (;;) {
      this.px(x0, y0, color, alpha);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  circle(cx: number, cy: number, r: number, color: string, alpha = 255): void {
    this.ellipse(cx, cy, r, r, color, alpha);
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, color: string, alpha = 255): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x - cx) / rx;
        const ny = (y - cy) / ry;
        if (nx * nx + ny * ny <= 1) this.px(x, y, color, alpha);
      }
    }
  }

  ring(cx: number, cy: number, r: number, color: string, alpha = 255): void {
    for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) {
      for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d >= r - 0.6 && d <= r + 0.6) this.px(x, y, color, alpha);
      }
    }
  }

  outline(color: string): void {
    const solid = (x: number, y: number): boolean => {
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
      return this.data[(y * this.w + x) * 4 + 3]! > 110;
    };
    const mark: Array<[number, number]> = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (solid(x, y)) continue;
        if (solid(x + 1, y) || solid(x - 1, y) || solid(x, y + 1) || solid(x, y - 1)) {
          mark.push([x, y]);
        }
      }
    }
    const [r, g, b] = parseColor(color);
    for (const [x, y] of mark) {
      const i = (y * this.w + x) * 4;
      this.data[i] = r;
      this.data[i + 1] = g;
      this.data[i + 2] = b;
      this.data[i + 3] = 255;
    }
  }
}

export const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export interface SpriteDef {
  key: string;
  frames: PixelBuffer[];
}
