import { THREE_MODE } from './config';

const preventScroll = (): void => {
  const block = (e: Event) => {
    e.preventDefault();
  };
  document.addEventListener('touchmove', block, { passive: false, capture: true });
  document.addEventListener('wheel', block, { passive: false, capture: true });
};

const startPhaser = async (): Promise<void> => {
  const Phaser = (await import('phaser')).default;
  const { Boot } = await import('./scenes/Boot');
  const { BikeLane } = await import('./scenes/BikeLane');
  const { Cutscene } = await import('./scenes/Cutscene');
  const { fetchGameState } = await import('./api');

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#9ecae8',
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 390,
      height: 844,
      min: { width: 280, height: 400 },
    },
    input: {
      activePointers: 1,
      touch: { capture: true },
    },
    disableContextMenu: true,
    scene: [Boot, BikeLane, Cutscene],
  };

  const game = new Phaser.Game(config);
  const state = await fetchGameState();
  if (state) {
    game.registry.set('username', state.username);
    game.registry.set('chainLevel', state.chainLevel);
    game.registry.set('globalUnlocks', state.globalUnlocks);
    game.registry.set('serverBestStreak', state.bestStreak);
    game.registry.set('serverCutsceneSeen', state.cutsceneSeen);
  }
};

const startThree = async (): Promise<void> => {
  const { UnluckyThree } = await import('./three/UnluckyThree');
  const container = document.getElementById('game-container');
  if (container) new UnluckyThree(container);
};

document.addEventListener('DOMContentLoaded', () => {
  preventScroll();
  if (THREE_MODE) {
    void startThree();
  } else {
    void startPhaser();
  }
});
