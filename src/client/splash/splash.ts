import { context, requestExpandedMode } from '@devvit/web/client';
import { fetchGameState, fetchLeaderboard } from '../game/api';

const startButton = document.getElementById('start-button') as HTMLButtonElement;
const statsEl = document.getElementById('stats') as HTMLDivElement;

startButton.addEventListener('click', (e) => {
  requestExpandedMode(e, 'game');
});

async function loadStats(): Promise<void> {
  const [state, board] = await Promise.all([fetchGameState(), fetchLeaderboard()]);
  const parts: string[] = [];

  if (state) {
    parts.push(`Chain level: ${state.chainLevel}`);
    if (state.globalUnlocks > 0) {
      parts.push(`${state.globalUnlocks} fall${state.globalUnlocks === 1 ? '' : 's'} witnessed globally`);
    }
    if (state.bestStreak > 0) {
      parts.push(`Your best chain: ${state.bestStreak}`);
    }
  }

  if (board.length > 0) {
    const top = board[0];
    if (top) parts.push(`Top chain: u/${top.username} (${top.bestStreak})`);
  }

  statsEl.textContent = parts.length > 0 ? parts.join(' · ') : 'Nobody has fallen yet.';
}

const greeting = context.username ? `u/${context.username}` : 'rider';
document.querySelector('.footer')!.textContent = `${greeting} — even winning is unlucky.`;

void loadStats();
