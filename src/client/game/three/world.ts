import * as THREE from 'three';

const BUILDING_SEEDS = [14, 22, 31, 18, 27, 35, 19, 24, 33, 16, 29, 21];

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

export function createWorld(): {
  root: THREE.Group;
  farLayer: THREE.Group;
  nearLayer: THREE.Group;
  lane: THREE.Mesh;
  dashes: THREE.Group;
} {
  const root = new THREE.Group();
  const farLayer = new THREE.Group();
  const nearLayer = new THREE.Group();
  const dashes = new THREE.Group();

  const farMat = new THREE.MeshToonMaterial({ color: 0x3a4558 });
  const nearMat = new THREE.MeshToonMaterial({ color: 0x252d3a });
  const windowMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });

  let x = -30;
  BUILDING_SEEDS.forEach((seed, i) => {
    const rng = mulberry32(seed);
    const farW = 1.4 + rng() * 1.8;
    const farH = 2.5 + rng() * 4.5;
    const far = new THREE.Mesh(new THREE.BoxGeometry(farW, farH, 1.2), farMat);
    far.position.set(x, farH / 2 + 0.4, -6 - (i % 3) * 0.6);
    farLayer.add(far);

    const nearW = 1.6 + rng() * 2.2;
    const nearH = 3 + rng() * 5;
    const near = new THREE.Mesh(new THREE.BoxGeometry(nearW, nearH, 1.6), nearMat);
    near.position.set(x + 0.4, nearH / 2, -3.5 - (i % 2) * 0.4);
    nearLayer.add(near);

    const rows = Math.floor(nearH / 1.1);
    for (let r = 0; r < rows; r++) {
      if (rng() > 0.45) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.28), windowMat);
        win.position.set(x + 0.4, 0.8 + r * 1.0, -2.65);
        nearLayer.add(win);
      }
    }

    x += farW + 0.5 + rng() * 0.8;
  });

  const lane = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 8),
    new THREE.MeshToonMaterial({ color: 0x3a404c })
  );
  lane.rotation.x = -Math.PI / 2;
  lane.position.y = 0;

  const curbMat = new THREE.MeshToonMaterial({ color: 0x5a6270 });
  const curbTop = new THREE.Mesh(new THREE.BoxGeometry(120, 0.08, 0.35), curbMat);
  curbTop.position.set(0, 0.04, 0.2);
  const curbBottom = new THREE.Mesh(new THREE.BoxGeometry(120, 0.08, 0.35), curbMat);
  curbBottom.position.set(0, 0.04, -3.8);

  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf5c842 });
  for (let d = -58; d < 58; d += 2.2) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.02, 0.12), dashMat);
    dash.position.set(d, 0.03, -1.8);
    dashes.add(dash);
  }

  root.add(farLayer, nearLayer, lane, curbTop, curbBottom, dashes);
  return { root, farLayer, nearLayer, lane, dashes };
}

export function scrollWorld(
  far: THREE.Group,
  near: THREE.Group,
  dashes: THREE.Group,
  scroll: number
): void {
  far.position.x = -(scroll * 0.12) % 18;
  near.position.x = -(scroll * 0.22) % 18;
  dashes.position.x = -(scroll * 0.45) % 2.2;
}
