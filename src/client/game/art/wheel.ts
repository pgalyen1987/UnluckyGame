import { P } from './palette';
import { PixelBuffer, type SpriteDef } from './pixel';

/** Detached rear wheel — green notch at top when rotation === 0. */
function repairWheel(): PixelBuffer {
  const b = new PixelBuffer(72, 72, 2, 2);
  const cx = 34;
  const cy = 34;
  const r = 28;

  b.circle(cx, cy, r, P.tire);
  b.circle(cx, cy, r - 3, P.tireHi);
  b.ring(cx, cy, r - 6, P.rim);
  b.ring(cx, cy, r - 9, P.rimHi);

  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    b.line(cx, cy, cx + Math.cos(a) * (r - 10), cy + Math.sin(a) * (r - 10), P.spoke, 220);
  }

  b.vline(cx, cy - r + 2, cy - 4, P.perfect);
  b.vline(cx - 1, cy - r + 2, cy - 4, P.perfectHi);
  b.vline(cx + 1, cy - r + 2, cy - 4, P.perfectHi);
  b.px(cx, cy - r + 1, P.perfectHi);
  b.circle(cx, cy, 4, P.rimHi);
  b.outline(P.ink);
  return b;
}

export function wheelSprites(): SpriteDef[] {
  return [{ key: 'wheel-repair', frames: [repairWheel()] }];
}
