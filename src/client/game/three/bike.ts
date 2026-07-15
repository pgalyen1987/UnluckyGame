import * as THREE from 'three';
import { mats } from './materials';

export type BikeRig = {
  root: THREE.Group;
  frame: THREE.Group;
  frontWheel: THREE.Group;
  rearWheel: THREE.Group;
};

function wheel(radius: number): THREE.Group {
  const group = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.07, 16, 32), mats.tire);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.72, 0.028, 12, 28), mats.rim);
  for (let i = 0; i < 6; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.025, radius * 1.25, 0.02), mats.rim);
    spoke.rotation.z = (i * Math.PI) / 3;
    group.add(spoke);
  }
  group.add(tire, rim);
  return group;
}

export function createBike(repairMode = false): BikeRig {
  const root = new THREE.Group();
  const frame = new THREE.Group();

  const frontWheel = wheel(0.44);
  frontWheel.position.set(0.98, 0.44, 0);

  const rearWheel = wheel(0.44);
  rearWheel.position.set(-0.98, 0.44, 0);
  rearWheel.visible = !repairMode;

  const downTube = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.09, 0.09), mats.frame);
  downTube.position.set(0, 0.74, 0);
  downTube.rotation.z = -0.55;

  const seatTube = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.58, 0.09), mats.frameDark);
  seatTube.position.set(-0.16, 0.98, 0);
  seatTube.rotation.z = 0.35;

  const topTube = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.08, 0.08), mats.frame);
  topTube.position.set(0.04, 1.08, 0);
  topTube.rotation.z = 0.12;

  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.07, 0.07), mats.frameDark);
  handle.position.set(0.74, 1.22, 0);
  handle.rotation.z = -0.2;

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.14), mats.frameDark);
  seat.position.set(-0.2, 1.1, 0);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.44, 0.24), mats.jacket);
  torso.position.set(-0.02, 1.38, 0);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 16), mats.skin);
  head.position.set(0.02, 1.72, 0);

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 16), mats.helmet);
  helmet.position.set(0.02, 1.76, 0);
  helmet.scale.set(1, 0.82, 1);

  const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.08), mats.rim);
  pedal.position.set(-0.05, 0.48, 0.12);

  frame.add(
    downTube,
    seatTube,
    topTube,
    handle,
    seat,
    torso,
    head,
    helmet,
    pedal,
    frontWheel,
    rearWheel
  );
  root.add(frame);
  return { root, frame, frontWheel, rearWheel };
}

/** Spinning wheel only — green notch rotates; fixed target is separate. */
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
