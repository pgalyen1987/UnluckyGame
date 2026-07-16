import * as THREE from 'three';
import { createTireMaterial, getMaterials } from './materials';

const WHEEL_R = 0.44;
const REAR_X = -0.96;
const FRONT_X = 0.96;
const HUB_Y = WHEEL_R;

export const SKETCH_REPAIR_WHEEL_R = 0.72;
export const SKETCH_WHEEL_ATTACH_SCALE = WHEEL_R / SKETCH_REPAIR_WHEEL_R;
export const BIKE_REAR_X = REAR_X;
export const BIKE_FRONT_X = FRONT_X;
export const BIKE_HUB_Y = HUB_Y;

function sketchMat(color = 0x1e293b): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color });
}

function sketchTube(
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number,
  mat: THREE.Material,
  r = 0.014
): THREE.Mesh {
  return tube(x1, y1, z1, x2, y2, z2, mat, r);
}

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
  upperLeg.name = 'upperLeg';
  upperLeg.position.set(0.04, 0.94, 0.05);
  upperLeg.rotation.z = pose === 'ride' ? 0.55 : 0.9;

  const lowerLeg = limb(m.pants, 0.34, 0.05, 0.042);
  lowerLeg.name = 'lowerLeg';
  lowerLeg.position.set(0.1, 0.66, 0.08);
  lowerLeg.rotation.z = pose === 'ride' ? 0.05 : 0.35;

  const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.1), m.shoe);
  shoe.name = 'shoe';
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

/** Side-profile sketch wheel — circle + spokes, rolls on X axis. */
export function createSketchWheel(radius: number, withNotch = false): THREE.Group {
  const m = getMaterials();
  const group = new THREE.Group();
  const line = sketchMat();

  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.018, 8, 56), line);
  rim.rotation.y = Math.PI / 2;

  for (let i = 0; i < 8; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.012, radius * 1.92, 0.012), line);
    spoke.rotation.x = (i * Math.PI) / 4;
    group.add(spoke);
  }

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.04, 10), line);
  hub.rotation.y = Math.PI / 2;

  group.add(rim, hub);

  if (withNotch) {
    const notch = new THREE.Mesh(new THREE.BoxGeometry(0.05, radius * 0.42, 0.02), m.green);
    notch.position.y = radius * 0.72;
    notch.name = 'notch';
    group.add(notch);
  }

  return group;
}

function buildSketchFrame(): THREE.Group {
  const line = sketchMat();
  const frame = new THREE.Group();
  frame.name = 'sketch-frame';

  const bbX = -0.06;
  const bbY = 0.72;
  const seatX = -0.22;
  const seatY = 1.08;
  const headX = 0.68;
  const headY = 1.18;
  const headBaseY = headY - 0.18;
  const headBaseX = headX - 0.04;

  frame.add(
    sketchTube(REAR_X, HUB_Y, 0, bbX, bbY, 0, line),
    sketchTube(FRONT_X, HUB_Y, 0, bbX, bbY, 0, line),
    sketchTube(REAR_X, HUB_Y, 0, seatX, seatY - 0.06, 0, line),
    sketchTube(seatX, seatY - 0.06, 0, bbX, bbY, 0, line),
    sketchTube(bbX, bbY, 0, headBaseX, headBaseY, 0, line),
    sketchTube(seatX, seatY, 0, headX, headY - 0.04, 0, line),
    sketchTube(FRONT_X, HUB_Y, 0, headX, headBaseY, 0, line),
    sketchTube(seatX, seatY - 0.04, 0, seatX, seatY + 0.22, 0, line),
    sketchTube(headX, headY - 0.04, 0, headX + 0.18, headY + 0.02, 0, line),
    sketchTube(headX + 0.18, headY + 0.02, 0, headX + 0.28, headY - 0.04, 0, line)
  );

  return frame;
}

function createSketchRider(pose: 'ride' | 'fall'): THREE.Group {
  const rider = new THREE.Group();
  rider.name = 'rider';
  const line = sketchMat();
  const accent = sketchMat(0x475569);
  const lean = pose === 'ride' ? -0.42 : -0.15;

  const torso = sketchTube(0.02, 1.18, 0, 0.2, 1.48, 0, line, 0.012);
  torso.rotation.z = lean;

  const pelvis = sketchTube(-0.04, 1.02, 0, 0.08, 1.2, 0, line, 0.012);
  pelvis.rotation.z = lean + 0.1;

  const upperLeg = sketchTube(0.04, 0.92, 0, 0.1, 0.66, 0, accent, 0.01);
  upperLeg.name = 'upperLeg';
  upperLeg.rotation.z = pose === 'ride' ? 0.55 : 0.9;

  const lowerLeg = sketchTube(0.1, 0.66, 0, 0.02, 0.48, 0, accent, 0.01);
  lowerLeg.name = 'lowerLeg';
  lowerLeg.rotation.z = pose === 'ride' ? 0.05 : 0.35;

  const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.04), accent);
  shoe.name = 'shoe';
  shoe.position.set(pose === 'ride' ? 0.02 : -0.12, pose === 'ride' ? 0.46 : 0.5, 0);
  shoe.rotation.z = pose === 'ride' ? -0.15 : 0.2;

  const upperArm = sketchTube(0.18, 1.32, 0, 0.36, 1.16, 0, line, 0.01);
  upperArm.rotation.z = pose === 'ride' ? -1.05 : -0.6;

  const forearm = sketchTube(0.36, 1.16, 0, 0.46, 1.04, 0, line, 0.01);
  forearm.rotation.z = pose === 'ride' ? -0.35 : -0.8;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), line);
  head.position.set(0.12, 1.62, 0);
  head.rotation.z = lean + 0.12;
  head.scale.set(0.95, 1.05, 0.5);

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), sketchMat(0xea580c));
  helmet.position.set(0.12, 1.64, 0);
  helmet.rotation.z = lean + 0.1;
  helmet.scale.set(1.02, 0.88, 0.5);

  rider.add(torso, pelvis, upperLeg, lowerLeg, shoe, upperArm, forearm, head, helmet);
  return rider;
}

/** Full line-art ride bike with both wheels and a stick rider. */
export function createSketchRideBike(repairMode = false): BikeRig {
  const root = new THREE.Group();
  const frame = buildSketchFrame();
  frame.name = 'bike-frame';

  const frontWheel = createSketchWheel(WHEEL_R);
  frontWheel.position.set(FRONT_X, HUB_Y, 0);

  const rearWheel = createSketchWheel(WHEEL_R);
  rearWheel.position.set(REAR_X, HUB_Y, 0);
  rearWheel.visible = !repairMode;

  frame.add(frontWheel, rearWheel, createSketchRider('ride'));
  root.add(frame);
  return { root, frame, frontWheel, rearWheel };
}

/** Line-art side profile — frame + front wheel, rear wheel removed for repair. */
export function createSketchBike(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'sketch-bike';

  const frame = buildSketchFrame();
  const frontWheel = createSketchWheel(WHEEL_R);
  frontWheel.position.set(FRONT_X, HUB_Y, 0);

  group.add(frame, frontWheel);
  return group;
}

/** Attach a ride-sized rear wheel to a sketch bike group. */
export function attachSketchRearWheel(bike: THREE.Group): THREE.Group {
  const rearWheel = createSketchWheel(WHEEL_R);
  rearWheel.position.set(REAR_X, HUB_Y, 0);
  rearWheel.name = 'attached-rear-wheel';
  bike.add(rearWheel);
  return rearWheel;
}

export function getSketchRearHubLocal(): THREE.Vector3 {
  return new THREE.Vector3(REAR_X, HUB_Y, 0);
}

export function createRepairWheel(): THREE.Group {
  const group = createSketchWheel(SKETCH_REPAIR_WHEEL_R, true);
  group.name = 'repair-wheel';
  return group;
}

/** Small chevrons pointing from the bike toward the detached wheel. */
export function createRepairArrows(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'repair-arrows';
  const mat = sketchMat(0x64748b);

  for (let i = 0; i < 2; i++) {
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 3), mat);
    arrow.rotation.z = -Math.PI / 2;
    arrow.position.set(-0.15 + i * 0.22, 0.52 + i * 0.1, 0);
    group.add(arrow);
  }

  return group;
}

export function createVictoryBike(): THREE.Group {
  const bike = createSketchRideBike(false);
  const rider = bike.frame.getObjectByName('rider');
  if (rider) rider.visible = false;
  bike.frame.add(createSketchRider('fall'));
  return bike.root;
}

/** Subtle pedaling + bob while riding. */
export function updateBikeMotion(rig: BikeRig, t: number, riding: boolean): void {
  if (!riding) return;
  const bob = Math.sin(t * 10) * 0.012;
  rig.root.position.y = bob;
  rig.frame.rotation.z = Math.sin(t * 6) * 0.028;

  const rider = rig.frame.getObjectByName('rider');
  if (!rider) return;
  const upper = rider.getObjectByName('upperLeg');
  const lower = rider.getObjectByName('lowerLeg');
  const shoe = rider.getObjectByName('shoe');
  const pedal = Math.sin(t * 12);
  if (upper) upper.rotation.z = 0.55 + pedal * 0.22;
  if (lower) lower.rotation.z = 0.05 + pedal * 0.18;
  if (shoe) {
    shoe.position.y = 0.48 + pedal * 0.06;
    shoe.position.x = 0.02 - pedal * 0.04;
  }
}

export const BIKE_WHEEL_RADIUS = WHEEL_R;
