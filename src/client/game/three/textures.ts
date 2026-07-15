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

function heightToNormal(height: Float32Array, width: number, heightPx: number, strength: number): ImageData {
  const img = new ImageData(width, heightPx);
  for (let y = 1; y < heightPx - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const nx = (height[i - 1]! - height[i + 1]!) * strength;
      const ny = (height[i - width]! - height[i + width]!) * strength;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz);
      const p = i * 4;
      img.data[p] = ((nx / len) * 0.5 + 0.5) * 255;
      img.data[p + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      img.data[p + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      img.data[p + 3] = 255;
    }
  }
  return img;
}

export function makeTireMaps(): {
  map: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
  rough: THREE.CanvasTexture;
} {
  const w = 256;
  const h = 512;
  const [colorC, colorCtx] = canvas(w, h);
  const [normalC, normalCtx] = canvas(w, h);
  const [roughC, roughCtx] = canvas(w, h);
  const rng = mulberry32(207);
  const height = new Float32Array(w * h);

  colorCtx.fillStyle = '#0c0e12';
  colorCtx.fillRect(0, 0, w, h);
  roughCtx.fillStyle = '#888888';
  roughCtx.fillRect(0, 0, w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      height[y * w + x] = 0.52;
    }
  }

  const grooveDepth = 0.22;
  const blockH = 26;
  const grooveH = 7;
  for (let row = 0; row < Math.ceil(h / (blockH + grooveH)); row++) {
    const y0 = row * (blockH + grooveH);
    const offset = row % 2 === 0 ? 0 : Math.floor(w * 0.22);
    for (let bx = -1; bx < 4; bx++) {
      const x0 = ((bx * w) / 3 + offset) % w;
      const blockW = w / 3 - 10;
      colorCtx.fillStyle = '#151820';
      colorCtx.fillRect(x0, y0, blockW, blockH);
      for (let py = y0 + 2; py < y0 + blockH - 2; py++) {
        for (let px = x0 + 2; px < x0 + blockW - 2; px++) {
          const ix = ((px % w) + w) % w;
          if (py >= 0 && py < h) {
            height[py * w + ix] = 0.78 + rng() * 0.08;
          }
        }
      }
    }
    for (let gy = y0 + blockH; gy < Math.min(y0 + blockH + grooveH, h); gy++) {
      colorCtx.fillStyle = '#050608';
      colorCtx.fillRect(0, gy, w, 1);
      for (let gx = 0; gx < w; gx++) {
        height[gy * w + gx] = 0.28;
      }
    }
  }

  for (let i = 0; i < 5000; i++) {
    const x = Math.floor(rng() * w);
    const y = Math.floor(rng() * h);
    const g = 8 + Math.floor(rng() * 18);
    colorCtx.fillStyle = `rgb(${g}, ${g + 1}, ${g + 2})`;
    colorCtx.fillRect(x, y, 1, 1);
    height[y * w + x] = Math.min(height[y * w + x]! + rng() * 0.04, 0.95);
    roughCtx.fillStyle = rng() > 0.5 ? '#9a9a9a' : '#666666';
    roughCtx.fillRect(x, y, 1, 1);
  }

  for (let y = 0; y < h; y += 18) {
    colorCtx.strokeStyle = 'rgba(255,255,255,0.04)';
    colorCtx.lineWidth = 1;
    colorCtx.beginPath();
    colorCtx.moveTo(0, y);
    colorCtx.lineTo(w, y);
    colorCtx.stroke();
  }

  const normalImg = heightToNormal(height, w, h, 4.5);
  normalCtx.putImageData(normalImg, 0, 0);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = height[y * w + x]!;
      const rough = v < 0.35 ? 255 : v > 0.7 ? 170 : 210;
      roughCtx.fillStyle = `rgb(${rough}, ${rough}, ${rough})`;
      roughCtx.fillRect(x, y, 1, 1);
    }
  }

  const wrap = (t: THREE.CanvasTexture, repeatX: number, repeatY: number) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeatX, repeatY);
    t.anisotropy = 8;
    return t;
  };

  return {
    map: wrap(new THREE.CanvasTexture(colorC), 1, 1),
    normal: wrap(new THREE.CanvasTexture(normalC), 1, 1),
    rough: wrap(new THREE.CanvasTexture(roughC), 1, 1),
  };
}
