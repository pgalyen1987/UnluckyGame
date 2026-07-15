import * as THREE from 'three';
import { getMaterials } from './materials';

const WHEEL_R = 0.44;
const REAR_X = -0.96;
const FRONT_X = 0.96;
const HUB_Y = WHEEL_R;

export type BikeRig = {
  root: THREE.Group;
  frame: THREE.Group;
  frontWheel: THREE.Group;
  rearWheel: THREE.Group;
};

function setShadows(obj: THREE.Object3D): void {
  obj.traverse((c) => {
    if (c instanceof THREE.Mesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
}

/** Side-profile wheel — circle in YZ plane, rolls around X axis. */
function wheel(radius: number): THREE.Group {
  const m = getMaterials();
  const group = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.065, 20, 48), m.tire);
  tire.rotation.y = Math.PI / 2;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.72, 0.024, 16, 36), m.rim);
  rim.rotation.y = Math.PI / 2;
  for (let i = 0; i < 8; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.018, radius * 1.18, 0.018), m.rim);
    spoke.rotation.x = (i * Math.PI) / 4;
    group.add(spoke);
  }
  group.add(tire, rim);
  setShadows(group);
  return group;
}

function tube(
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number,
  mat: THREE.Material,
  r = 0.042
): THREE.Mesh {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dz = z2 - z1;
  const len = Math.hypot(dx, dy, dz);
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), mat);
  cyl.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
  cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, dy, dz).normalize());
  cyl.castShadow = true;
  return cyl;
}

export function createBike(repairMode = false): BikeRig {
  const m = getMaterials();
  const root = new THREE.Group();
  const frame = new THREE.Group();

  const bbX = -0.08;
  const bbY = 0.72;
  const seatX = -0.2;
  const seatY = 1.1;
  const headX = 0.72;
  const headY = 1.2;

  const frontWheel = wheel(WHEEL_R);
  frontWheel.position.set(FRONT_X, HUB_Y, 0);

  const rearWheel = wheel(WHEEL_R);
  rearWheel.position.set(REAR_X, HUB_Y, 0);
  rearWheel.visible = !repairMode;

  const fork = tube(FRONT_X, HUB_Y, 0, headX, headY - 0.08, 0, m.frameDark, 0.035);
  frame.add(
    tube(REAR_X, HUB_Y, 0, bbX, bbY, 0, m.frameDark),
    tube(FRONT_X, HUB_Y, 0, bbX, bbY, 0, m.frameDark),
    fork,
    tube(bbX, bbY, 0, seatX, seatY, 0, m.frame),
    tube(seatX, seatY, 0, headX, headY, 0, m.frame),
    tube(bbX, bbY, 0, headX, headY, 0, m.frameDark, 0.038)
  );

  const chainring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 10, 24), m.rim);
  chainring.position.set(bbX, bbY - 0.02, 0.06);
  chainring.rotation.x = Math.PI / 2;

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 0.12), m.frameDark);
  seat.position.set(seatX, seatY + 0.04, 0);

  const handleBar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.48, 10), m.frameDark);
  handleBar.rotation.z = Math.PI / 2;
  handleBar.position.set(headX + 0.2, headY + 0.08, 0);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.2), m.jacket);
  torso.position.set(-0.02, 1.38, 0);

  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.18), m.pants);
  pelvis.position.set(-0.02, 1.12, 0);

  const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.34, 8), m.pants);
  thigh.position.set(0.02, 0.92, 0.06);
  thigh.rotation.z = 0.35;

  const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.32, 8), m.pants);
  calf.position.set(0.06, 0.62, 0.1);
  calf.rotation.z = 0.15;

  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.034, 0.28, 8), m.jacket);
  arm.position.set(0.14, 1.28, 0.08);
  arm.rotation.z = -0.9;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 16), m.skin);
  head.position.set(0.04, 1.72, 0);

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.175, 20, 16), m.helmet);
  helmet.position.set(0.04, 1.765, 0);
  helmet.scale.set(1, 0.84, 1);

  const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.07), m.rim);
  pedal.position.set(bbX, bbY - 0.1, 0.1);

  frame.add(
    chainring,
    seat,
    handleBar,
    torso,
    pelvis,
    thigh,
    calf,
    arm,
    head,
    helmet,
    pedal,
    frontWheel,
    rearWheel
  );
  setShadows(frame);
  root.add(frame);
  return { root, frame, frontWheel, rearWheel };
}

export function createRepairWheel(): THREE.Group {
  const m = getMaterials();
  const group = new THREE.Group();
  group.name = 'repair-wheel';

  const tire = new THREE.Mesh(new THREE.TorusGeometry(1, 0.12, 24, 64), m.tire);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.045, 18, 48), m.rim);

  for (let i = 0; i < 12; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.7, 0.018), m.rim);
    spoke.rotation.z = (i * Math.PI) / 6;
    group.add(spoke);
  }

  const notch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.48, 0.1), m.green);
  notch.position.y = 0.82;
  notch.name = 'notch';

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.07, 20), m.rim);
  hub.rotation.x = Math.PI / 2;

  group.add(tire, rim, hub, notch);
  setShadows(group);
  return group;
}

export function createVictoryBike(): THREE.Group {
  const bike = createBike(false);
  const m = getMaterials();
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.045, 0.09), m.skin);
  foot.position.set(-0.22, 0.52, 0.14);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.34, 8), m.skin);
  leg.position.set(0.08, 0.72, 0.1);
  leg.rotation.z = 0.35;
  bike.frame.add(foot, leg);
  return bike.root;
}

export const BIKE_WHEEL_RADIUS = WHEEL_R;
