import * as THREE from 'three';
import { createTireMaterial, getMaterials } from './materials';

const BUILDING_SEEDS = [14, 22, 31, 18, 27, 35, 19, 24, 33, 16, 29, 21, 38, 42, 11];

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

function addTree(group: THREE.Group, x: number, z: number, scale: number): void {
  const m = getMaterials();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * scale, 0.1 * scale, 0.55 * scale, 8), m.trunk);
  trunk.position.set(x, 0.28 * scale, z);
  trunk.castShadow = true;
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.32 * scale, 10, 8), m.tree);
  crown.position.set(x, 0.72 * scale, z);
  crown.scale.set(1, 1.15, 0.85);
  crown.castShadow = true;
  const crown2 = new THREE.Mesh(new THREE.SphereGeometry(0.22 * scale, 8, 6), m.tree);
  crown2.position.set(x + 0.12 * scale, 0.85 * scale, z - 0.05);
  crown2.castShadow = true;
  group.add(trunk, crown, crown2);
}

function addLamp(group: THREE.Group, x: number, z: number): void {
  const m = getMaterials();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.048, 1.65, 10), m.lamp);
  pole.position.set(x, 0.82, z);
  pole.castShadow = true;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.28), m.lamp);
  arm.position.set(x, 1.55, z + 0.08);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.07, 0.34), m.lamp);
  head.position.set(x, 1.58, z);
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.04, 0.28),
    new THREE.MeshStandardMaterial({ color: 0xfff3d0, emissive: 0xffd48a, emissiveIntensity: 0.7, roughness: 0.4 })
  );
  glass.position.set(x, 1.54, z);
  const bulb = new THREE.PointLight(0xffe4b5, 0.7, 7, 2);
  bulb.position.set(x, 1.5, z);
  group.add(pole, arm, head, glass, bulb);
}

function addHydrant(group: THREE.Group, x: number, z: number): void {
  const m = getMaterials();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.32, 10), m.frame);
  body.position.set(x, 0.16, z);
  body.castShadow = true;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 10), m.rim);
  cap.position.set(x, 0.34, z);
  group.add(body, cap);
}

function addSign(group: THREE.Group, x: number, z: number): void {
  const m = getMaterials();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 8), m.lamp);
  pole.position.set(x, 0.55, z);
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.35, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.55, metalness: 0.1 })
  );
  board.position.set(x, 1.15, z);
  board.castShadow = true;
  const arrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.1, 0.14, 3),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 })
  );
  arrow.position.set(x, 1.15, z + 0.03);
  arrow.rotation.z = -Math.PI / 2;
  group.add(pole, board, arrow);
}

export function createCar(dark = false): THREE.Group {
  const m = getMaterials();
  const bodyMat = dark ? m.carBodyDark : m.carBody;
  const car = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.42, 0.72), bodyMat);
  body.position.y = 0.38;
  body.castShadow = true;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.32, 0.62), bodyMat);
  cabin.position.set(-0.08, 0.72, 0);
  cabin.castShadow = true;

  const windshield = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 0.26),
    new THREE.MeshPhysicalMaterial({ color: 0x88aacc, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.55 })
  );
  windshield.position.set(0.28, 0.74, 0);
  windshield.rotation.y = Math.PI / 2;
  windshield.rotation.z = -0.35;

  const headL = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.08, 0.14),
    new THREE.MeshStandardMaterial({ color: 0xfff7d6, emissive: 0xffe08a, emissiveIntensity: 0.9 })
  );
  headL.position.set(0.74, 0.38, 0.24);
  const headR = headL.clone();
  headR.position.z = -0.24;

  const tailL = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.07, 0.12),
    new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0xcc1111, emissiveIntensity: 0.7 })
  );
  tailL.position.set(-0.74, 0.38, 0.24);
  const tailR = tailL.clone();
  tailR.position.z = -0.24;

  const wheelGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.14, 20);
  const tireMat = createTireMaterial(1.8, 3);
  const positions = [
    [0.48, 0.16, 0.34],
    [0.48, 0.16, -0.34],
    [-0.48, 0.16, 0.34],
    [-0.48, 0.16, -0.34],
  ] as const;
  for (const [wx, wy, wz] of positions) {
    const w = new THREE.Mesh(wheelGeo, tireMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, wy, wz);
    w.castShadow = true;
    car.add(w);
  }
  car.add(body, cabin, windshield, headL, headR, tailL, tailR);
  return car;
}

export function createWorld(): {
  root: THREE.Group;
  farLayer: THREE.Group;
  nearLayer: THREE.Group;
  props: THREE.Group;
  dashes: THREE.Group;
  backupSlots: THREE.Vector3[];
} {
  const m = getMaterials();
  const root = new THREE.Group();
  const farLayer = new THREE.Group();
  const nearLayer = new THREE.Group();
  const props = new THREE.Group();
  const dashes = new THREE.Group();
  const backupSlots: THREE.Vector3[] = [];

  let x = -32;
  BUILDING_SEEDS.forEach((seed, i) => {
    const rng = mulberry32(seed);
    const farW = 1.5 + rng() * 2;
    const farH = 2.8 + rng() * 5;
    const far = new THREE.Mesh(new THREE.BoxGeometry(farW, farH, 1.4), m.buildingFar);
    far.position.set(x, farH / 2 + 0.35, -7 - (i % 3) * 0.5);
    far.castShadow = true;
    far.receiveShadow = true;
    farLayer.add(far);

    const nearW = 1.8 + rng() * 2.4;
    const nearH = 3.2 + rng() * 5.5;
    const near = new THREE.Mesh(new THREE.BoxGeometry(nearW, nearH, 1.85), m.buildingNear);
    near.position.set(x + 0.5, nearH / 2, -4 - (i % 2) * 0.35);
    near.castShadow = true;
    near.receiveShadow = true;
    nearLayer.add(near);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(nearW + 0.12, 0.1, 1.95), m.buildingNear);
    roof.position.set(x + 0.5, nearH + 0.05, -4 - (i % 2) * 0.35);
    nearLayer.add(roof);

    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(nearW * 0.7, 0.04, 0.35),
      new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.7 })
    );
    awning.position.set(x + 0.5, 2.1, -3.0 - (i % 2) * 0.35);
    nearLayer.add(awning);

    const rows = Math.floor(nearH / 1.05);
    for (let r = 0; r < rows; r++) {
      const lit = rng() > 0.42;
      const cols = 2 + Math.floor(rng() * 2);
      for (let c = 0; c < cols; c++) {
        const ox = (c - (cols - 1) / 2) * 0.42;
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.28), lit ? m.windowLit : m.windowDark);
        win.position.set(x + 0.5 + ox, 0.85 + r * 1.05, -3.02 - (i % 2) * 0.35);
        nearLayer.add(win);
      }
    }

    if (i % 3 === 0) addTree(props, x + 1.2, -1.2, 0.9 + rng() * 0.4);
    if (i % 4 === 1) addLamp(props, x - 0.3, -0.5);
    if (i % 5 === 2) {
      const car = createCar(rng() > 0.5);
      car.position.set(x + 0.8, 0, -1.4);
      car.rotation.y = (rng() - 0.5) * 0.08;
      props.add(car);
    }
    if (i % 6 === 3) addHydrant(props, x + 0.4, 0.55);
    if (i % 7 === 1) addSign(props, x - 1.0, 0.7);
    backupSlots.push(new THREE.Vector3(x + 2, 0, -0.5));
    x += farW + 0.6 + rng() * 0.9;
  });

  const lane = new THREE.Mesh(new THREE.PlaneGeometry(140, 9), m.asphaltWet);
  lane.rotation.x = -Math.PI / 2;
  lane.receiveShadow = true;

  const sidewalk = new THREE.Mesh(
    new THREE.PlaneGeometry(140, 1.6),
    new THREE.MeshStandardMaterial({ color: 0x8a909c, roughness: 0.85, metalness: 0.02 })
  );
  sidewalk.rotation.x = -Math.PI / 2;
  sidewalk.position.set(0, 0.02, 1.15);
  sidewalk.receiveShadow = true;

  const bikeLane = new THREE.Mesh(new THREE.PlaneGeometry(140, 1.4), m.laneGreen);
  bikeLane.rotation.x = -Math.PI / 2;
  bikeLane.position.set(0, 0.012, 0.15);
  bikeLane.receiveShadow = true;

  const laneEdge = new THREE.Mesh(
    new THREE.BoxGeometry(140, 0.02, 0.06),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5, emissive: 0xffffff, emissiveIntensity: 0.08 })
  );
  laneEdge.position.set(0, 0.03, -0.55);

  const curbTop = new THREE.Mesh(new THREE.BoxGeometry(140, 0.11, 0.42), m.curb);
  curbTop.position.set(0, 0.055, 0.28);
  curbTop.receiveShadow = true;
  curbTop.castShadow = true;
  const curbStripe = new THREE.Mesh(new THREE.BoxGeometry(140, 0.04, 0.08), m.curbPaint);
  curbStripe.position.set(0, 0.1, 0.08);

  const curbBottom = new THREE.Mesh(new THREE.BoxGeometry(140, 0.11, 0.42), m.curb);
  curbBottom.position.set(0, 0.055, -4.2);

  for (let d = -68; d < 68; d += 2.4) {
    const dash = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.018, 0.12),
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.35,
        roughness: 0.55,
      })
    );
    dash.position.set(d, 0.038, -1.85);
    dashes.add(dash);
  }

  // Bike-lane chevrons
  for (let d = -60; d < 60; d += 4.5) {
    const chev = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.35, 3),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 })
    );
    chev.rotation.x = -Math.PI / 2;
    chev.rotation.z = Math.PI / 2;
    chev.position.set(d, 0.025, 0.15);
    dashes.add(chev);
  }

  root.add(
    farLayer,
    nearLayer,
    props,
    lane,
    sidewalk,
    bikeLane,
    laneEdge,
    curbTop,
    curbStripe,
    curbBottom,
    dashes
  );
  return { root, farLayer, nearLayer, props, dashes, backupSlots };
}

export function scrollWorld(
  far: THREE.Group,
  near: THREE.Group,
  props: THREE.Group,
  dashes: THREE.Group,
  scroll: number
): void {
  const wrap = 20;
  far.position.x = -((scroll * 0.1) % wrap);
  near.position.x = -((scroll * 0.2) % wrap);
  props.position.x = -((scroll * 0.2) % wrap);
  dashes.position.x = -((scroll * 0.42) % 2.4);
}
