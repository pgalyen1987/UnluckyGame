import * as THREE from 'three';
import { postProgress, postUnlockCutscene, fetchGameState } from '../api';
import {
  BASE_SPIN_SPEED,
  MAX_SPIN_SPEED,
  REQUIRED_STREAK,
  SPIN_ACCEL,
  STORAGE_KEYS,
  TARGET_ANGLE,
  TIMING_WINDOW_DEG,
} from '../config';
import { createBike, createRepairWheel } from './bike';
import { runCutscene } from './cutscene';
import { createHud, flashHud, updateHud, type HudRefs } from './hud';
import { createBurst } from './particles';
import { createSky } from './sky';
import { createTimingTarget } from './timingTarget';
import { createWorld, scrollWorld } from './world';

type Phase = 'ride' | 'backup' | 'brake' | 'repair' | 'cutscene';

const RIDE_CAM = new THREE.Vector3(9, 3.4, 11);
const RIDE_LOOK = new THREE.Vector3(-1.5, 1.3, 0);
const REPAIR_CAM = new THREE.Vector3(0, 1.05, 5.2);
const REPAIR_LOOK = new THREE.Vector3(0, 0.85, 0);

export class UnluckyThree {
  private readonly container: HTMLElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.OrthographicCamera;
  private readonly clock = new THREE.Clock();

  private hud!: HudRefs;
  private world!: ReturnType<typeof createWorld>;
  private bike!: ReturnType<typeof createBike>;
  private backupBikes: THREE.Group[] = [];
  private repairStage!: THREE.Group;
  private repairWheel!: THREE.Group;
  private timingTarget!: THREE.Group;
  private groundShadow!: THREE.Mesh;

  private phase: Phase = 'ride';
  private scroll = 0;
  private backupDepth = 0;
  private rideTimer = 0;
  private brakeTimer = 0;
  private streak = 0;
  private best = 0;
  private totalTaps = 0;
  private wheelAngle = 0;
  private spinSpeed = BASE_SPIN_SPEED;
  private cutsceneSeen = false;
  private chainLevel = 0;
  private progressSyncTimer = 0;
  private camPos = RIDE_CAM.clone();
  private camLook = RIDE_LOOK.clone();
  private shake = 0;
  private resizeObserver?: ResizeObserver;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x9ecae8, 0.028);

    const aspect = container.clientWidth / Math.max(container.clientHeight, 1);
    const frustum = 6.4;
    this.camera = new THREE.OrthographicCamera(
      (-frustum * aspect) / 2,
      (frustum * aspect) / 2,
      frustum / 2,
      -frustum / 2,
      0.1,
      120
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.inset = '0';
    this.renderer.domElement.style.zIndex = '0';
    container.appendChild(this.renderer.domElement);

    this.hud = createHud(container);
    this.loadLocalProgress();
    void this.loadServerState();

    this.setupLights();
    this.setupScene();
    this.bindInput();
    this.onResize();
    this.resetRide();
    this.animate();
  }

  private loadLocalProgress(): void {
    this.best = Number(localStorage.getItem(STORAGE_KEYS.bestStreak) ?? 0);
    this.totalTaps = Number(localStorage.getItem(STORAGE_KEYS.totalTaps) ?? 0);
    this.cutsceneSeen = localStorage.getItem(STORAGE_KEYS.cutsceneSeen) === '1';
  }

  private async loadServerState(): Promise<void> {
    const state = await fetchGameState();
    if (!state) return;
    this.chainLevel = state.chainLevel;
    this.best = Math.max(this.best, state.bestStreak);
    if (state.cutsceneSeen) this.cutsceneSeen = true;
    this.updateHud();
  }

  private setupLights(): void {
    this.scene.add(new THREE.HemisphereLight(0xb8dcff, 0x3a404c, 0.65));
    const sun = new THREE.DirectionalLight(0xfff0c8, 1.35);
    sun.position.set(8, 14, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 40;
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -2;
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight(0x7eb8e8, 0.45);
    rim.position.set(-6, 3, -4);
    this.scene.add(rim);
  }

  private setupScene(): void {
    this.scene.add(createSky());
    this.world = createWorld();
    this.scene.add(this.world.root);

    this.bike = createBike(false);
    this.bike.root.position.set(-2.2, 0, 0);
    this.scene.add(this.bike.root);

    for (let i = 0; i < 10; i++) {
      const b = createBike(false).root;
      b.visible = false;
      b.scale.setScalar(0.82);
      this.backupBikes.push(b);
      this.scene.add(b);
    }

    this.repairStage = new THREE.Group();
    this.repairStage.visible = false;
    this.repairStage.position.set(0, 0.15, 1.2);

    this.repairWheel = createRepairWheel();
    this.timingTarget = createTimingTarget();
    this.repairStage.add(this.repairWheel, this.timingTarget);
    this.scene.add(this.repairStage);

    this.groundShadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.15, 32),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 })
    );
    this.groundShadow.rotation.x = -Math.PI / 2;
    this.groundShadow.position.set(-2.2, 0.02, 0);
    this.scene.add(this.groundShadow);
  }

  private bindInput(): void {
    this.renderer.domElement.addEventListener('pointerdown', () => this.onTap());
    window.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false, capture: true });
    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(this.container);
  }

  private onResize(): void {
    const w = this.container.clientWidth;
    const h = Math.max(this.container.clientHeight, 1);
    const aspect = w / h;
    const frustum = this.phase === 'repair' ? 4.2 : 6.4;
    this.camera.left = (-frustum * aspect) / 2;
    this.camera.right = (frustum * aspect) / 2;
    this.camera.top = frustum / 2;
    this.camera.bottom = -frustum / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private resetRide(): void {
    this.phase = 'ride';
    this.rideTimer = 0;
    this.brakeTimer = 0;
    this.backupDepth = 0;
    this.streak = 0;
    this.spinSpeed = BASE_SPIN_SPEED;
    this.repairStage.visible = false;
    this.bike.root.visible = true;
    this.bike.rearWheel.visible = true;
    this.camPos.copy(RIDE_CAM);
    this.camLook.copy(RIDE_LOOK);
    this.onResize();
    this.updateHud();
    this.layoutBackup();
  }

  private triggerBackup(): void {
    this.phase = 'backup';
    this.shake = 0.08;
    this.updateHud('Traffic jam…');
    window.setTimeout(() => {
      if (this.phase !== 'backup') return;
      this.phase = 'brake';
      this.brakeTimer = 0;
      this.bike.frame.rotation.z = -0.1;
      this.shake = 0.16;
      this.updateHud('Hard stop!');
    }, 900);
  }

  private enterRepair(): void {
    this.phase = 'repair';
    this.streak = 0;
    this.spinSpeed = BASE_SPIN_SPEED;
    this.wheelAngle = 60 + Math.random() * 240;
    this.repairWheel.rotation.z = THREE.MathUtils.degToRad(this.wheelAngle);
    this.bike.rearWheel.visible = false;
    this.repairStage.visible = true;
    this.camPos.copy(REPAIR_CAM);
    this.camLook.copy(REPAIR_LOOK);
    this.onResize();
    this.updateHud('TAP when the green line hits the top mark');
  }

  private onTap(): void {
    if (this.phase === 'cutscene') return;

    if (this.phase === 'ride' || this.phase === 'backup' || this.phase === 'brake') return;
    if (this.phase !== 'repair') return;

    this.totalTaps += 1;
    localStorage.setItem(STORAGE_KEYS.totalTaps, String(this.totalTaps));

    const diff = this.angleDistance(this.wheelAngle, TARGET_ANGLE);
    const origin = new THREE.Vector3(0, 0.85, 1.2);

    if (diff <= TIMING_WINDOW_DEG / 2) {
      this.streak += 1;
      if (this.streak > this.best) {
        this.best = this.streak;
        localStorage.setItem(STORAGE_KEYS.bestStreak, String(this.best));
        void postProgress(this.best, this.totalTaps);
      }
      this.spinSpeed = Math.min(MAX_SPIN_SPEED, this.spinSpeed + SPIN_ACCEL);
      flashHud(this.hud, '#22c55e');
      createBurst(this.scene, 0xfde047, 18, origin);
      this.shake = 0.04;
      this.updateHud('Hit!');
      window.setTimeout(() => {
        if (this.phase === 'repair') this.updateHud('TAP when the green line hits the top mark');
      }, 350);

      if (this.streak >= REQUIRED_STREAK) {
        void this.unlockCutscene();
      } else {
        this.updateHud();
      }
    } else {
      if (this.streak > 0) this.shake = 0.12;
      this.streak = 0;
      this.spinSpeed = BASE_SPIN_SPEED;
      flashHud(this.hud, '#ef4444');
      createBurst(this.scene, 0xef4444, 10, origin);
      this.updateHud('Miss. Chain reset.');
      window.setTimeout(() => {
        if (this.phase === 'repair') this.updateHud('TAP when the green line hits the top mark');
      }, 900);
    }
  }

  private async unlockCutscene(): Promise<void> {
    this.phase = 'cutscene';
    localStorage.setItem(STORAGE_KEYS.cutsceneSeen, '1');
    this.cutsceneSeen = true;
    void postUnlockCutscene(this.streak, this.totalTaps);

    this.repairStage.visible = false;
    this.bike.root.visible = false;
    this.backupBikes.forEach((b) => (b.visible = false));
    this.camPos.set(0, 2.2, 8);
    this.camLook.set(0, 1.2, 0);
    this.onResize();

    runCutscene(this.scene, this.container, this.streak, this.totalTaps, () => this.resetRide());
  }

  private angleDistance(a: number, b: number): number {
    let d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  }

  private layoutBackup(): void {
    const count = this.phase === 'ride' ? 0 : Math.floor(this.backupDepth * 8) + 2 + Math.floor(this.chainLevel * 1.5);
    this.backupBikes.forEach((bike, i) => {
      if (i >= count) {
        bike.visible = false;
        return;
      }
      bike.visible = true;
      bike.position.set(-2.2 + (1.8 + i * 1.55), 0, -0.15 - (i % 2) * 0.08);
      bike.rotation.z = -0.06;
    });
  }

  private updateHud(hint?: string): void {
    const phaseLabel =
      this.phase === 'ride'
        ? 'Riding'
        : this.phase === 'backup'
          ? 'Traffic jam'
          : this.phase === 'brake'
            ? 'Hard stop'
            : this.phase === 'repair'
              ? 'Repair'
              : 'Cutscene';

    updateHud(
      this.hud,
      this.streak,
      this.best,
      phaseLabel,
      hint ?? (this.phase === 'ride' ? 'TAP anywhere' : 'TAP when the green line hits the top mark'),
      this.totalTaps,
      this.backupDepth,
      this.chainLevel,
      this.cutsceneSeen
    );
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const frame = dt * 60;

    if (this.phase === 'ride') {
      this.rideTimer += dt * 1000;
      this.scroll += 2.8 * frame;
      this.bike.frame.rotation.z = Math.sin(this.scroll * 0.06) * 0.03;
      this.bike.frontWheel.rotation.x -= 0.08 * frame;
      this.bike.rearWheel.rotation.x -= 0.08 * frame;
      if (this.rideTimer > 2200 + Math.random() * 2000) this.triggerBackup();
    } else if (this.phase === 'backup') {
      this.scroll += 0.35 * frame;
      this.backupDepth = Math.min(this.backupDepth + 0.04 * frame, 1);
    } else if (this.phase === 'brake') {
      this.brakeTimer += dt * 1000;
      this.scroll *= 0.92;
      if (this.brakeTimer > 700) this.enterRepair();
    } else if (this.phase === 'repair') {
      this.wheelAngle = (this.wheelAngle + this.spinSpeed * frame) % 360;
      this.repairWheel.rotation.z = THREE.MathUtils.degToRad(this.wheelAngle);
    }

    this.layoutBackup();
    scrollWorld(this.world.farLayer, this.world.nearLayer, this.world.props, this.world.dashes, this.scroll);

    this.progressSyncTimer += dt * 1000;
    if (this.progressSyncTimer > 8000) {
      this.progressSyncTimer = 0;
      void postProgress(this.best, this.totalTaps);
    }

    const targetCam = this.phase === 'repair' ? REPAIR_CAM : RIDE_CAM;
    const targetLook = this.phase === 'repair' ? REPAIR_LOOK : RIDE_LOOK;
    this.camPos.lerp(targetCam, 0.08);
    this.camLook.lerp(targetLook, 0.08);

    if (this.shake > 0) {
      this.shake *= 0.88;
      this.camera.position.copy(this.camPos).add(
        new THREE.Vector3((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake, 0)
      );
    } else {
      this.camera.position.copy(this.camPos);
    }
    this.camera.lookAt(this.camLook);
    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    this.resizeObserver?.disconnect();
    this.renderer.dispose();
  }
}
