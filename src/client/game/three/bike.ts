import * as THREE from 'three';
import { mats } from './materials';

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

/** Side-profile wheel — circle in YZ plane, rolls around X axis. */
function wheel(radius: number): THREE.Group {
  const group = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.07, 16, 32), mats.tire);
  tire.rotation.y = Math.PI / 2;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.72, 0.028, 12, 28), mats.rim);
  rim.rotation.y = Math.PI / 2;
  for (let i = 0; i < 6; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.02, radius * 1.22, 0.025), mats.rim);
    spoke.rotation.x = (i * Math.PI) / 3;
    group.add(spoke);
  }
  group.add(tire, rim);
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
  r = 0.045
): THREE.Mesh {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dz = z2 - z1;
  const len = Math.hypot(dx, dy, dz);
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat);
  cyl.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
  cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, dy, dz).normalize());
  return cyl;
}

export function createBike(repairMode = false): BikeRig {
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

  frame.add(
    tube(REAR_X, HUB_Y, 0, bbX, bbY, 0, mats.frameDark),
    tube(FRONT_X, HUB_Y, 0, bbX, bbY, 0, mats.frameDark),
    tube(bbX, bbY, 0, seatX, seatY, 0, mats.frame),
    tube(seatX, seatY, 0, headX, headY, 0, mats.frame),
    tube(bbX, bbY, 0, headX, headY, 0, mats.frameDark, 0.04)
  );

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.14), mats.frameDark);
  seat.position.set(seatX, seatY + 0.04, 0);

  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.06), mats.frameDark);
  handle.position.set(headX + 0.18, headY + 0.06, 0);
  handle.rotation.z = -0.15;

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.44, 0.22), mats.jacket);
  torso.position.set(0, 1.38, 0);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 16), mats.skin);
  head.position.set(0.04, 1.72, 0);

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 16), mats.helmet);
  helmet.position.set(0.04, 1.76, 0);
  helmet.scale.set(1, 0.82, 1);

  const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.08), mats.rim);
  pedal.position.set(bbX, bbY - 0.08, 0.1);

  frame.add(seat, handle, torso, head, helmet, pedal, frontWheel, rearWheel);
  root.add(frame);
  return { root, frame, frontWheel, rearWheel };
}

/** Repair minigame wheel — faces camera (XY plane), spins on Z. */
export function createRepairWheel(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'repair-wheel';

  const tire = new THREE.Mesh(new THREE.TorusGeometry(1, 0.13, 20, 48), mats.tire);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.05, 14, 36), mats.rim);

  for (let i = 0; i < 10; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.72, 0.025), mats.rim);
    spoke.rotation.z = (i * Math.PI) / 5;
    group.add(spoke);
  }

  const notch = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.52, 0.14), mats.green);
  notch.position.y = 0.82;
  notch.name = 'notch';

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 16), mats.rim);
  hub.rotation.x = Math.PI / 2;

  group.add(tire, rim, hub, notch);
  return group;
}

export function createVictoryBike(): THREE.Group {
  const bike = createBike(false);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.1), mats.skin);
  foot.position.set(-0.22, 0.52, 0.15);
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.06), mats.skin);
  leg.position.set(0.08, 0.72, 0.1);
  leg.rotation.z = 0.35;
  bike.frame.add(foot, leg);
  return bike.root;
}

export const BIKE_WHEEL_RADIUS = WHEEL_R;
