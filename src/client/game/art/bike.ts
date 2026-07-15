import { P } from './palette';
import { PixelBuffer, type SpriteDef } from './pixel';

type Pose = 'ride' | 'brake' | 'repair' | 'victory';

function drawWheel(b: PixelBuffer, cx: number, cy: number, r: number): void {
  b.circle(cx, cy, r, P.tire);
  b.circle(cx, cy, r - 2, P.tireHi);
  b.ring(cx, cy, r - 4, P.rim);
  b.ring(cx, cy, r - 6, P.rimHi);
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    b.line(cx, cy, cx + Math.cos(a) * (r - 5), cy + Math.sin(a) * (r - 5), P.spoke, 200);
  }
  b.px(cx, cy, P.rimHi);
}

function drawFrame(b: PixelBuffer, rearX: number, frontX: number, groundY: number, lean: number): void {
  const tilt = lean * 4;
  const seatX = rearX + 14;
  const seatY = groundY - 22 + tilt;
  const headX = frontX - 8;
  const headY = groundY - 18 + tilt * 0.5;
  const bbX = rearX + 8;
  const bbY = groundY - 8;

  b.line(rearX, groundY, bbX, bbY, P.frameShade);
  b.line(bbX, bbY, seatX, seatY, P.frame);
  b.line(seatX, seatY, headX, headY, P.frame);
  b.line(headX, headY, frontX, groundY, P.frameShade);
  b.line(seatX, seatY + 2, frontX - 2, groundY - 2, P.frameHi);
  b.line(seatX - 2, seatY - 2, seatX + 8, seatY - 2, P.seat);
  b.line(headX + 2, headY - 6, headX + 14, headY - 10, P.handle);
  b.line(headX + 14, headY - 10, headX + 16, headY - 8, P.handle);
}

function drawRider(
  b: PixelBuffer,
  cx: number,
  groundY: number,
  pose: Pose,
  lean: number
): void {
  const tilt = lean * 3;
  const bodyY = groundY - 34 + tilt;
  b.rect(cx - 4, bodyY, 14, 16, P.jacketShade);
  b.rect(cx - 3, bodyY + 1, 12, 14, P.jacket);
  b.rect(cx - 2, bodyY + 2, 4, 6, P.jacketHi);
  b.rect(cx - 2, bodyY + 16, 5, 8, P.pants);
  b.rect(cx + 4, bodyY + 16, 5, 8, P.pants);
  b.circle(cx + 3, bodyY - 5, 6, P.skin);
  b.circle(cx + 3, bodyY - 6, 7, P.helmetShade);
  b.circle(cx + 3, bodyY - 7, 6, P.helmet);
  b.rect(cx + 1, bodyY - 8, 5, 2, P.helmetHi);

  if (pose === 'brake') {
    b.line(cx + 8, bodyY + 8, cx + 16, bodyY + 14, P.skin);
    b.line(cx - 2, bodyY + 8, cx - 10, bodyY + 12, P.skin);
  } else if (pose === 'repair') {
    b.line(cx + 8, bodyY + 10, cx + 22, groundY - 6, P.skin);
    b.rect(cx + 20, groundY - 8, 6, 4, P.skinShade);
  } else if (pose === 'victory') {
    b.rect(cx - 14, groundY - 6, 10, 4, P.skinShade);
    b.line(cx + 6, bodyY + 14, cx + 12, groundY + 2, P.skin);
    b.circle(cx + 12, groundY + 4, 3, P.skin);
  } else {
    b.line(cx + 6, bodyY + 12, cx + 8, groundY - 4, P.skinShade);
    b.line(cx, bodyY + 12, cx - 4, groundY - 2, P.skinShade);
  }
}

function bikeSprite(pose: Pose): PixelBuffer {
  const b = new PixelBuffer(96, 64, 2, 2);
  const groundY = 48;
  const rearX = 18;
  const frontX = 66;
  const lean = pose === 'brake' ? -0.6 : pose === 'repair' ? 0.4 : 0;

  if (pose !== 'repair') drawWheel(b, rearX, groundY, 11);
  drawWheel(b, frontX, groundY, 11);
  drawFrame(b, rearX, frontX, groundY, lean);
  drawRider(b, 34, groundY, pose, lean);

  b.ellipse(42, 54, 28, 4, P.shadow, 90);
  b.outline(P.ink);
  return b;
}

export function bikeSprites(): SpriteDef[] {
  return (['ride', 'brake', 'repair', 'victory'] as Pose[]).map((pose) => ({
    key: `bike-${pose}`,
    frames: [bikeSprite(pose)],
  }));
}
