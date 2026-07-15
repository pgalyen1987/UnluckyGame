import * as THREE from 'three';

export const mats = {
  asphalt: new THREE.MeshStandardMaterial({ color: 0x3a404c, roughness: 0.92, metalness: 0.05 }),
  asphaltWet: new THREE.MeshStandardMaterial({
    color: 0x454c5c,
    roughness: 0.35,
    metalness: 0.25,
  }),
  curb: new THREE.MeshStandardMaterial({ color: 0x5a6270, roughness: 0.85 }),
  buildingFar: new THREE.MeshStandardMaterial({ color: 0x3a4558, roughness: 0.9 }),
  buildingNear: new THREE.MeshStandardMaterial({ color: 0x252d3a, roughness: 0.88 }),
  windowLit: new THREE.MeshStandardMaterial({
    color: 0xffd56a,
    emissive: 0xfbbf24,
    emissiveIntensity: 1.4,
    roughness: 0.4,
  }),
  windowDark: new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 0.6 }),
  frame: new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.45, metalness: 0.15 }),
  frameDark: new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.5 }),
  tire: new THREE.MeshStandardMaterial({ color: 0x141820, roughness: 0.95 }),
  rim: new THREE.MeshStandardMaterial({ color: 0xb8c2d4, roughness: 0.35, metalness: 0.65 }),
  jacket: new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.7 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xf5c99a, roughness: 0.8 }),
  helmet: new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.55 }),
  tree: new THREE.MeshStandardMaterial({ color: 0x3d6b45, roughness: 0.9 }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x5c4030, roughness: 0.95 }),
  lamp: new THREE.MeshStandardMaterial({ color: 0x2a303c, roughness: 0.4, metalness: 0.5 }),
  green: new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x22c55e,
    emissiveIntensity: 2.2,
    roughness: 0.3,
  }),
  greenSoft: new THREE.MeshStandardMaterial({
    color: 0x86efac,
    emissive: 0x4ade80,
    emissiveIntensity: 1.2,
    transparent: true,
    opacity: 0.45,
  }),
};
