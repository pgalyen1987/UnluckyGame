import Phaser from 'phaser';
import { drawBike, drawDetachedWheel, drawLane } from '../art/draw';
import { postProgress, postUnlockCutscene } from '../api';
import {
  BASE_SPIN_SPEED,
  COLORS,
  EASY_MODE,
  MAX_SPIN_SPEED,
  REQUIRED_STREAK,
  SPIN_ACCEL,
  STORAGE_KEYS,
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
  private targetAngle = 0;

  private laneGfx!: Phaser.GameObjects.Graphics;
  private playerGfx!: Phaser.GameObjects.Graphics;
  private wheelGfx!: Phaser.GameObjects.Graphics;
  private backupGfx!: Phaser.GameObjects.Graphics;
  private markerGfx!: Phaser.GameObjects.Graphics;

  private hudStreak!: Phaser.GameObjects.Text;
  private hudHint!: Phaser.GameObjects.Text;
  private hudBackup!: Phaser.GameObjects.Text;
  private flashRect!: Phaser.GameObjects.Rectangle;

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

    this.laneGfx = this.add.graphics();
    this.backupGfx = this.add.graphics().setDepth(2);
    this.playerGfx = this.add.graphics().setDepth(5);
    this.wheelGfx = this.add.graphics().setDepth(6).setVisible(false);
    this.markerGfx = this.add.graphics().setDepth(7).setVisible(false);

    this.flashRect = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0xffffff, 0)
      .setOrigin(0)
      .setDepth(20);

    const uiScale = this.getUiScale();
    this.hudBackup = this.add
      .text(16, 16, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${14 * uiScale}px`,
        color: COLORS.muted,
      })
      .setDepth(10);

    this.hudStreak = this.add
      .text(this.scale.width / 2, 16, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${18 * uiScale}px`,
        color: COLORS.text,
      })
      .setOrigin(0.5, 0)
      .setDepth(10);

    this.hudHint = this.add
      .text(this.scale.width / 2, this.scale.height - 24, 'TAP anywhere', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${14 * uiScale}px`,
        color: COLORS.muted,
      })
      .setOrigin(0.5, 1)
      .setDepth(10);

    if (EASY_MODE) {
      this.add
        .text(this.scale.width - 12, 16, 'EASY', {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#fde047',
          backgroundColor: '#422006',
          padding: { x: 6, y: 2 },
        })
        .setOrigin(1, 0)
        .setDepth(10);
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
      if (this.rideTimer > Phaser.Math.Between(2200, 4200)) {
        this.triggerBackup();
      }
    } else if (this.phase === 'backup') {
      this.scroll += 0.35 * dt;
      this.backupDepth = Math.min(this.backupDepth + 0.04 * dt, 1);
    } else if (this.phase === 'brake') {
      this.brakeTimer += delta;
      this.scroll *= 0.92;
      if (this.brakeTimer > 700) {
        this.enterRepair();
      }
    } else if (this.phase === 'repair') {
      this.wheelAngle = (this.wheelAngle + this.spinSpeed * dt) % 360;
    }

    this.progressSyncTimer += delta;
    if (this.progressSyncTimer > 8000) {
      this.progressSyncTimer = 0;
      void postProgress(this.bestStreak, this.totalTaps);
    }

    this.redraw();
  }

  private onResize(): void {
    const { width, height } = this.scale;
    this.flashRect.setSize(width, height);
    this.hudStreak.setX(width / 2);
    this.hudHint.setPosition(width / 2, height - 24);
    const uiScale = this.getUiScale();
    this.hudStreak.setFontSize(18 * uiScale);
    this.hudBackup.setFontSize(14 * uiScale);
    this.hudHint.setFontSize(14 * uiScale);
  }

  private getUiScale(): number {
    return Phaser.Math.Clamp(this.scale.width / 390, 0.75, 1.25);
  }

  private resetRide(): void {
    this.phase = 'ride';
    this.rideTimer = 0;
    this.brakeTimer = 0;
    this.backupDepth = 0;
    this.streak = 0;
    this.spinSpeed = BASE_SPIN_SPEED;
    this.wheelAngle = Phaser.Math.Between(0, 359);
    this.targetAngle = this.pickTargetAngle();
    this.wheelGfx.setVisible(false);
    this.markerGfx.setVisible(false);
    this.hudHint.setText('TAP anywhere');
    this.updateHud();
  }

  private triggerBackup(): void {
    this.phase = 'backup';
    this.hudHint.setText('Traffic jam…');
    this.time.delayedCall(900, () => {
      if (this.phase !== 'backup') return;
      this.phase = 'brake';
      this.brakeTimer = 0;
      this.hudHint.setText('Hard stop!');
      this.cameras.main.shake(180, 0.004);
    });
  }

  private enterRepair(): void {
    this.phase = 'repair';
    this.streak = 0;
    this.spinSpeed = BASE_SPIN_SPEED;
    this.targetAngle = this.pickTargetAngle();
    this.wheelGfx.setVisible(true);
    this.markerGfx.setVisible(true);
    this.hudHint.setText('TAP when the green notch hits the mark');
    this.cameras.main.flash(120, 40, 40, 40);
  }

  private pickTargetAngle(): number {
    return Phaser.Math.Between(0, 359);
  }

  private onTap(): void {
    this.totalTaps += 1;
    localStorage.setItem(STORAGE_KEYS.totalTaps, String(this.totalTaps));

    if (this.phase === 'ride' || this.phase === 'backup' || this.phase === 'brake') {
      return;
    }

    if (this.phase !== 'repair') return;

    const diff = this.angleDistance(this.wheelAngle, this.targetAngle);
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
    this.targetAngle = this.pickTargetAngle();
    this.flashRect.setAlpha(0.12);
    this.tweens.add({ targets: this.flashRect, alpha: 0, duration: 80 });

    if (this.streak >= REQUIRED_STREAK) {
      this.unlockCutscene();
      return;
    }

    this.updateHud();
  }

  private onMiss(): void {
    if (this.streak > 0) {
      this.cameras.main.shake(100, 0.003);
    }
    this.streak = 0;
    this.spinSpeed = BASE_SPIN_SPEED;
    this.updateHud();
    this.hudHint.setText('Miss. Chain reset.');
    this.time.delayedCall(900, () => {
      if (this.phase === 'repair') {
        this.hudHint.setText('TAP when the green notch hits the mark');
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
      }${this.cutsceneSeen ? '  ·  Fall seen' : ''}`
    );
  }

  private redraw(): void {
    const { width, height } = this.scale;
    drawLane(this.laneGfx, width, height, this.scroll);

    const groundY = height * 0.72;
    const playerX = width * 0.38;

    this.playerGfx.clear();
    this.backupGfx.clear();
    if (this.phase !== 'ride') {
      const chainBonus = Math.floor(this.chainLevel * 1.5);
      const count = Math.floor(this.backupDepth * 8) + 2 + chainBonus;
      const s = this.getUiScale();
      for (let i = 0; i < count; i++) {
        drawBike(
          this.backupGfx,
          playerX + 52 + i * 40 * s,
          groundY,
          s * 0.82,
          'brake',
          false,
          i * 19
        );
      }
    }

    const pose = this.phase === 'brake' || this.phase === 'repair' ? 'brake' : 'ride';
    const detached = this.phase === 'repair';
    drawBike(this.playerGfx, playerX, groundY, this.getUiScale(), detached ? 'repair' : pose, detached);

    if (this.phase === 'repair') {
      const cx = width * 0.5;
      const cy = height * 0.78;
      drawDetachedWheel(this.wheelGfx, cx, cy, this.getUiScale(), this.wheelAngle);

      this.markerGfx.clear();
      const r = 34 * this.getUiScale();
      const markRad = Phaser.Math.DegToRad(this.targetAngle - 90);
      this.markerGfx.lineStyle(4, COLORS.perfect, 0.95);
      this.markerGfx.lineBetween(cx, cy - r - 16, cx, cy - r + 4);
      this.markerGfx.lineStyle(2, COLORS.perfect, 0.35);
      this.markerGfx.strokeCircle(cx, cy, r + 6);
      this.markerGfx.fillStyle(COLORS.perfect, 0.15);
      const half = TIMING_WINDOW_DEG / 2;
      this.markerGfx.slice(
        cx,
        cy,
        r + 10,
        Phaser.Math.DegToRad(this.targetAngle - 90 - half),
        Phaser.Math.DegToRad(this.targetAngle - 90 + half),
        false
      );
      this.markerGfx.fillPath();
    }
  }
}
