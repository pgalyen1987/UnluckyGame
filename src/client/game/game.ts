import './three/three.css';

const preventScroll = (): void => {
  const block = (e: Event) => {
    e.preventDefault();
  };
  document.addEventListener('touchmove', block, { passive: false, capture: true });
  document.addEventListener('wheel', block, { passive: false, capture: true });
};

document.addEventListener('DOMContentLoaded', () => {
  preventScroll();
  void import('./three/UnluckyThree').then(({ UnluckyThree }) => {
    const container = document.getElementById('game-container');
    if (container) new UnluckyThree(container);
  });
});
