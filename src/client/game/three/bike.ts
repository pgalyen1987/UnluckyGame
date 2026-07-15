import * as THREE from 'three';

export type BikeRig = {
  root: THREE.Group;
  frame: THREE.Group;
  frontWheel: THREE.Group;
  rearWheel: THREE.Group;
};

function wheel(radius: number): THREE.Group {
  const tire = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.08, 10, 24),
    new THREE.MeshToonMaterial({ color: 0x181c24 })
  );
  tire.rotation.y = Math.PI / 2;
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.72, 0.03, 8, 20),
    new THREE.MeshToonMaterial({ color: 0x9aa3b5 })
  );
  rim.rotation.y = Math.PI / 2;
  const group = new THREE.Group();
  group.add(tire, rim);
  return group;
}

export function createBike(repairMode = false): BikeRig {
  const root = new THREE.Group();
  const frame = new THREE.Group();

  const frameMat = new THREE.MeshToonMaterial({ color: 0xef4444 });
  const darkMat = new THREE.MeshToonMaterial({ color: 0xb91c1c });
  const jacketMat = new THREE.MeshToonMaterial({ color: 0x3b82f6 });
  const skinMat = new THREE.MeshToonMaterial({ color: 0xf5c99a });
  const helmetMat = new THREE.MeshToonMaterial({ color: 0xf97316 });

  const frontWheel = wheel(0.42);
  frontWheel.position.set(0.95, 0.42, 0);

  const rearWheel = wheel(0.42);
  rearWheel.position.set(-0.95, 0.42, 0);
  rearWheel.visible = !repairMode;

  const downTube = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.08, 0.08), frameMat);
  downTube.position.set(0, 0.72, 0);
  downTube.rotation.z = -0.55;

  const seatTube = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.08), darkMat);
  seatTube.position.set(-0.15, 0.95, 0);
  seatTube.rotation.z = 0.35;

  const topTube = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.07, 0.07), frameMat);
  topTube.position.set(0.05, 1.05, 0);
  topTube.rotation.z = 0.12;

  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 0.06), darkMat);
  handle.position.set(0.72, 1.18, 0);
  handle.rotation.z = -0.2;

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.12), darkMat);
  seat.position.set(-0.18, 1.08, 0);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.22), jacketMat);
  torso.position.set(-0.02, 1.35, 0);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), skinMat);
  head.position.set(0.02, 1.68, 0);

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), helmetMat);
  helmet.position.set(0.02, 1.72, 0);
  helmet.scale.set(1, 0.82, 1);

  frame.add(
    downTube,
    seatTube,
    topTube,
    handle,
    seat,
    torso,
    head,
    helmet,
    frontWheel,
    rearWheel
  );
  root.add(frame);

  return { root, frame, frontWheel, rearWheel };
}

export function createRepairWheel(): THREE.Group {
  const group = new THREE.Group();
  const tire = new THREE.Mesh(
    new THREE.TorusGeometry(0.95, 0.14, 14, 36),
    new THREE.MeshToonMaterial({ color: 0x181c24 })
  );
  tire.rotation.y = Math.PI / 2;

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.72, 0.05, 10, 28),
    new THREE.MeshToonMaterial({ color: 0x9aa3b5 })
  );
  rim.rotation.y = Math.PI / 2;

  for (let i = 0; i < 8; i++) {
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.62, 0.04),
      new THREE.MeshToonMaterial({ color: 0x6b7280 })
    );
    spoke.rotation.z = (i * Math.PI) / 4;
    group.add(spoke);
  }

  const notch = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.42, 0.08),
    new THREE.MeshBasicMaterial({ color: 0x22c55e })
  );
  notch.position.y = 0.78;
  notch.name = 'notch';

  const marker = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.28, 0.06),
    new THREE.MeshBasicMaterial({ color: 0x86efac })
  );
  marker.position.set(0, 1.18, 0);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.02, 0.03, 8, 48),
    new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.35 })
  );
  ring.rotation.x = Math.PI / 2;

  group.add(tire, rim, notch, marker, ring);
  return group;
}
