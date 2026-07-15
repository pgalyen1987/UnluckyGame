/** Urban bike-lane palette — warm sky, cool asphalt, punchy accents. */
export const P = {
  ink: '#141820',
  inkSoft: '#252b38',

  skyTop: '#6eb5e8',
  skyMid: '#9ecae8',
  skyBot: '#d4e4f2',
  cloud: '#f8fbff',
  sun: '#ffe08a',

  buildingFar: '#3a4558',
  buildingFarHi: '#4d5a70',
  buildingNear: '#252d3a',
  buildingNearHi: '#364052',
  window: '#fbbf24',
  windowOff: '#1e2430',

  asphalt: '#3a404c',
  asphaltHi: '#4a5262',
  asphaltLo: '#2e333d',
  curb: '#5a6270',
  curbHi: '#727b8c',
  laneMark: '#f5c842',
  laneMarkHi: '#fde68a',

  tire: '#181c24',
  tireHi: '#2a303c',
  rim: '#9aa3b5',
  rimHi: '#c5ccd8',
  spoke: '#6b7280',
  frame: '#ef4444',
  frameShade: '#b91c1c',
  frameHi: '#f87171',
  seat: '#1f2937',
  handle: '#374151',

  jacket: '#3b82f6',
  jacketShade: '#1d4ed8',
  jacketHi: '#60a5fa',
  skin: '#f5c99a',
  skinShade: '#d4a574',
  helmet: '#f97316',
  helmetShade: '#c2410c',
  helmetHi: '#fdba74',
  pants: '#1e293b',

  perfect: '#22c55e',
  perfectHi: '#86efac',
  miss: '#ef4444',
  spark: '#fde047',
  sparkHi: '#fffbeb',
  shadow: 'rgba(20,24,32,0.35)',
} as const;

export const parseColor = (c: string): [number, number, number, number] => {
  if (c.startsWith('#')) {
    const n = parseInt(c.slice(1), 16);
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff, 255];
  }
  const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
  if (m) {
    return [
      Number(m[1]),
      Number(m[2]),
      Number(m[3]),
      Math.round((m[4] === undefined ? 1 : Number(m[4])) * 255),
    ];
  }
  return [255, 0, 255, 255];
};
