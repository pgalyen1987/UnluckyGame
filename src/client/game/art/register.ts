import Phaser from 'phaser';
import { bikeSprites } from './bike';
import { envSprites } from './env';
import type { SpriteDef } from './pixel';
import { wheelSprites } from './wheel';

export function registerArt(scene: Phaser.Scene): void {
  const defs: SpriteDef[] = [...envSprites(), ...bikeSprites(), ...wheelSprites()];

  for (const def of defs) {
    def.frames.forEach((buf, i) => {
      const key = def.frames.length > 1 ? `${def.key}-${i}` : def.key;
      if (scene.textures.exists(key)) scene.textures.remove(key);
      const tex = scene.textures.createCanvas(key, buf.w, buf.h);
      if (!tex) return;
      const imageData = new ImageData(new Uint8ClampedArray(buf.data), buf.w, buf.h);
      tex.context.putImageData(imageData, 0, 0);
      tex.refresh();
      tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    });
  }
}
