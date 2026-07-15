import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { makeAsphaltMaps, makeConcreteNormal, makeTireMaps } from './textures';

export type GameMaterials = ReturnType<typeof createMaterials>;

export function createMaterials(): Record<string, THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial> {
  const asphaltMaps = makeAsphaltMaps();
  const concreteNormal = makeConcreteNormal();
  const tireMaps = makeTireMaps();

  const asphaltWet = new THREE.MeshPhysicalMaterial({
    color: 0x4a5264,
    map: asphaltMaps.map,
    normalMap: asphaltMaps.normal,
    normalScale: new THREE.Vector2(0.35, 0.35),
    roughnessMap: asphaltMaps.rough,
    roughness: 0.42,
    metalness: 0.08,
    clearcoat: 0.65,
    clearcoatRoughness: 0.22,
  });

  const buildingNear = new THREE.MeshStandardMaterial({
    color: 0x3a4250,
    normalMap: concreteNormal,
    normalScale: new THREE.Vector2(0.25, 0.25),
    roughness: 0.82,
    metalness: 0.02,
  });

  const buildingFar = buildingNear.clone();
  buildingFar.color.setHex(0x4a5568);

  return {
    asphalt: new THREE.MeshStandardMaterial({ color: 0x3a404c, roughness: 0.92, metalness: 0.05 }),
    asphaltWet,
    curb: new THREE.MeshStandardMaterial({ color: 0x6a7280, roughness: 0.78, metalness: 0.04 }),
    curbPaint: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.55 }),
    laneGreen: new THREE.MeshStandardMaterial({ color: 0x3d7a52, roughness: 0.75, metalness: 0.02 }),
    buildingFar,
    buildingNear,
    windowLit: new THREE.MeshPhysicalMaterial({
      color: 0xfff0c2,
      emissive: 0xffb347,
      emissiveIntensity: 0.85,
      roughness: 0.15,
      metalness: 0.1,
      transparent: true,
      opacity: 0.95,
    }),
    windowDark: new THREE.MeshPhysicalMaterial({
      color: 0x1a2438,
      roughness: 0.08,
      metalness: 0.35,
      reflectivity: 0.9,
    }),
    frame: new THREE.MeshPhysicalMaterial({ color: 0xe63946, roughness: 0.32, metalness: 0.55, clearcoat: 0.4 }),
    frameDark: new THREE.MeshPhysicalMaterial({ color: 0x9f1239, roughness: 0.38, metalness: 0.45 }),
    tire: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tireMaps.map,
      normalMap: tireMaps.normal,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughnessMap: tireMaps.rough,
      roughness: 0.92,
      metalness: 0,
    }),
    rim: new THREE.MeshPhysicalMaterial({ color: 0xd1d9e6, roughness: 0.18, metalness: 0.92, clearcoat: 0.5 }),
    chain: new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.45, metalness: 0.75 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x141820, roughness: 0.94, metalness: 0 }),
    saddle: new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.72, metalness: 0.05 }),
    grip: new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.96, metalness: 0 }),
    shoe: new THREE.MeshPhysicalMaterial({ color: 0xf1f5f9, roughness: 0.55, metalness: 0.08, clearcoat: 0.2 }),
    glove: new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.88, metalness: 0 }),
    jacket: new THREE.MeshPhysicalMaterial({
      color: 0x1d4ed8,
      roughness: 0.78,
      metalness: 0.02,
      sheen: 0.35,
      sheenRoughness: 0.6,
      sheenColor: new THREE.Color(0x60a5fa),
    }),
    pants: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9, metalness: 0 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.68, metalness: 0 }),
    helmet: new THREE.MeshPhysicalMaterial({ color: 0xf97316, roughness: 0.32, metalness: 0.12, clearcoat: 0.65 }),
    visor: new THREE.MeshPhysicalMaterial({
      color: 0x1e293b,
      roughness: 0.15,
      metalness: 0.2,
      transparent: true,
      opacity: 0.75,
    }),
    tree: new THREE.MeshStandardMaterial({ color: 0x2f6b3a, roughness: 0.92 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.95 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0x3a4250, roughness: 0.35, metalness: 0.65 }),
    carBody: new THREE.MeshPhysicalMaterial({ color: 0x64748b, roughness: 0.35, metalness: 0.55, clearcoat: 0.35 }),
    carBodyDark: new THREE.MeshPhysicalMaterial({ color: 0x334155, roughness: 0.38, metalness: 0.5, clearcoat: 0.3 }),
    green: new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x15803d,
      emissiveIntensity: 0.65,
      roughness: 0.35,
      metalness: 0.1,
    }),
    greenSoft: new THREE.MeshStandardMaterial({
      color: 0x86efac,
      emissive: 0x22c55e,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.4,
    }),
  };
}

let mats: GameMaterials | null = null;

export function getMaterials(): GameMaterials {
  if (!mats) mats = createMaterials();
  return mats;
}

/** Clone tire material with tread repeat tuned for torus wheels. */
export function createTireMaterial(ringRepeat: number, tubeRepeat = 1): THREE.MeshStandardMaterial {
  const base = getMaterials().tire as THREE.MeshStandardMaterial;
  const mat = base.clone();
  const cloneMap = (tex: THREE.Texture | null | undefined): THREE.Texture | undefined => {
    if (!tex) return undefined;
    const t = tex.clone();
    t.repeat.set(ringRepeat, tubeRepeat);
    return t;
  };
  mat.map = cloneMap(base.map);
  mat.normalMap = cloneMap(base.normalMap);
  mat.roughnessMap = cloneMap(base.roughnessMap);
  return mat;
}

export function applyEnvironment(scene: THREE.Scene, renderer: THREE.WebGLRenderer): void {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.85;
  pmrem.dispose();
}
