import Phaser from 'phaser';

/** Placeholder keys for graphics-driven scenes (no external assets). */
export function registerTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(4, 4, 4);
  g.generateTexture('pixel', 8, 8);
  g.destroy();
}
