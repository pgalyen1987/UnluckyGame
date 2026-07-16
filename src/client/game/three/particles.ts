import * as THREE from 'three';

export function createBurst(scene: THREE.Scene, color: number, count: number, origin: THREE.Vector3): void {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const velocities: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    positions[i * 3] = origin.x;
    positions[i * 3 + 1] = origin.y;
    positions[i * 3 + 2] = origin.z;
    velocities.push(
      new THREE.Vector3(
        (Math.random() - 0.5) * 2.6,
        Math.random() * 2.8 + 0.4,
        (Math.random() - 0.5) * 1.4
      )
    );
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color,
    size: 0.16,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  const start = performance.now();
  const tick = (): void => {
    const t = (performance.now() - start) / 1000;
    if (t > 0.6) {
      scene.remove(points);
      geo.dispose();
      mat.dispose();
      return;
    }
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      pos.setXYZ(
        i,
        origin.x + velocities[i]!.x * t,
        origin.y + velocities[i]!.y * t - t * t * 2.2,
        origin.z + velocities[i]!.z * t
      );
    }
    pos.needsUpdate = true;
    mat.opacity = 1 - t / 0.6;
    mat.size = 0.16 * (1 - t * 0.5);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function createSparkRing(scene: THREE.Scene, origin: THREE.Vector3, color = 0x86efac): void {
  const count = 28;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const dirs: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    positions[i * 3] = origin.x;
    positions[i * 3 + 1] = origin.y;
    positions[i * 3 + 2] = origin.z;
    dirs.push(new THREE.Vector3(Math.cos(a) * 1.8, Math.sin(a) * 1.1 + 0.4, (Math.random() - 0.5) * 0.4));
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color,
    size: 0.1,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);
  const start = performance.now();
  const tick = (): void => {
    const t = (performance.now() - start) / 1000;
    if (t > 0.45) {
      scene.remove(points);
      geo.dispose();
      mat.dispose();
      return;
    }
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      pos.setXYZ(i, origin.x + dirs[i]!.x * t, origin.y + dirs[i]!.y * t, origin.z + dirs[i]!.z * t);
    }
    pos.needsUpdate = true;
    mat.opacity = 1 - t / 0.45;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export type DustSystem = {
  points: THREE.Points;
  update: (dt: number, active: boolean, speed: number) => void;
};

/** Soft dust / exhaust trail that follows the bike while riding. */
export function createDustTrail(scene: THREE.Scene): DustSystem {
  const count = 48;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const ages = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = -3;
    positions[i * 3 + 1] = 0.2;
    positions[i * 3 + 2] = 0;
    ages[i] = Math.random();
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xc8d4e0,
    size: 0.14,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.visible = false;
  scene.add(points);

  let spawn = 0;
  return {
    points,
    update(dt: number, active: boolean, speed: number) {
      points.visible = active;
      if (!active) return;
      mat.opacity = 0.2 + Math.min(0.35, speed * 0.08);
      spawn += dt * (6 + speed * 4);
      const pos = geo.attributes.position as THREE.BufferAttribute;
      while (spawn >= 1) {
        spawn -= 1;
        const i = Math.floor(Math.random() * count);
        pos.setXYZ(i, -2.9 + Math.random() * 0.4, 0.08 + Math.random() * 0.25, (Math.random() - 0.5) * 0.5);
        ages[i] = 0;
      }
      for (let i = 0; i < count; i++) {
        ages[i]! += dt * 1.2;
        const x = pos.getX(i) - speed * dt * 1.6;
        const y = pos.getY(i) + dt * 0.15;
        const z = pos.getZ(i);
        pos.setXYZ(i, x, y, z);
        if (ages[i]! > 1.2) {
          pos.setXYZ(i, -4, -2, 0);
        }
      }
      pos.needsUpdate = true;
    },
  };
}
