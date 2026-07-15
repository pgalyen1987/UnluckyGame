import Phaser from 'phaser';
import { COLORS } from '../config';

type BikePose = 'ride' | 'brake' | 'repair';

export function drawLane(
  g: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  scroll: number
): void {
  g.clear();
  g.fillStyle(COLORS.sky, 1);
  g.fillRect(0, 0, width, height * 0.42);

  const laneTop = height * 0.42;
  const laneH = height * 0.58;
  g.fillStyle(COLORS.lane, 1);
  g.fillRect(0, laneTop, width, laneH);

  g.fillStyle(COLORS.curb, 1);
  g.fillRect(0, laneTop, width, 8);
  g.fillRect(0, laneTop + laneH - 10, width, 10);

  g.lineStyle(3, COLORS.laneMark, 0.85);
  const dashW = 28;
  const gap = 22;
  const y = laneTop + laneH * 0.55;
  for (let x = -((scroll % (dashW + gap)) + dashW + gap); x < width + dashW; x += dashW + gap) {
    g.lineBetween(x, y, x + dashW, y);
  }
}

export function drawBike(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale: number,
  pose: BikePose,
  wheelDetached = false,
  wheelAngle = 0
): void {
  const s = scale;
  const frame = COLORS.bikeFrame;
  const wheel = COLORS.wheel;
  const rim = COLORS.rim;
  const lean = pose === 'brake' ? -0.08 : pose === 'repair' ? 0.05 : 0;
  const cos = Math.cos(lean);
  const sin = Math.sin(lean);

  const tx = (lx: number, ly: number): [number, number] => {
    const rx = lx * cos - ly * sin;
    const ry = lx * sin + ly * cos;
    return [x + rx, y + ry];
  };

  const backWx = -34 * s;
  const backWy = 10 * s;
  if (!wheelDetached) {
    drawWheel(g, ...tx(backWx, backWy), 14 * s, wheelAngle, wheel, rim);
  }
  drawWheel(g, ...tx(34 * s, 10 * s), 14 * s, wheelAngle * 0.7, wheel, rim);

  g.lineStyle(3 * s, frame, 1);
  const [a0x, a0y] = tx(-34 * s, 10 * s);
  const [a1x, a1y] = tx(-8 * s, -18 * s);
  const [a2x, a2y] = tx(18 * s, -8 * s);
  const [a3x, a3y] = tx(34 * s, 10 * s);
  g.beginPath();
  g.moveTo(a0x, a0y);
  g.lineTo(a1x, a1y);
  g.lineTo(a2x, a2y);
  g.lineTo(a3x, a3y);
  g.strokePath();

  g.lineStyle(2 * s, frame, 1);
  const [b0x, b0y] = tx(-8 * s, -18 * s);
  const [b1x, b1y] = tx(-18 * s, 2 * s);
  g.lineBetween(b0x, b0y, b1x, b1y);
  const [c0x, c0y] = tx(18 * s, -8 * s);
  const [c1x, c1y] = tx(8 * s, -22 * s);
  g.lineBetween(c0x, c0y, c1x, c1y);

  g.fillStyle(frame, 1);
  const [sx, sy] = tx(-12 * s, -24 * s);
  g.fillRect(sx, sy, 3 * s, 10 * s);
  const [sdx, sdy] = tx(-18 * s, -28 * s);
  g.fillRoundedRect(sdx, sdy, 14 * s, 4 * s, 2 * s);

  g.lineStyle(3 * s, frame, 1);
  const [h0x, h0y] = tx(8 * s, -22 * s);
  const [h1x, h1y] = tx(22 * s, -26 * s);
  const [h2x, h2y] = tx(26 * s, -20 * s);
  g.lineBetween(h0x, h0y, h1x, h1y);
  g.lineBetween(h1x, h1y, h2x, h2y);

  const riderY = pose === 'brake' ? -30 * s : -32 * s;
  g.fillStyle(COLORS.jacket, 1);
  const [jx, jy] = tx(-6 * s, riderY);
  g.fillRoundedRect(jx, jy, 16 * s, 20 * s, 3 * s);
  g.fillStyle(COLORS.skin, 1);
  const [hx, hy] = tx(2 * s, riderY - 6 * s);
  g.fillCircle(hx, hy, 7 * s);
  g.fillStyle(COLORS.helmet, 1);
  const [helx, hely] = tx(2 * s, riderY - 8 * s);
  g.fillCircle(helx, hely, 8 * s);

  if (pose === 'repair') {
    g.lineStyle(2 * s, COLORS.skin, 1);
    const [r0x, r0y] = tx(6 * s, riderY + 8 * s);
    const [r1x, r1y] = tx(20 * s, 4 * s);
    g.lineBetween(r0x, r0y, r1x, r1y);
  }
}

export function drawDetachedWheel(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale: number,
  angle: number
): void {
  g.clear();
  drawWheel(g, x, y, 28 * scale, angle, COLORS.wheel, COLORS.rim);
}

function drawWheel(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  r: number,
  angle: number,
  fill: number,
  rim: number
): void {
  g.fillStyle(fill, 1);
  g.fillCircle(x, y, r);
  g.lineStyle(2, rim, 1);
  g.strokeCircle(x, y, r);
  g.lineStyle(1.5, rim, 0.9);
  for (let i = 0; i < 6; i++) {
    const a = Phaser.Math.DegToRad(angle + i * 60);
    g.lineBetween(x, y, x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  const notch = Phaser.Math.DegToRad(angle - 90);
  g.lineStyle(2.5, COLORS.perfect, 1);
  g.lineBetween(x, y, x + Math.cos(notch) * r, y + Math.sin(notch) * r);
}
