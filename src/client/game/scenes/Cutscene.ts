import Phaser from 'phaser';
import { COLORS } from '../config';

/**
 * Rare unlock sequence — keep on-screen copy vague until the title card.
 */
export class Cutscene extends Phaser.Scene {
  private streak = 0;
  private totalTaps = 0;

  constructor() {
    super('Cutscene');
  }

  init(data: { streak?: number; totalTaps?: number }): void {
    this.streak = data.streak ?? 0;
    this.totalTaps = data.totalTaps ?? 0;
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width * 0.5;
    const groundY = height * 0.74;
    const scale = Phaser.Math.Clamp(width / 390, 0.75, 1.25);
    const laneTop = height * 0.42;

    this.add
      .tileSprite(0, 0, width, laneTop, 'sky-gradient')
      .setOrigin(0)
      .setScrollFactor(0);

    this.add
      .tileSprite(0, laneTop * 0.22, width, 88, 'building-near')
      .setOrigin(0)
      .setAlpha(0.85);

    this.add
      .tileSprite(0, laneTop, width, height - laneTop, 'lane-tile')
      .setOrigin(0)
      .setTileScale(2);

    this.add.rectangle(0, laneTop, width, 6, COLORS.curb, 1).setOrigin(0);

    const bikeContainer = this.add.container(cx, groundY);
    const bike = this.add.image(0, 0, 'bike-victory').setScale(scale);
    bikeContainer.add(bike);

    const glow = this.add
      .graphics()
      .fillStyle(COLORS.perfect, 0.08)
      .fillCircle(cx, groundY - 20 * scale, 80 * scale);
    glow.setDepth(-1);

    const subtitle = this.add
      .text(cx, height * 0.12, 'Wheel locked.', {
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        fontSize: `${20 * scale}px`,
        color: COLORS.text,
        stroke: COLORS.ink,
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const title = this.add
      .text(cx, height * 0.5, 'UNLUCKY', {
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        fontSize: `${52 * scale}px`,
        color: COLORS.text,
        fontStyle: 'bold',
        stroke: COLORS.ink,
        strokeThickness: 8,
        shadow: { offsetX: 0, offsetY: 4, color: '#000000', blur: 8, fill: true },
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(30);

    const footer = this.add
      .text(cx, height - 28, `Chain ${this.streak} · ${this.totalTaps.toLocaleString()} lifetime taps`, {
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        fontSize: `${12 * scale}px`,
        color: COLORS.muted,
        stroke: COLORS.ink,
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setAlpha(0);

    this.tweens.add({
      targets: subtitle,
      alpha: 1,
      duration: 600,
      ease: 'Sine.easeOut',
    });

    this.time.delayedCall(1400, () => {
      subtitle.setText('…');
      this.tweens.add({
        targets: bikeContainer,
        angle: -28,
        y: groundY + 6 * scale,
        duration: 2200,
        ease: 'Sine.easeInOut',
      });
    });

    this.time.delayedCall(3800, () => {
      subtitle.setText('');
      this.tweens.add({
        targets: bikeContainer,
        angle: -92,
        y: groundY + 38 * scale,
        x: cx - 20 * scale,
        duration: 900,
        ease: 'Quad.easeIn',
        onComplete: () => {
          this.cameras.main.shake(220, 0.007);
          title.setAlpha(1);
          footer.setAlpha(1);
          this.tweens.add({
            targets: title,
            scale: 1.05,
            duration: 200,
            yoyo: true,
          });
        },
      });
    });

    this.time.delayedCall(5200, () => {
      this.tweens.add({
        targets: title,
        alpha: 0.88,
        y: height * 0.48,
        duration: 400,
      });
    });

    this.input.once('pointerdown', () => {
      this.scene.start('BikeLane');
    });

    this.time.delayedCall(8000, () => {
      this.add
        .text(cx, height - 56, 'tap to ride again', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: `${13 * scale}px`,
          color: COLORS.muted,
        })
        .setOrigin(0.5)
        .setAlpha(0.7);
    });
  }
}
