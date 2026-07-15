import Phaser from 'phaser';
import { postProgress, postUnlockCutscene } from '../api';
import {
  BASE_SPIN_SPEED,
  COLORS,
  EASY_MODE,
  MAX_SPIN_SPEED,
  REQUIRED_STREAK,
  SPIN_ACCEL,
  STORAGE_KEYS,
  TARGET_ANGLE,
  TIMING_WINDOW_DEG,
} from '../config';

type Phase = 'ride' | 'backup' | 'brake' | 'repair';

export class BikeLane extends Phaser.Scene {
  private phase: Phase = 'ride';
  private scroll = 0;
  private backupDepth = 0;
  private rideTimer = 0;
  private brakeTimer = 0;

  private streak = 0;
  private totalTaps = 0;
  private wheelAngle = 0;
  private spinSpeed = BASE_SPIN_SPEED;

  private sky!: Phaser.GameObjects.TileSprite;
  private farBuildings!: Phaser.GameObjects.TileSprite;
  private nearBuildings!: Phaser.GameObjects.TileSprite;
  private laneSurface!: Phaser.GameObjects.TileSprite;
  private laneDash!: Phaser.GameObjects.TileSprite;
  private curbTop!: Phaser.GameObjects.Rectangle;
  private curbBottom!: Phaser.GameObjects.Rectangle;

  private playerBike!: Phaser.GameObjects.Image;
  private backupBikes: Phaser.GameObjects.Image[] = [];
  private wheelSprite!: Phaser.GameObjects.Image;
  private timingRing!: Phaser.GameObjects.Image;
  private timingArc!: Phaser.GameObjects.Graphics;
  private vignette!: Phaser.GameObjects.Graphics;

  private hitParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private missParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private dustParticles!: Phaser.GameObjects.Particles.ParticleEmitter;

  private hudStreak!: Phaser.GameObjects.Text;
  private hudHint!: Phaser.GameObjects.Text;
  private hudBackup!: Phaser.GameObjects.Text;
  private flashRect!: Phaser.GameObjects.Rectangle;
  private chainBar!: Phaser.GameObjects.Graphics;

  private bestStreak = 0;
  private cutsceneSeen = false;
  private chainLevel = 0;
  private progressSyncTimer = 0;

  constructor() {
    super('BikeLane');
  }

  create(): void {
    this.bestStreak = Math.max(
      Number(localStorage.getItem(STORAGE_KEYS.bestStreak) ?? 0),
      Number(this.registry.get('serverBestStreak') ?? 0)
    );
    this.cutsceneSeen =
      localStorage.getItem(STORAGE_KEYS.cutsceneSeen) === '1' ||
      Boolean(this.registry.get('serverCutsceneSeen'));
    this.totalTaps = Number(localStorage.getItem(STORAGE_KEYS.totalTaps) ?? 0);
    this.chainLevel = Number(this.registry.get('chainLevel') ?? 0);

    const { width, height } = this.scale;
    const laneTop = height * 0.42;

    this.sky = this.add
      .tileSprite(0, 0, width, laneTop, 'sky-gradient')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(0);

    this.farBuildings = this.add
      .tileSprite(0, laneTop * 0.18, width, 72, 'building-far')
      .setOrigin(0)
      .setDepth(1);

    this.nearBuildings = this.add
      .tileSprite(0, laneTop * 0.28, width, 88, 'building-near')
      .setOrigin(0)
      .setDepth(2);

    this.laneSurface = this.add
      .tileSprite(0, laneTop, width, height - laneTop, 'lane-tile')
      .setOrigin(0)
      .setTileScale(2)
      .setDepth(3);

    this.laneDash = this.add
      .tileSprite(0, laneTop + (height - laneTop) * 0.55, width, 6, 'lane-dash')
      .setOrigin(0)
      .setDepth(4);

    this.curbTop = this.add
      .rectangle(0, laneTop, width, 6, COLORS.curb, 1)
      .setOrigin(0)
      .setDepth(5);
    this.curbBottom = this.add
      .rectangle(0, height - 8, width, 8, COLORS.curbDark, 1)
      .setOrigin(0)
      .setDepth(5);

    this.backupBikes = [];
    for (let i = 0; i < 14; i++) {
      const bike = this.add
        .image(0, 0, 'bike-brake')
        .setDepth(6)
        .setVisible(false);
      this.backupBikes.push(bike);
    }

    this.playerBike = this.add.image(0, 0, 'bike-ride').setDepth(8);

    this.wheelSprite = this.add
      .image(width * 0.5, height * 0.78, 'wheel-repair')
      .setDepth(9)
      .setVisible(false);

    this.timingRing = this.add
      .image(width * 0.5, height * 0.78, 'timing-ring')
      .setDepth(9)
      .setVisible(false)
      .setAlpha(0.85);

    this.timingArc = this.add.graphics().setDepth(10).setVisible(false);

    this.vignette = this.add.graphics().setDepth(18).setScrollFactor(0);
    this.drawVignette();

    this.flashRect = this.add
      .rectangle(0, 0, width, height, 0xffffff, 0)
      .setOrigin(0)
      .setDepth(20)
      .setScrollFactor(0);

    this.hitParticles = this.add.particles(0, 0, 'spark', {
      lifespan: 420,
      speed: { min: 50, max: 160 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 1, end: 0 },
      angle: { min: 0, max: 360 },
      gravityY: 80,
      emitting: false,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.hitParticles.setDepth(11);

    this.missParticles = this.add.particles(0, 0, 'miss-puff', {
      lifespan: 500,
      speed: { min: 10, max: 40 },
      scale: { start: 1.4, end: 2.2 },
      alpha: { start: 0.7, end: 0 },
      emitting: false,
    });
    this.missParticles.setDepth(11);

    this.dustParticles = this.add.particles(0, 0, 'dust', {
      lifespan: 350,
      speed: { min: 8, max: 24 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.35, end: 0 },
      frequency: 120,
      quantity: 1,
      emitting: false,
    });
    this.dustParticles.setDepth(7);

    const uiScale = this.getUiScale();
    const hudStyle = {
      fontFamily: '"Segoe UI", system-ui, sans-serif',
      color: COLORS.text,
      stroke: COLORS.ink,
      strokeThickness: 4 * uiScale,
      shadow: {
        offsetX: 0,
        offsetY: 2,
        color: COLORS.ink,
        blur: 4,
        fill: true,
      },
    };

    this.hudBackup = this.add
      .text(16, 16, '', { ...hudStyle, fontSize: `${13 * uiScale}px`, color: COLORS.muted })
      .setDepth(15)
      .setScrollFactor(0);

    this.hudStreak = this.add
      .text(width / 2, 14, '', { ...hudStyle, fontSize: `${17 * uiScale}px` })
      .setOrigin(0.5, 0)
      .setDepth(15)
      .setScrollFactor(0);

    this.chainBar = this.add.graphics().setDepth(14).setScrollFactor(0);

    this.hudHint = this.add
      .text(width / 2, height - 28, 'TAP anywhere', {
        ...hudStyle,
        fontSize: `${14 * uiScale}px`,
        color: COLORS.muted,
      })
      .setOrigin(0.5, 1)
      .setDepth(15)
      .setScrollFactor(0);

    if (EASY_MODE) {
      this.add
        .text(width - 12, 16, 'EASY', {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#fde047',
          backgroundColor: '#422006',
          padding: { x: 6, y: 2 },
        })
        .setOrigin(1, 0)
        .setDepth(15)
        .setScrollFactor(0);
    }

    this.input.on('pointerdown', () => this.onTap());
    this.scale.on('resize', () => this.onResize());
    this.onResize();
    this.resetRide();
    this.updateHud();
  }

  update(_time: number, delta: number): void {
    const dt = delta / 16.67;

    if (this.phase === 'ride') {
      this.rideTimer += delta;
      this.scroll += 2.8 * dt;
      this.dustParticles.emitting = true;
      if (this.rideTimer > Phaser.Math.Between(2200, 4200)) {
        this.triggerBackup();
      }
    } else if (this.phase === 'backup') {
      this.scroll += 0.35 * dt;
      this.backupDepth = Math.min(this.backupDepth + 0.04 * dt, 1);
      this.dustParticles.emitting = false;
    } else if (this.phase === 'brake') {
      this.brakeTimer += delta;
      this.scroll *= 0.92;
      this.dustParticles.emitting = false;
      if (this.brakeTimer > 700) {
        this.enterRepair();
      }
    } else if (this.phase === 'repair') {
      this.wheelAngle = (this.wheelAngle + this.spinSpeed * dt) % 360;
      this.wheelSprite.setAngle(this.wheelAngle);
      this.dustParticles.emitting = false;
    } else {
      this.dustParticles.emitting = false;
    }

    this.farBuildings.tilePositionX = this.scroll * 0.35;
    this.nearBuildings.tilePositionX = this.scroll * 0.75;
    this.laneSurface.tilePositionY = this.scroll * 0.15;
    this.laneDash.tilePositionX = this.scroll * 1.4;

    this.progressSyncTimer += delta;
    if (this.progressSyncTimer > 8000) {
      this.progressSyncTimer = 0;
      void postProgress(this.bestStreak, this.totalTaps);
    }

    this.layoutScene();
  }

  private drawVignette(): void {
    const { width, height } = this.scale;
    this.vignette.clear();
    this.vignette.fillStyle(0x000000, 0.22);
    this.vignette.fillRect(0, 0, width, 18);
    this.vignette.fillRect(0, height - 28, width, 28);
    this.vignette.fillRect(0, 0, 14, height);
    this.vignette.fillRect(width - 14, 0, 14, height);
  }

  private onResize(): void {
    const { width, height } = this.scale;
    const laneTop = height * 0.42;

    this.sky.setSize(width, laneTop);
    this.farBuildings.setPosition(0, laneTop * 0.18).setSize(width, 72);
    this.nearBuildings.setPosition(0, laneTop * 0.28).setSize(width, 88);
    this.laneSurface.setPosition(0, laneTop).setSize(width, height - laneTop);
    this.laneDash.setPosition(0, laneTop + (height - laneTop) * 0.55).setSize(width, 6);
    this.curbTop.setPosition(0, laneTop).setSize(width, 6);
    this.curbBottom.setPosition(0, height - 8).setSize(width, 8);

    this.flashRect.setSize(width, height);
    this.hudStreak.setX(width / 2);
    this.hudHint.setPosition(width / 2, height - 28);
    const uiScale = this.getUiScale();
    this.hudStreak.setFontSize(17 * uiScale);
    this.hudBackup.setFontSize(13 * uiScale);
    this.hudHint.setFontSize(14 * uiScale);
    this.drawVignette();
    this.layoutScene();
  }

  private getUiScale(): number {
    return Phaser.Math.Clamp(this.scale.width / 390, 0.75, 1.25);
  }

  private layoutScene(): void {
    const { width, height } = this.scale;
    const s = this.getUiScale();
    const groundY = height * 0.72;
    const playerX = width * 0.38;

    this.playerBike
      .setPosition(playerX, groundY)
      .setScale(s)
      .setTexture(
        this.phase === 'repair' ? 'bike-repair' : this.phase === 'brake' ? 'bike-brake' : 'bike-ride'
      );

    if (this.phase === 'ride') {
      this.playerBike.setAngle(Math.sin(this.scroll * 0.08) * 1.2);
    } else if (this.phase === 'brake') {
      this.playerBike.setAngle(-2);
    } else {
      this.playerBike.setAngle(0);
    }

    this.dustParticles.setPosition(playerX - 20 * s, groundY + 8 * s);

    if (this.phase !== 'ride') {
      const chainBonus = Math.floor(this.chainLevel * 1.5);
      const count = Math.floor(this.backupDepth * 8) + 2 + chainBonus;
      for (let i = 0; i < this.backupBikes.length; i++) {
        const bike = this.backupBikes[i]!;
        if (i >= count) {
          bike.setVisible(false);
          continue;
        }
        bike
          .setVisible(true)
          .setTexture('bike-brake')
          .setPosition(playerX + (52 + i * 40) * s, groundY + (i % 2) * 2)
          .setScale(s * 0.82)
          .setAlpha(0.92 - i * 0.03);
      }
    } else {
      this.backupBikes.forEach((b) => b.setVisible(false));
    }

    const wx = width * 0.5;
    const wy = height * 0.78;
    this.wheelSprite.setPosition(wx, wy).setScale(s * 1.05);
    this.timingRing.setPosition(wx, wy).setScale(s * 1.05);

    if (this.phase === 'repair') {
      this.drawTimingArc(wx, wy, 34 * s);
    }
  }

  private drawTimingArc(cx: number, cy: number, r: number): void {
    this.timingArc.clear();
    const half = TIMING_WINDOW_DEG / 2;
    this.timingArc.fillStyle(COLORS.perfect, 0.22);
    this.timingArc.slice(
      cx,
      cy,
      r + 14,
      Phaser.Math.DegToRad(-90 - half),
      Phaser.Math.DegToRad(-90 + half),
      false
    );
    this.timingArc.fillPath();
  }

  private resetRide(): void {
    this.phase = 'ride';
    this.rideTimer = 0;
    this.brakeTimer = 0;
    this.backupDepth = 0;
    this.streak = 0;
    this.spinSpeed = BASE_SPIN_SPEED;
    this.wheelAngle = Phaser.Math.Between(40, 320);
    this.wheelSprite.setVisible(false);
    this.timingRing.setVisible(false);
    this.timingArc.setVisible(false);
    this.hudHint.setText('TAP anywhere');
    this.updateHud();
  }

  private triggerBackup(): void {
    this.phase = 'backup';
    this.hudHint.setText('Traffic jam…');
    this.cameras.main.shake(80, 0.002);
    this.time.delayedCall(900, () => {
      if (this.phase !== 'backup') return;
      this.phase = 'brake';
      this.brakeTimer = 0;
      this.hudHint.setText('Hard stop!');
      this.cameras.main.shake(220, 0.005);
      this.tweens.add({
        targets: this.cameras.main,
        zoom: 1.02,
        duration: 180,
        yoyo: true,
      });
    });
  }

  private enterRepair(): void {
    this.phase = 'repair';
    this.streak = 0;
    this.spinSpeed = BASE_SPIN_SPEED;
    this.wheelAngle = Phaser.Math.Between(60, 300);
    this.wheelSprite.setVisible(true).setAngle(this.wheelAngle);
    this.timingRing.setVisible(true);
    this.timingArc.setVisible(true);
    this.hudHint.setText('TAP when the green line hits the top mark');
    this.cameras.main.flash(140, 30, 40, 50);
  }

  private onTap(): void {
    this.totalTaps += 1;
    localStorage.setItem(STORAGE_KEYS.totalTaps, String(this.totalTaps));

    if (this.phase === 'ride' || this.phase === 'backup' || this.phase === 'brake') {
      return;
    }

    if (this.phase !== 'repair') return;

    const diff = this.angleDistance(this.wheelAngle, TARGET_ANGLE);
    if (diff <= TIMING_WINDOW_DEG / 2) {
      this.onPerfectTap();
    } else {
      this.onMiss();
    }
  }

  private angleDistance(a: number, b: number): number {
    let d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  }

  private onPerfectTap(): void {
    this.streak += 1;
    if (this.streak > this.bestStreak) {
      this.bestStreak = this.streak;
      localStorage.setItem(STORAGE_KEYS.bestStreak, String(this.bestStreak));
      void postProgress(this.bestStreak, this.totalTaps);
    }

    this.spinSpeed = Math.min(MAX_SPIN_SPEED, this.spinSpeed + SPIN_ACCEL);
    this.flashRect.setFillStyle(COLORS.perfect, 0.22);
    this.flashRect.setAlpha(1);
    this.tweens.add({ targets: this.flashRect, alpha: 0, duration: 120 });
    this.hitParticles.explode(14, this.wheelSprite.x, this.wheelSprite.y);
    this.tweens.add({
      targets: this.timingRing,
      scale: this.getUiScale() * 1.15,
      duration: 80,
      yoyo: true,
    });
    this.hudHint.setText('Hit!');
    this.time.delayedCall(350, () => {
      if (this.phase === 'repair') {
        this.hudHint.setText('TAP when the green line hits the top mark');
      }
    });

    if (this.streak >= REQUIRED_STREAK) {
      this.unlockCutscene();
      return;
    }

    this.updateHud();
  }

  private onMiss(): void {
    if (this.streak > 0) {
      this.cameras.main.shake(120, 0.004);
    }
    this.streak = 0;
    this.spinSpeed = BASE_SPIN_SPEED;
    this.missParticles.explode(6, this.wheelSprite.x, this.wheelSprite.y);
    this.flashRect.setFillStyle(COLORS.miss, 0.12);
    this.flashRect.setAlpha(1);
    this.tweens.add({ targets: this.flashRect, alpha: 0, duration: 160 });
    this.updateHud();
    this.hudHint.setText('Miss. Chain reset.');
    this.time.delayedCall(900, () => {
      if (this.phase === 'repair') {
        this.hudHint.setText('TAP when the green line hits the top mark');
      }
    });
  }

  private unlockCutscene(): void {
    this.phase = 'ride';
    localStorage.setItem(STORAGE_KEYS.cutsceneSeen, '1');
    this.cutsceneSeen = true;
    void postUnlockCutscene(this.streak, this.totalTaps);
    this.scene.start('Cutscene', {
      streak: this.streak,
      totalTaps: this.totalTaps,
    });
  }

  private updateHud(): void {
    const pct = ((this.streak / REQUIRED_STREAK) * 100).toFixed(3);
    this.hudStreak.setText(`Chain: ${this.streak} / ${REQUIRED_STREAK}  (${pct}%)`);
    this.hudBackup.setText(
      `Backup: ${Math.floor(this.backupDepth * 120 + this.totalTaps * 0.01)}m  ·  Best: ${this.bestStreak}${
        this.chainLevel > 0 ? `  ·  Chain lvl ${this.chainLevel}` : ''
      }${this.cutsceneSeen ? '  ·  ???' : ''}`
    );

    const { width } = this.scale;
    const uiScale = this.getUiScale();
    const barW = Math.min(width - 48, 280 * uiScale);
    const barX = (width - barW) / 2;
    const barY = 40 * uiScale;
    const fill = barW * (this.streak / REQUIRED_STREAK);
    this.chainBar.clear();
    this.chainBar.fillStyle(COLORS.ink, 0.55);
    this.chainBar.fillRoundedRect(barX, barY, barW, 8, 4);
    this.chainBar.fillStyle(COLORS.perfect, 0.95);
    this.chainBar.fillRoundedRect(barX, barY, Math.max(4, fill), 8, 4);
    if (this.streak > 0) {
      this.chainBar.fillStyle(COLORS.perfectHi, 0.6);
      this.chainBar.fillRoundedRect(barX, barY, Math.max(4, fill), 3, 2);
    }
  }
}
