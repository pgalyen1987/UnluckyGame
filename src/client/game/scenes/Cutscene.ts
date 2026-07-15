import Phaser from 'phaser';
import { COLORS } from '../config';

/**
 * The "unlucky" ending: you fixed the wheel, stood on one pedal, and fell anyway.
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

    this.cameras.main.setBackgroundColor(COLORS.sky);

    const lane = this.add.graphics();
    lane.fillStyle(COLORS.lane, 1);
    lane.fillRect(0, height * 0.42, width, height * 0.58);
    lane.fillStyle(COLORS.curb, 1);
    lane.fillRect(0, height * 0.42, width, 8);

    const bikeContainer = this.add.container(cx, groundY);
    const bike = this.add.graphics();
    const rider = this.add.graphics();
    bikeContainer.add([bike, rider]);

    this.drawVictoryBike(bike, rider, scale, 0);

    const subtitle = this.add
      .text(cx, height * 0.12, 'Wheel locked.', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${20 * scale}px`,
        color: COLORS.text,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const title = this.add
      .text(cx, height * 0.5, 'UNLUCKY', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${48 * scale}px`,
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(30);

    const footer = this.add
      .text(cx, height - 28, `Chain ${this.streak} · ${this.totalTaps.toLocaleString()} lifetime taps`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${12 * scale}px`,
        color: COLORS.muted,
      })
      .setOrigin(0.5, 1)
      .setAlpha(0);

    // Beat 1 — brief victory pause
    this.tweens.add({
      targets: subtitle,
      alpha: 1,
      duration: 600,
      ease: 'Sine.easeOut',
    });

    // Beat 2 — stand on one pedal (bike tilts)
    this.time.delayedCall(1400, () => {
      subtitle.setText('One foot. One pedal.');
      this.tweens.add({
        targets: bikeContainer,
        angle: -28,
        y: groundY + 6 * scale,
        duration: 2200,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          this.drawVictoryBike(bike, rider, scale, bikeContainer.angle);
        },
      });
    });

    // Beat 3 — fall sideways
    this.time.delayedCall(3800, () => {
      subtitle.setText('Even winning, you fall.');
      this.tweens.add({
        targets: bikeContainer,
        angle: -92,
        y: groundY + 38 * scale,
        x: cx - 20 * scale,
        duration: 900,
        ease: 'Quad.easeIn',
        onUpdate: () => {
          this.drawVictoryBike(bike, rider, scale, bikeContainer.angle);
        },
        onComplete: () => {
          this.cameras.main.shake(200, 0.006);
          title.setAlpha(1);
          footer.setAlpha(1);
        },
      });
    });

    this.time.delayedCall(5200, () => {
      this.tweens.add({
        targets: title,
        alpha: 0.85,
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

  private drawVictoryBike(g: Phaser.GameObjects.Graphics, rider: Phaser.GameObjects.Graphics, s: number, _tilt: number): void {
    g.clear();
    rider.clear();

    const frame = COLORS.bikeFrame;
    const wheel = COLORS.wheel;
    const rim = COLORS.rim;

    // Both wheels on — victory state
    this.strokeWheel(g, -34 * s, 10 * s, 14 * s, wheel, rim);
    this.strokeWheel(g, 34 * s, 10 * s, 14 * s, wheel, rim);

    g.lineStyle(3 * s, frame, 1);
    g.beginPath();
    g.moveTo(-34 * s, 10 * s);
    g.lineTo(-8 * s, -18 * s);
    g.lineTo(18 * s, -8 * s);
    g.lineTo(34 * s, 10 * s);
    g.strokePath();

    g.fillStyle(frame, 1);
    g.fillRoundedRect(-18 * s, -28 * s, 14 * s, 4 * s, 2 * s);

    // Rider standing on ONE pedal only (the gag)
    rider.fillStyle(COLORS.jacket, 1);
    rider.fillRoundedRect(-4 * s, -38 * s, 18 * s, 22 * s, 3 * s);
    rider.fillStyle(COLORS.skin, 1);
    rider.fillCircle(6 * s, -46 * s, 7 * s);
    rider.fillStyle(COLORS.helmet, 1);
    rider.fillCircle(6 * s, -48 * s, 8 * s);

    // Left foot on back pedal, right foot dangling
    rider.fillStyle(COLORS.skin, 1);
    rider.fillRoundedRect(-16 * s, -2 * s, 10 * s, 4 * s, 2 * s);
    rider.lineStyle(3 * s, COLORS.skin, 1);
    rider.lineBetween(8 * s, -16 * s, 14 * s, 6 * s);
    rider.fillCircle(14 * s, 8 * s, 4 * s);
  }

  private strokeWheel(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    r: number,
    fill: number,
    rim: number
  ): void {
    g.fillStyle(fill, 1);
    g.fillCircle(x, y, r);
    g.lineStyle(2, rim, 1);
    g.strokeCircle(x, y, r);
  }
}
