import * as THREE from 'three';
import { createTireMaterial, getMaterials } from './materials';

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
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 14), mat);
  cyl.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
  cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, dy, dz).normalize());
  cyl.castShadow = true;
  return cyl;
}

function limb(
  mat: THREE.Material,
  length: number,
  rTop: number,
  rBot: number,
  segments = 10
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, length, segments), mat);
  mesh.castShadow = true;
  return mesh;
}

/** Side-profile wheel — circle in YZ plane, rolls around X axis. */
function wheel(radius: number): THREE.Group {
  const m = getMaterials();
  const group = new THREE.Group();
  const tire = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.065, 24, 56),
    createTireMaterial(2.2, 1.4)
  );
  tire.rotation.y = Math.PI / 2;

  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.72, 0.024, 16, 36), m.rim);
  rim.rotation.y = Math.PI / 2;

  for (let i = 0; i < 12; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.014, radius * 1.16, 0.014), m.rim);
    spoke.rotation.x = (i * Math.PI) / 6;
    group.add(spoke);
  }

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.08, 14), m.rim);
  hub.rotation.y = Math.PI / 2;

  const rotor = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 8, 24), m.rim);
  rotor.rotation.y = Math.PI / 2;
  rotor.position.x = 0.02;

  group.add(tire, rim, hub, rotor);
  setShadows(group);
  return group;
}

function createDropBar(m: ReturnType<typeof getMaterials>, headX: number, headY: number): THREE.Group {
  const bar = new THREE.Group();
  const stem = tube(headX, headY, 0, headX + 0.12, headY + 0.04, 0, m.frameDark, 0.028);
  const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.06), m.frameDark);
  clamp.position.set(headX + 0.12, headY + 0.04, 0);

  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.018, 10, 24, Math.PI, Math.PI), m.frameDark);
  hook.rotation.z = Math.PI / 2;
  hook.position.set(headX + 0.28, headY + 0.02, 0);

  const tops = tube(headX + 0.12, headY + 0.04, 0, headX + 0.34, headY + 0.06, 0, m.frameDark, 0.016);

  const gripL = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.12, 10), m.grip);
  gripL.rotation.z = Math.PI / 2;
  gripL.position.set(headX + 0.36, headY - 0.02, 0.04);

  const gripR = gripL.clone();
  gripR.position.z = -0.04;

  bar.add(stem, clamp, hook, tops, gripL, gripR);
  return bar;
}

function createDrivetrain(
  m: ReturnType<typeof getMaterials>,
  bbX: number,
  bbY: number,
  rearX: number
): THREE.Group {
  const drive = new THREE.Group();
  const chainring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.022, 12, 32), m.rim);
  chainring.position.set(bbX, bbY - 0.01, 0.05);
  chainring.rotation.x = Math.PI / 2;

  const crankArm = tube(bbX, bbY, 0.05, bbX + 0.01, bbY - 0.17, 0.05, m.rim, 0.016);
  const pedalAxle = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.1, 10), m.rim);
  pedalAxle.rotation.x = Math.PI / 2;
  pedalAxle.position.set(bbX + 0.01, bbY - 0.17, 0.05);

  const pedalBody = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.025, 0.06), m.rim);
  pedalBody.position.set(bbX + 0.01, bbY - 0.19, 0.05);

  const cassette = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 16), m.rim);
  cassette.rotation.y = Math.PI / 2;
  cassette.position.set(rearX, HUB_Y, 0.04);

  const chainTop = tube(bbX + 0.08, bbY + 0.02, 0.05, rearX + 0.08, HUB_Y + 0.02, 0.05, m.chain, 0.008);
  const chainBot = tube(bbX + 0.08, bbY - 0.12, 0.05, rearX + 0.08, HUB_Y - 0.12, 0.05, m.chain, 0.008);

  const derailleur = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.03), m.rim);
  derailleur.position.set(rearX + 0.06, HUB_Y - 0.08, 0.06);

  drive.add(chainring, crankArm, pedalAxle, pedalBody, cassette, chainTop, chainBot, derailleur);
  return drive;
}

function createRider(m: ReturnType<typeof getMaterials>, pose: 'ride' | 'fall'): THREE.Group {
  const rider = new THREE.Group();
  rider.name = 'rider';

  const lean = pose === 'ride' ? -0.42 : -0.15;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.44, 0.22), m.jacket);
  torso.position.set(0.08, 1.36, 0);
  torso.rotation.z = lean;
  torso.castShadow = true;

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.2), m.jacket);
  chest.position.set(0.18, 1.52, 0);
  chest.rotation.z = lean - 0.08;
  chest.castShadow = true;

  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.2), m.pants);
  pelvis.position.set(-0.06, 1.1, 0);
  pelvis.rotation.z = lean + 0.12;
  pelvis.castShadow = true;

  const upperLeg = limb(m.pants, 0.36, 0.062, 0.052);
  upperLeg.position.set(0.04, 0.94, 0.05);
  upperLeg.rotation.z = pose === 'ride' ? 0.55 : 0.9;

  const lowerLeg = limb(m.pants, 0.34, 0.05, 0.042);
  lowerLeg.position.set(0.1, 0.66, 0.08);
  lowerLeg.rotation.z = pose === 'ride' ? 0.05 : 0.35;

  const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.1), m.shoe);
  shoe.position.set(pose === 'ride' ? 0.02 : -0.12, pose === 'ride' ? 0.48 : 0.52, 0.06);
  shoe.rotation.z = pose === 'ride' ? -0.15 : 0.2;

  const upperArm = limb(m.jacket, 0.28, 0.048, 0.042);
  upperArm.position.set(0.22, 1.34, 0.06);
  upperArm.rotation.z = pose === 'ride' ? -1.05 : -0.6;

  const forearm = limb(m.jacket, 0.26, 0.04, 0.034);
  forearm.position.set(0.38, 1.18, 0.1);
  forearm.rotation.z = pose === 'ride' ? -0.35 : -0.8;

  const glove = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), m.glove);
  glove.position.set(pose === 'ride' ? 0.48 : 0.32, pose === 'ride' ? 1.08 : 0.98, 0.1);
  glove.scale.set(1.1, 0.85, 0.9);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 10), m.skin);
  neck.position.set(0.1, 1.62, 0);
  neck.rotation.z = lean + 0.2;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.145, 20, 16), m.skin);
  head.position.set(0.14, 1.76, 0);
  head.rotation.z = lean + 0.15;
  head.scale.set(0.95, 1.05, 0.92);

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.158, 20, 16), m.helmet);
  helmet.position.set(0.14, 1.785, 0);
  helmet.rotation.z = lean + 0.12;
  helmet.scale.set(1.02, 0.88, 1);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.12), m.visor);
  visor.position.set(0.24, 1.76, 0);
  visor.rotation.z = lean + 0.05;

  const strap = tube(0.08, 1.68, 0.06, 0.16, 1.72, -0.06, m.rubber, 0.008);

  rider.add(
    torso,
    chest,
    pelvis,
    upperLeg,
    lowerLeg,
    shoe,
    upperArm,
    forearm,
    glove,
    neck,
    head,
    helmet,
    visor,
    strap
  );
  setShadows(rider);
  return rider;
}

function createBikeFrame(m: ReturnType<typeof getMaterials>): THREE.Group {
  const frame = new THREE.Group();
  frame.name = 'bike-frame';

  const bbX = -0.06;
  const bbY = 0.72;
  const seatX = -0.22;
  const seatY = 1.08;
  const headX = 0.68;
  const headY = 1.18;
  const headBaseY = headY - 0.18;

  frame.add(
    tube(REAR_X, HUB_Y, 0, bbX, bbY, 0, m.frameDark, 0.036),
    tube(FRONT_X, HUB_Y, 0, bbX, bbY, 0, m.frameDark, 0.036),
    tube(REAR_X, HUB_Y, 0, seatX, seatY - 0.06, 0, m.frameDark, 0.028),
    tube(seatX, seatY - 0.06, 0, bbX, bbY, 0, m.frame, 0.04),
    tube(bbX, bbY, 0, headBaseX(headX), headBaseY, 0, m.frameDark, 0.038),
    tube(seatX, seatY, 0, headX, headY - 0.04, 0, m.frame, 0.034),
    tube(bbX, bbY, 0, headX, headY - 0.04, 0, m.frameDark, 0.032)
  );

  const fork = tube(FRONT_X, HUB_Y, 0, headX, headBaseY, 0, m.frameDark, 0.032);
  const forkBrace = tube(FRONT_X, HUB_Y + 0.12, 0, headX - 0.08, headBaseY + 0.06, 0, m.frameDark, 0.018);
  frame.add(fork, forkBrace);

  const seatPost = tube(seatX, seatY - 0.04, 0, seatX, seatY + 0.02, 0, m.frameDark, 0.022);
  const saddle = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), m.saddle);
  saddle.scale.set(1.7, 0.32, 0.95);
  saddle.position.set(seatX, seatY + 0.05, 0);
  saddle.castShadow = true;

  const brakeFront = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.03), m.rim);
  brakeFront.position.set(FRONT_X + 0.04, HUB_Y + 0.18, 0);
  const brakeRear = brakeFront.clone();
  brakeRear.position.set(REAR_X + 0.04, HUB_Y + 0.16, 0);

  frame.add(seatPost, saddle, brakeFront, brakeRear, createDropBar(m, headX, headY - 0.04));
  frame.add(createDrivetrain(m, bbX, bbY, REAR_X));

  return frame;
}

function headBaseX(headX: number): number {
  return headX - 0.04;
}

export function createBike(repairMode = false): BikeRig {
  const root = new THREE.Group();
  const frame = createBikeFrame(getMaterials());

  const frontWheel = wheel(WHEEL_R);
  frontWheel.position.set(FRONT_X, HUB_Y, 0);

  const rearWheel = wheel(WHEEL_R);
  rearWheel.position.set(REAR_X, HUB_Y, 0);
  rearWheel.visible = !repairMode;

  frame.add(frontWheel, rearWheel, createRider(getMaterials(), 'ride'));
  setShadows(frame);
  root.add(frame);
  return { root, frame, frontWheel, rearWheel };
}

export function createRepairWheel(): THREE.Group {
  const m = getMaterials();
  const group = new THREE.Group();
  group.name = 'repair-wheel';

  const tire = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.12, 28, 72),
    createTireMaterial(2.5, 1.6)
  );
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
  const rider = bike.frame.getObjectByName('rider');
  if (rider) rider.visible = false;

  const m = getMaterials();
  bike.frame.add(createRider(m, 'fall'));
  return bike.root;
}

export const BIKE_WHEEL_RADIUS = WHEEL_R;
