import * as THREE from 'three';
import { TIMING_WINDOW_DEG } from '../config';
import { mats } from './materials';

/**
 * Fixed alignment marks — NOT parented to the spinning wheel.
 * Top post + glow ring + acceptance arc.
 */
export function createTimingTarget(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'timing-target';

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.045, 12, 64),
    mats.greenSoft
  );

  const topPost = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.12), mats.green);
  topPost.position.y = 1.32;

  const topCap = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.28), mats.green);
  topCap.position.y = 1.62;

  const chevron = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.28, 3), mats.green);
  chevron.position.y = 1.08;
  chevron.rotation.z = Math.PI;

  const half = THREE.MathUtils.degToRad(TIMING_WINDOW_DEG / 2);
  const arc = new THREE.Mesh(
    new THREE.RingGeometry(0.92, 1.12, 48, 1, -Math.PI / 2 - half, TIMING_WINDOW_DEG * (Math.PI / 180)),
    new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
    })
  );

  const glow = new THREE.PointLight(0x4ade80, 2.2, 4, 2);
  glow.position.y = 1.35;

  root.add(ring, arc, topPost, topCap, chevron, glow);
  return root;
}
