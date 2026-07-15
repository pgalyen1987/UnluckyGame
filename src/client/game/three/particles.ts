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
        (Math.random() - 0.5) * 2.2,
        Math.random() * 2.4,
        (Math.random() - 0.5) * 1.2
      )
    );
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color,
    size: 0.12,
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
    if (t > 0.55) {
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
        origin.y + velocities[i]!.y * t - t * t * 1.8,
        origin.z + velocities[i]!.z * t
      );
    }
    pos.needsUpdate = true;
    mat.opacity = 1 - t / 0.55;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
