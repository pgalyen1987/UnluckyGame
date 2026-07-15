import { UnluckyThree } from './UnluckyThree';

function boot(): void {
  const container = document.getElementById('game-container');
  if (container) new UnluckyThree(container);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
