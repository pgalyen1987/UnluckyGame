const params = new URLSearchParams(window.location.search);

/** Demo-friendly easy mode via ?easy=1 */
export const EASY_MODE = params.get('easy') === '1';

/** Consecutive perfect taps required to unlock the cutscene */
export const REQUIRED_STREAK = EASY_MODE ? 12 : 280;

/** Degrees of rotation where a tap counts as perfect */
export const TIMING_WINDOW_DEG = EASY_MODE ? 18 : 4;

/** Base wheel spin speed (degrees per frame at 60fps) */
export const BASE_SPIN_SPEED = EASY_MODE ? 2.4 : 4.2;

/** Speed increase per successful tap */
export const SPIN_ACCEL = EASY_MODE ? 0.04 : 0.08;

/** Max spin speed cap */
export const MAX_SPIN_SPEED = EASY_MODE ? 5 : 9.5;

export const COLORS = {
  sky: 0x8fa3b8,
  lane: 0x4a5568,
  laneMark: 0xfbbf24,
  curb: 0x374151,
  bikeFrame: 0x1f2937,
  wheel: 0x111827,
  rim: 0x9ca3af,
  jacket: 0x2563eb,
  skin: 0xfcd9b6,
  helmet: 0xf97316,
  backupGlow: 0xef4444,
  perfect: 0x22c55e,
  text: '#f8fafc',
  muted: '#cbd5e1',
} as const;

export const STORAGE_KEYS = {
  bestStreak: 'unlucky:bestStreak',
  cutsceneSeen: 'unlucky:cutsceneSeen',
  totalTaps: 'unlucky:totalTaps',
} as const;
