import { context, requestExpandedMode } from '@devvit/web/client';
import { fetchGameState, fetchLeaderboard } from '../game/api';

const startButton = document.getElementById('start-button') as HTMLButtonElement;
const statsEl = document.getElementById('stats') as HTMLDivElement;

startButton.addEventListener('click', (e) => {
  requestExpandedMode(e, 'game');
});

function setStats(items: Array<{ label: string; value: string }>): void {
  statsEl.innerHTML = '';
  if (items.length === 0) {
    statsEl.textContent = 'The lane is empty. For now.';
    return;
  }
  for (const item of items) {
    const pill = document.createElement('div');
    pill.className = 'stat-pill';
    pill.innerHTML = `<span class="stat-label">${item.label}</span><span class="stat-value">${item.value}</span>`;
    statsEl.appendChild(pill);
  }
}

async function loadStats(): Promise<void> {
  const items: Array<{ label: string; value: string }> = [];

  try {
    const [state, board] = await Promise.all([fetchGameState(), fetchLeaderboard()]);

    if (state) {
      items.push({ label: 'Chain lvl', value: String(state.chainLevel) });
      if (state.bestStreak > 0) {
        items.push({ label: 'Your best', value: String(state.bestStreak) });
      }
      if (state.globalUnlocks > 0) {
        items.push({
          label: 'Rare unlocks',
          value: String(state.globalUnlocks),
        });
      }
    }

    if (board.length > 0) {
      const top = board[0];
      if (top) {
        items.push({ label: 'Top chain', value: `u/${top.username} · ${top.bestStreak}` });
      }
    }
  } catch {
    // Offline / static preview — show local best if any
  }

  const localBest = Number(localStorage.getItem('unlucky:bestStreak') ?? 0);
  if (localBest > 0 && !items.some((i) => i.label === 'Your best')) {
    items.push({ label: 'Your best', value: String(localBest) });
  }

  setStats(items);
}

const greeting = context.username ? `u/${context.username}` : 'rider';
document.querySelector('.footer')!.textContent = `${greeting} — bad luck is the only win condition.`;

void loadStats();
