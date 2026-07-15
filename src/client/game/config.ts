const params = new URLSearchParams(window.location.search);

/** Demo-friendly easy mode via ?easy=1 */
export const EASY_MODE = params.get('easy') === '1';

/** Consecutive perfect taps required to unlock the cutscene */
export const REQUIRED_STREAK = EASY_MODE ? 12 : 280;

/**
 * Degrees of error allowed around the mark (full width).
 * Notch is drawn at wheelAngle-90; mark is fixed at top (wheelAngle === 0).
 */
export const TIMING_WINDOW_DEG = EASY_MODE ? 28 : 16;

/** Base wheel spin speed (degrees per frame at ~60fps) */
export const BASE_SPIN_SPEED = EASY_MODE ? 1.8 : 2.6;

/** Speed increase per successful tap */
export const SPIN_ACCEL = EASY_MODE ? 0.03 : 0.05;

/** Max spin speed cap */
export const MAX_SPIN_SPEED = EASY_MODE ? 4.5 : 7;

/** Perfect alignment angle — green notch points at the top mark */
export const TARGET_ANGLE = 0;

export const COLORS = {
  sky: 0x9ecae8,
  lane: 0x3a404c,
  laneMark: 0xf5c842,
  curb: 0x5a6270,
  curbDark: 0x2e333d,
  bikeFrame: 0xef4444,
  wheel: 0x181c24,
  rim: 0x9aa3b5,
  jacket: 0x3b82f6,
  skin: 0xf5c99a,
  helmet: 0xf97316,
  backupGlow: 0xef4444,
  perfect: 0x22c55e,
  perfectHi: 0x86efac,
  miss: 0xef4444,
  ink: '#141820',
  text: '#f8fafc',
  muted: '#cbd5e1',
} as const;

export const STORAGE_KEYS = {
  bestStreak: 'unlucky:bestStreak',
  cutsceneSeen: 'unlucky:cutsceneSeen',
  totalTaps: 'unlucky:totalTaps',
} as const;
