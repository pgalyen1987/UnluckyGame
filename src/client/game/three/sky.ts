import * as THREE from 'three';

export function createSky(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(80, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      top: { value: new THREE.Color(0x4a9fd4) },
      mid: { value: new THREE.Color(0x8ec5ea) },
      bottom: { value: new THREE.Color(0xd4e8f8) },
      sun: { value: new THREE.Vector3(0.55, 0.35, -0.4) },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 top, mid, bottom, sun;
      varying vec3 vPos;
      void main() {
        float h = vPos.y * 0.5 + 0.5;
        vec3 col = mix(bottom, mix(mid, top, smoothstep(0.35, 1.0, h)), smoothstep(0.0, 0.65, h));
        float sunDot = max(dot(normalize(vPos), normalize(sun)), 0.0);
        col += vec3(1.0, 0.92, 0.65) * pow(sunDot, 64.0) * 0.55;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  return new THREE.Mesh(geo, mat);
}
