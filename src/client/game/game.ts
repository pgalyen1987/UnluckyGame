import Phaser from 'phaser';
import { Boot } from './scenes/Boot';
import { BikeLane } from './scenes/BikeLane';
import { Cutscene } from './scenes/Cutscene';
import { fetchGameState } from './api';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#8fa3b8',
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

const preventScroll = (): void => {
  const block = (e: Event) => {
    e.preventDefault();
  };
  document.addEventListener('touchmove', block, { passive: false, capture: true });
  document.addEventListener('wheel', block, { passive: false, capture: true });
};

const start = async (): Promise<void> => {
  preventScroll();
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

document.addEventListener('DOMContentLoaded', () => {
  void start();
});
