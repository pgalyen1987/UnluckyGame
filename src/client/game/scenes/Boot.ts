import Phaser from 'phaser';
import { registerTextures } from '../art/textures';

export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    registerTextures(this);
    this.scene.start('BikeLane');
  }
}
