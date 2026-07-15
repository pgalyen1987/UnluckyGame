import { P } from './palette';
import { mulberry32, PixelBuffer, type SpriteDef } from './pixel';

function skyGradient(): PixelBuffer {
  const b = new PixelBuffer(64, 128);
  for (let y = 0; y < 128; y++) {
    const t = y / 127;
    const r = Math.round(110 + t * 102);
    const g = Math.round(181 + t * 47);
    const bl = Math.round(232 - t * 30);
    for (let x = 0; x < 64; x++) {
      b.px(x, y, `rgb(${r},${g},${bl})`);
    }
  }
  b.circle(48, 22, 10, P.sun);
  b.circle(48, 22, 7, '#fff4cc');
  b.circle(12, 34, 5, P.cloud, 220);
  b.circle(18, 33, 4, P.cloud, 220);
  b.circle(8, 33, 3, P.cloud, 200);
  b.circle(40, 48, 4, P.cloud, 180);
  b.circle(46, 47, 3, P.cloud, 180);
  return b;
}

function buildingStrip(seed: number, w: number, h: number, far: boolean): PixelBuffer {
  const b = new PixelBuffer(w, h);
  const rng = mulberry32(seed);
  const base = far ? P.buildingFar : P.buildingNear;
  const hi = far ? P.buildingFarHi : P.buildingNearHi;
  let x = 0;
  while (x < w) {
    const bw = 14 + Math.floor(rng() * 22);
    const bh = 24 + Math.floor(rng() * (h - 28));
    const top = h - bh;
    b.rect(x, top, bw, bh, base);
    b.rect(x, top, bw, 2, hi);
    b.rect(x + bw - 2, top, 2, bh, hi, 120);
    const cols = Math.max(1, Math.floor(bw / 7));
    const rows = Math.max(2, Math.floor(bh / 10));
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        const lit = rng() > 0.55;
        b.rect(x + 3 + cx * 7, top + 4 + cy * 10, 3, 4, lit ? P.window : P.windowOff, lit ? 200 : 255);
      }
    }
    x += bw + 2 + Math.floor(rng() * 4);
  }
  b.hline(0, w - 1, h - 1, P.inkSoft);
  return b;
}

function laneTile(): PixelBuffer {
  const b = new PixelBuffer(32, 32);
  b.rect(0, 0, 32, 32, P.asphalt);
  const rng = mulberry32(77);
  for (let i = 0; i < 18; i++) {
    const x = Math.floor(rng() * 30);
    const y = Math.floor(rng() * 30);
    b.px(x, y, rng() > 0.5 ? P.asphaltHi : P.asphaltLo, 140);
  }
  b.hline(0, 31, 0, P.curbHi);
  b.hline(0, 31, 31, P.curb);
  return b;
}

function laneDash(): PixelBuffer {
  const b = new PixelBuffer(24, 6);
  b.rect(0, 1, 24, 4, P.laneMark);
  b.hline(0, 23, 1, P.laneMarkHi);
  return b;
}

function spark(): PixelBuffer {
  const b = new PixelBuffer(8, 8, 1, 1);
  b.line(3, 0, 3, 6, P.sparkHi);
  b.line(0, 3, 6, 3, P.sparkHi);
  b.px(3, 3, P.spark);
  b.px(3, 1, P.spark);
  b.px(3, 5, P.spark);
  b.px(1, 3, P.spark);
  b.px(5, 3, P.spark);
  return b;
}

function missPuff(): PixelBuffer {
  const b = new PixelBuffer(12, 12, 1, 1);
  b.circle(5, 5, 4, P.miss, 180);
  b.circle(4, 4, 2, '#fca5a5', 200);
  return b;
}

function timingRing(): PixelBuffer {
  const b = new PixelBuffer(80, 80, 2, 2);
  b.ring(38, 38, 34, P.perfect, 90);
  b.ring(38, 38, 28, P.perfectHi, 60);
  b.vline(38, 2, 10, P.perfect);
  b.vline(37, 2, 10, P.perfectHi);
  b.vline(39, 2, 10, P.perfectHi);
  return b;
}

function dust(): PixelBuffer {
  const b = new PixelBuffer(6, 6, 1, 1);
  b.px(2, 2, P.asphaltHi, 160);
  b.px(3, 3, P.curb, 120);
  return b;
}

export function envSprites(): SpriteDef[] {
  return [
    { key: 'sky-gradient', frames: [skyGradient()] },
    { key: 'building-far', frames: [buildingStrip(11, 128, 72, true)] },
    { key: 'building-near', frames: [buildingStrip(29, 128, 88, false)] },
    { key: 'lane-tile', frames: [laneTile()] },
    { key: 'lane-dash', frames: [laneDash()] },
    { key: 'spark', frames: [spark()] },
    { key: 'miss-puff', frames: [missPuff()] },
    { key: 'timing-ring', frames: [timingRing()] },
    { key: 'dust', frames: [dust()] },
  ];
}
