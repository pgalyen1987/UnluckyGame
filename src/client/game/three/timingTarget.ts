import * as THREE from 'three';
import { TIMING_WINDOW_DEG } from '../config';
import { getMaterials } from './materials';
import { SKETCH_REPAIR_WHEEL_R } from './bike';

/**
 * Fixed alignment marks — NOT parented to the spinning wheel.
 * Top post + glow ring + acceptance arc (side-profile wheel).
 */
export function createTimingTarget(wheelRadius = SKETCH_REPAIR_WHEEL_R): THREE.Group {
  const m = getMaterials();
  const root = new THREE.Group();
  root.name = 'timing-target';

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(wheelRadius + 0.08, 0.028, 8, 56),
    m.greenSoft.clone()
  );
  ring.rotation.y = Math.PI / 2;
  ring.name = 'pulse-ring';

  const topPost = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.04), m.green);
  topPost.position.y = wheelRadius + 0.22;

  const topCap = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.08), m.green);
  topCap.position.y = wheelRadius + 0.42;

  const chevron = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.16, 3), m.green);
  chevron.position.y = wheelRadius + 0.06;
  chevron.rotation.z = Math.PI;
  chevron.name = 'chevron';

  const half = THREE.MathUtils.degToRad(TIMING_WINDOW_DEG / 2);
  const arc = new THREE.Mesh(
    new THREE.RingGeometry(
      wheelRadius - 0.06,
      wheelRadius + 0.1,
      48,
      1,
      -Math.PI / 2 - half,
      TIMING_WINDOW_DEG * (Math.PI / 180)
    ),
    new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
    })
  );
  arc.rotation.y = Math.PI / 2;
  arc.name = 'accept-arc';

  const glow = new THREE.PointLight(0x4ade80, 1.6, 3.5, 2);
  glow.position.y = wheelRadius + 0.2;
  glow.name = 'target-glow';

  root.add(ring, arc, topPost, topCap, chevron, glow);
  return root;
}

export function updateTimingTarget(root: THREE.Group, t: number, nearHit: boolean): void {
  const pulse = 1 + Math.sin(t * 6) * 0.04;
  const ring = root.getObjectByName('pulse-ring');
  if (ring) ring.scale.setScalar(pulse);

  const wheelRadius = SKETCH_REPAIR_WHEEL_R;
  const chevron = root.getObjectByName('chevron');
  if (chevron) chevron.position.y = wheelRadius + 0.06 + Math.sin(t * 5) * 0.02;

  const glow = root.getObjectByName('target-glow') as THREE.PointLight | undefined;
  if (glow) glow.intensity = nearHit ? 3.2 : 1.4 + Math.sin(t * 4) * 0.3;

  const arc = root.getObjectByName('accept-arc') as THREE.Mesh | undefined;
  if (arc && arc.material instanceof THREE.MeshBasicMaterial) {
    arc.material.opacity = nearHit ? 0.55 : 0.28 + Math.sin(t * 3) * 0.06;
  }
}
