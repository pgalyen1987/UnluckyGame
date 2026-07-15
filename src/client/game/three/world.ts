import * as THREE from 'three';
import { mats } from './materials';

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
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * scale, 0.1 * scale, 0.5 * scale, 6), mats.trunk);
  trunk.position.set(x, 0.25 * scale, z);
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.35 * scale, 0.75 * scale, 7), mats.tree);
  crown.position.set(x, 0.75 * scale, z);
  group.add(trunk, crown);
}

function addLamp(group: THREE.Group, x: number, z: number): void {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.6, 6), mats.lamp);
  pole.position.set(x, 0.8, z);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.3), mats.lamp);
  head.position.set(x, 1.55, z);
  const bulb = new THREE.PointLight(0xffe8a0, 0.35, 5, 2);
  bulb.position.set(x, 1.52, z);
  group.add(pole, head, bulb);
}

export function createWorld(): {
  root: THREE.Group;
  farLayer: THREE.Group;
  nearLayer: THREE.Group;
  props: THREE.Group;
  dashes: THREE.Group;
  backupSlots: THREE.Vector3[];
} {
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
    const far = new THREE.Mesh(new THREE.BoxGeometry(farW, farH, 1.4), mats.buildingFar);
    far.position.set(x, farH / 2 + 0.35, -7 - (i % 3) * 0.5);
    far.castShadow = true;
    farLayer.add(far);

    const nearW = 1.8 + rng() * 2.4;
    const nearH = 3.2 + rng() * 5.5;
    const near = new THREE.Mesh(new THREE.BoxGeometry(nearW, nearH, 1.8), mats.buildingNear);
    near.position.set(x + 0.5, nearH / 2, -4 - (i % 2) * 0.35);
    near.castShadow = true;
    nearLayer.add(near);

    const ledge = new THREE.Mesh(new THREE.BoxGeometry(nearW + 0.08, 0.08, 1.9), mats.buildingNear);
    ledge.position.set(x + 0.5, nearH * 0.55, -4 - (i % 2) * 0.35);
    nearLayer.add(ledge);

    const rows = Math.floor(nearH / 1.05);
    for (let r = 0; r < rows; r++) {
      const lit = rng() > 0.4;
      const win = new THREE.Mesh(
        new THREE.PlaneGeometry(0.24, 0.32),
        lit ? mats.windowLit : mats.windowDark
      );
      win.position.set(x + 0.5, 0.85 + r * 1.05, -3.05 - (i % 2) * 0.35);
      nearLayer.add(win);
    }

    if (i % 3 === 0) addTree(props, x + 1.2, -1.2, 0.9 + rng() * 0.4);
    if (i % 4 === 1) addLamp(props, x - 0.3, -0.5);
    backupSlots.push(new THREE.Vector3(x + 2, 0, -0.5));

    x += farW + 0.6 + rng() * 0.9;
  });

  const lane = new THREE.Mesh(new THREE.PlaneGeometry(140, 9), mats.asphaltWet);
  lane.rotation.x = -Math.PI / 2;
  lane.receiveShadow = true;

  const curbTop = new THREE.Mesh(new THREE.BoxGeometry(140, 0.1, 0.4), mats.curb);
  curbTop.position.set(0, 0.05, 0.25);
  const curbBottom = new THREE.Mesh(new THREE.BoxGeometry(140, 0.1, 0.4), mats.curb);
  curbBottom.position.set(0, 0.05, -4.2);

  for (let d = -68; d < 68; d += 2.4) {
    const dash = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.025, 0.14),
      new THREE.MeshStandardMaterial({ color: 0xf5c842, emissive: 0xfbbf24, emissiveIntensity: 0.35 })
    );
    dash.position.set(d, 0.04, -1.9);
    dashes.add(dash);
  }

  root.add(farLayer, nearLayer, props, lane, curbTop, curbBottom, dashes);
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
