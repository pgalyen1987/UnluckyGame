import * as THREE from 'three';

export function createSky(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(90, 48, 24);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      top: { value: new THREE.Color(0x3d7ab8) },
      mid: { value: new THREE.Color(0x7eb8e8) },
      horizon: { value: new THREE.Color(0xc8dce8) },
      sunDir: { value: new THREE.Vector3(0.45, 0.28, 0.35).normalize() },
      time: { value: 0 },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 top, mid, horizon, sunDir;
      uniform float time;
      varying vec3 vPos;
      float noise(vec3 p) {
        return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453);
      }
      void main() {
        float h = vPos.y * 0.5 + 0.5;
        vec3 col = mix(horizon, mix(mid, top, smoothstep(0.25, 0.95, h)), smoothstep(0.0, 0.55, h));
        float sun = pow(max(dot(vPos, sunDir), 0.0), 128.0);
        col += vec3(1.0, 0.94, 0.78) * sun * 0.9;
        float c = smoothstep(0.15, 0.55, h) * smoothstep(0.85, 0.45, h);
        float n = noise(vPos * 3.0 + vec3(time * 0.015, 0.0, 0.0));
        col = mix(col, vec3(1.0), c * smoothstep(0.55, 0.85, n) * 0.35);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(geo, mat);
  sky.name = 'sky';
  return sky;
}

export function updateSkyTime(sky: THREE.Mesh, t: number): void {
  const u = (sky.material as THREE.ShaderMaterial).uniforms.time;
  if (u) u.value = t;
}
