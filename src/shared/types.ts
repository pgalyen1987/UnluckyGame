export type LeaderboardEntry = {
  username: string;
  bestStreak: number;
  rank: number;
};

export type GameState = {
  username: string;
  bestStreak: number;
  totalTaps: number;
  cutsceneSeen: boolean;
  chainLevel: number;
  globalUnlocks: number;
  chainStarted: boolean;
};

export type ProgressPayload = {
  bestStreak: number;
  totalTaps: number;
};

export type UnlockResult = {
  success: boolean;
  globalUnlockNumber: number;
  chainLevel: number;
  firstGlobalUnlock: boolean;
};
