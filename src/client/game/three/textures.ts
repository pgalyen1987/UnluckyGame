import * as THREE from 'three';

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeAsphaltMaps(): { map: THREE.CanvasTexture; normal: THREE.CanvasTexture; rough: THREE.CanvasTexture } {
  const size = 512;
  const [colorC, colorCtx] = canvas(size, size);
  const [normalC, normalCtx] = canvas(size, size);
  const [roughC, roughCtx] = canvas(size, size);
  const rng = mulberry32(91);

  colorCtx.fillStyle = '#3d434f';
  colorCtx.fillRect(0, 0, size, size);
  normalCtx.fillStyle = '#8080ff';
  normalCtx.fillRect(0, 0, size, size);
  roughCtx.fillStyle = '#606060';
  roughCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < 9000; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const g = 55 + Math.floor(rng() * 35);
    colorCtx.fillStyle = `rgb(${g}, ${g + 3}, ${g + 8})`;
    colorCtx.fillRect(x, y, 1 + rng() * 2, 1 + rng() * 2);
    roughCtx.fillStyle = rng() > 0.5 ? '#707070' : '#454545';
    roughCtx.fillRect(x, y, 2, 2);
  }

  for (let i = 0; i < 120; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const w = 8 + rng() * 40;
    const h = 1 + rng() * 3;
    colorCtx.fillStyle = 'rgba(70,76,88,0.35)';
    colorCtx.fillRect(x, y, w, h);
  }

  const colorData = colorCtx.getImageData(0, 0, size, size);
  const height = new Float32Array(size * size);
  for (let i = 0; i < height.length; i++) {
    const p = i * 4;
    height[i] = (colorData.data[p]! + colorData.data[p + 1]! + colorData.data[p + 2]!) / (255 * 3);
  }

  const img = normalCtx.createImageData(size, size);
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const i = y * size + x;
      const hL = height[i - 1]!;
      const hR = height[i + 1]!;
      const hU = height[i - size]!;
      const hD = height[i + size]!;
      const nx = (hL - hR) * 2.2;
      const ny = (hU - hD) * 2.2;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz);
      const p = i * 4;
      img.data[p] = ((nx / len) * 0.5 + 0.5) * 255;
      img.data[p + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      img.data[p + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      img.data[p + 3] = 255;
    }
  }
  normalCtx.putImageData(img, 0, 0);

  const wrap = (t: THREE.CanvasTexture) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(8, 2);
    t.anisotropy = 4;
    return t;
  };

  return {
    map: wrap(new THREE.CanvasTexture(colorC)),
    normal: wrap(new THREE.CanvasTexture(normalC)),
    rough: wrap(new THREE.CanvasTexture(roughC)),
  };
}

export function makeConcreteNormal(): THREE.CanvasTexture {
  const size = 256;
  const [c, ctx] = canvas(size, size);
  const rng = mulberry32(44);
  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = rng();
      height[y * size + x] = 0.45 + n * 0.55;
    }
  }
  const img = ctx.createImageData(size, size);
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const i = y * size + x;
      const nx = (height[i - 1]! - height[i + 1]!) * 3;
      const ny = (height[i - size]! - height[i + size]!) * 3;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz);
      const p = i * 4;
      img.data[p] = ((nx / len) * 0.5 + 0.5) * 255;
      img.data[p + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      img.data[p + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      img.data[p + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 4);
  return tex;
}
