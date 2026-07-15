import Phaser from 'phaser';
import { registerArt } from './register';

/** Procedural pixel-art textures — no external sprite downloads. */
export function registerTextures(scene: Phaser.Scene): void {
  registerArt(scene);
}
