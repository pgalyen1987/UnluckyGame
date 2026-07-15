import type { GameState, LeaderboardEntry, UnlockResult } from '../../shared/types';

export async function fetchGameState(): Promise<GameState | null> {
  try {
    const res = await fetch('/api/state');
    const data = await res.json();
    if (data.success && data.state) return data.state as GameState;
  } catch (e) {
    console.error('fetchGameState', e);
  }
  return null;
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch('/api/leaderboard');
    const data = await res.json();
    if (data.success && Array.isArray(data.leaderboard)) return data.leaderboard;
  } catch (e) {
    console.error('fetchLeaderboard', e);
  }
  return [];
}

export async function postProgress(bestStreak: number, totalTaps: number): Promise<void> {
  try {
    await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bestStreak, totalTaps }),
    });
  } catch (e) {
    console.error('postProgress', e);
  }
}

export async function postUnlockCutscene(
  streak: number,
  totalTaps: number
): Promise<UnlockResult | null> {
  try {
    const res = await fetch('/api/unlock-cutscene', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ streak, totalTaps }),
    });
    return (await res.json()) as UnlockResult;
  } catch (e) {
    console.error('postUnlockCutscene', e);
    return null;
  }
}
