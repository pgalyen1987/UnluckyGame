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
import {
  attachSketchRearWheel,
  createRepairArrows,
  createRepairWheel,
  createSketchBike,
  createSketchRideBike,
  getSketchRearHubLocal,
  SKETCH_REPAIR_WHEEL_R,
  SKETCH_WHEEL_ATTACH_SCALE,
  updateBikeMotion,
  type BikeRig,
} from './bike';
import { runCutscene } from './cutscene';
import { createHud, flashHud, setHintPulse, updateHud, type HudRefs } from './hud';
import { createBurst, createDustTrail, createSparkRing, type DustSystem } from './particles';
import { applyEnvironment } from './materials';
import { createPostFx, type PostFx } from './postfx';
import { createSky, updateSkyTime } from './sky';
import { createTimingTarget, updateTimingTarget } from './timingTarget';
import { createWorld, scrollWorld } from './world';

type Phase = 'ride' | 'backup' | 'brake' | 'repair' | 'reassemble' | 'cutscene';

const RIDE_CAM = new THREE.Vector3(8.5, 2.6, 10);
const RIDE_LOOK = new THREE.Vector3(-1.8, 1.05, 0);
const REPAIR_CAM = new THREE.Vector3(0, 1.15, 7.2);
const REPAIR_LOOK = new THREE.Vector3(-0.35, 0.78, 0);

const REASSEMBLE_DURATION = 1.35;
const REASSEMBLE_PAUSE = 0.55;
const REPAIR_WHEEL_START = new THREE.Vector3(1.15, SKETCH_REPAIR_WHEEL_R, 0);

export class UnluckyThree {
  private readonly container: HTMLElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly clock = new THREE.Clock();
  private postfx!: PostFx;

  private hud!: HudRefs;
  private world!: ReturnType<typeof createWorld>;
  private bike!: BikeRig;
  private backupBikes: THREE.Group[] = [];
  private repairStage!: THREE.Group;
  private sketchBike!: THREE.Group;
  private repairArrows!: THREE.Group;
  private repairWheel!: THREE.Group;
  private timingTarget!: THREE.Group;
  private groundLine!: THREE.Mesh;
  private sky!: THREE.Mesh;
  private dust!: DustSystem;
  private repairLight!: THREE.PointLight;

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
  private fovPunch = 0;
  private bloomKick = 0;
  private reassembleT = 0;
  private reassemblePause = 0;
  private reassembleSnapped = false;
  private reassembleHub = new THREE.Vector3();
  private resizeObserver?: ResizeObserver;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xa8c8e0, 0.022);

    const aspect = container.clientWidth / Math.max(container.clientHeight, 1);
    this.camera = new THREE.PerspectiveCamera(34, aspect, 0.1, 120);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Tone mapping handled by OutputPass in the composer.
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.inset = '0';
    this.renderer.domElement.style.zIndex = '0';
    container.appendChild(this.renderer.domElement);

    applyEnvironment(this.scene, this.renderer);
    this.postfx = createPostFx(this.renderer, this.scene, this.camera);

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
    this.scene.add(new THREE.AmbientLight(0x8eb4d4, 0.22));
    this.scene.add(new THREE.HemisphereLight(0xb8dcff, 0x3a404c, 0.55));
    const sun = new THREE.DirectionalLight(0xfff4dc, 1.55);
    sun.position.set(8, 14, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0002;
    sun.shadow.normalBias = 0.02;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 40;
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -2;
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight(0x7eb8e8, 0.35);
    rim.position.set(-6, 3, -4);
    this.scene.add(rim);

    const fill = new THREE.DirectionalLight(0xffe8c8, 0.28);
    fill.position.set(2, 2, 10);
    this.scene.add(fill);
  }

  private setupScene(): void {
    this.sky = createSky();
    this.scene.add(this.sky);
    this.world = createWorld();
    this.scene.add(this.world.root);

    this.bike = createSketchRideBike(false);
    this.bike.root.position.set(-2.2, 0, 0);
    this.scene.add(this.bike.root);

    for (let i = 0; i < 10; i++) {
      const b = createSketchRideBike(false).root;
      b.visible = false;
      b.scale.setScalar(0.82);
      this.backupBikes.push(b);
      this.scene.add(b);
    }

    this.repairStage = new THREE.Group();
    this.repairStage.visible = false;
    this.repairStage.position.set(0, 0, 1.2);

    const groundLine = new THREE.Mesh(
      new THREE.BoxGeometry(5.6, 0.012, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x94a3b8 })
    );
    groundLine.position.set(0, 0.01, 0);

    this.sketchBike = createSketchBike();
    this.sketchBike.position.set(-2.15, 0, 0);

    this.repairArrows = createRepairArrows();
    this.repairArrows.position.set(-0.55, 0, 0);

    this.repairWheel = createRepairWheel();
    this.repairWheel.position.copy(REPAIR_WHEEL_START);

    this.timingTarget = createTimingTarget();
    this.timingTarget.position.copy(this.repairWheel.position);

    this.repairLight = new THREE.PointLight(0x86efac, 0.9, 5, 2);
    this.repairLight.position.set(1.15, 1.2, 1.2);

    this.repairStage.add(
      groundLine,
      this.sketchBike,
      this.repairArrows,
      this.repairWheel,
      this.timingTarget,
      this.repairLight
    );
    this.scene.add(this.repairStage);

    this.groundLine = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.01, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.55 })
    );
    this.groundLine.position.set(-2.2, 0.01, 0);
    this.scene.add(this.groundLine);

    this.dust = createDustTrail(this.scene);
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
    this.camera.aspect = w / h;
    this.camera.fov = this.phase === 'repair' || this.phase === 'reassemble' ? 30 : 34;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.postfx.resize(w, h);
  }

  private resetRide(): void {
    this.phase = 'ride';
    this.rideTimer = 0;
    this.brakeTimer = 0;
    this.backupDepth = 0;
    this.streak = 0;
    this.spinSpeed = BASE_SPIN_SPEED;
    this.reassembleT = 0;
    this.reassemblePause = 0;
    this.reassembleSnapped = false;
    this.repairWheel.visible = true;
    this.repairArrows.visible = true;
    this.repairArrows.scale.setScalar(1);
    this.timingTarget.visible = true;
    this.timingTarget.scale.setScalar(1);
    this.sketchBike.getObjectByName('attached-rear-wheel')?.removeFromParent();
    this.repairStage.visible = false;
    this.bike.root.visible = true;
    this.bike.rearWheel.visible = true;
    this.groundLine.visible = true;
    this.camPos.copy(RIDE_CAM);
    this.camLook.copy(RIDE_LOOK);
    this.onResize();
    this.updateHud();
    setHintPulse(this.hud, false);
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
      this.bloomKick = 0.25;
      createBurst(this.scene, 0xcbd5e1, 22, new THREE.Vector3(-2.2, 0.3, 0));
      this.updateHud('Hard stop!');
    }, 900);
  }

  private enterRepair(): void {
    this.phase = 'repair';
    this.streak = 0;
    this.spinSpeed = BASE_SPIN_SPEED;
    this.wheelAngle = 60 + Math.random() * 240;
    this.repairWheel.position.copy(REPAIR_WHEEL_START);
    this.repairWheel.scale.setScalar(1);
    this.repairWheel.visible = true;
    this.repairWheel.rotation.x = THREE.MathUtils.degToRad(this.wheelAngle);
    const notch = this.repairWheel.getObjectByName('notch');
    if (notch) notch.visible = true;
    this.repairArrows.visible = true;
    this.repairArrows.scale.setScalar(1);
    this.timingTarget.visible = true;
    this.timingTarget.scale.setScalar(1);
    this.sketchBike.getObjectByName('attached-rear-wheel')?.removeFromParent();
    this.reassembleHub.copy(this.sketchBike.position).add(getSketchRearHubLocal());
    this.bike.root.visible = false;
    this.repairStage.visible = true;
    this.groundLine.visible = false;
    this.camPos.copy(REPAIR_CAM);
    this.camLook.copy(REPAIR_LOOK);
    this.onResize();
    setHintPulse(this.hud, true);
    this.updateHud('TAP when the green line hits the top mark');
  }

  private onTap(): void {
    if (this.phase === 'cutscene' || this.phase === 'reassemble') return;

    if (this.phase === 'ride' || this.phase === 'backup' || this.phase === 'brake') return;
    if (this.phase !== 'repair') return;

    this.totalTaps += 1;
    localStorage.setItem(STORAGE_KEYS.totalTaps, String(this.totalTaps));

    const diff = this.angleDistance(this.wheelAngle, TARGET_ANGLE);
    const origin = new THREE.Vector3(1.15, SKETCH_REPAIR_WHEEL_R + 0.15, 1.2);

    if (diff <= TIMING_WINDOW_DEG / 2) {
      this.streak += 1;
      if (this.streak > this.best) {
        this.best = this.streak;
        localStorage.setItem(STORAGE_KEYS.bestStreak, String(this.best));
        void postProgress(this.best, this.totalTaps);
      }
      this.spinSpeed = Math.min(MAX_SPIN_SPEED, this.spinSpeed + SPIN_ACCEL);
      flashHud(this.hud, '#22c55e');
      createBurst(this.scene, 0xfde047, 20, origin);
      createSparkRing(this.scene, origin, 0x86efac);
      this.shake = 0.04;
      this.fovPunch = 1.8;
      this.bloomKick = 0.35;
      this.updateHud('Hit!');
      window.setTimeout(() => {
        if (this.phase === 'repair') this.updateHud('TAP when the green line hits the top mark');
      }, 350);

      if (this.streak >= REQUIRED_STREAK) {
        this.startReassemble();
      } else {
        this.updateHud();
      }
    } else {
      if (this.streak > 0) this.shake = 0.12;
      this.streak = 0;
      this.spinSpeed = BASE_SPIN_SPEED;
      flashHud(this.hud, '#ef4444');
      createBurst(this.scene, 0xef4444, 12, origin);
      this.bloomKick = 0.15;
      this.updateHud('Miss. Chain reset.');
      window.setTimeout(() => {
        if (this.phase === 'repair') this.updateHud('TAP when the green line hits the top mark');
      }, 900);
    }
  }

  private startReassemble(): void {
    this.phase = 'reassemble';
    this.reassembleT = 0;
    this.reassemblePause = 0;
    this.reassembleSnapped = false;
    setHintPulse(this.hud, false);
    this.updateHud('Snapping wheel back on…');
    this.bloomKick = 0.45;

    const notch = this.repairWheel.getObjectByName('notch');
    if (notch) notch.visible = false;
  }

  private finishReassemble(): void {
    if (this.reassembleSnapped) return;
    this.reassembleSnapped = true;

    this.sketchBike.getObjectByName('attached-rear-wheel')?.removeFromParent();
    attachSketchRearWheel(this.sketchBike);
    this.repairWheel.visible = false;
    this.repairArrows.visible = false;
    this.timingTarget.visible = false;

    createBurst(this.scene, 0x86efac, 28, this.reassembleHub.clone().add(new THREE.Vector3(0, 0, 1.2)));
    createSparkRing(this.scene, this.reassembleHub.clone().add(new THREE.Vector3(0, 0, 1.2)), 0x22c55e);
    flashHud(this.hud, '#22c55e');
    this.shake = 0.06;
    this.reassemblePause = REASSEMBLE_PAUSE;
    this.updateHud('Wheel locked.');
  }

  private async unlockCutscene(): Promise<void> {
    this.phase = 'cutscene';
    localStorage.setItem(STORAGE_KEYS.cutsceneSeen, '1');
    this.cutsceneSeen = true;
    void postUnlockCutscene(this.streak, this.totalTaps);

    this.repairStage.visible = false;
    this.bike.root.visible = false;
    this.groundLine.visible = false;
    this.backupBikes.forEach((b) => (b.visible = false));
    setHintPulse(this.hud, false);
    this.camPos.set(0, 2.2, 8);
    this.camLook.set(0, 1.2, 0);
    this.bloomKick = 0.5;
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
              : this.phase === 'reassemble'
                ? 'Reassemble'
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
    const t = this.clock.elapsedTime;

    if (this.phase === 'ride') {
      this.rideTimer += dt * 1000;
      this.scroll += 2.8 * frame;
      updateBikeMotion(this.bike, t, true);
      this.bike.frontWheel.rotation.x -= 0.08 * frame;
      this.bike.rearWheel.rotation.x -= 0.08 * frame;
      this.groundLine.position.y = 0.01 + Math.sin(t * 10) * 0.002;
      this.groundLine.scale.x = 1 + Math.sin(t * 10) * 0.04;
      if (this.rideTimer > 2200 + Math.random() * 2000) this.triggerBackup();
    } else if (this.phase === 'backup') {
      this.scroll += 0.35 * frame;
      this.backupDepth = Math.min(this.backupDepth + 0.04 * frame, 1);
      updateBikeMotion(this.bike, t * 0.3, true);
    } else if (this.phase === 'brake') {
      this.brakeTimer += dt * 1000;
      this.scroll *= 0.92;
      this.bike.root.position.y = 0;
      if (this.brakeTimer > 700) this.enterRepair();
    } else if (this.phase === 'repair') {
      this.wheelAngle = (this.wheelAngle + this.spinSpeed * frame) % 360;
      this.repairWheel.rotation.x = THREE.MathUtils.degToRad(this.wheelAngle);
      const nearHit = this.angleDistance(this.wheelAngle, TARGET_ANGLE) <= TIMING_WINDOW_DEG;
      updateTimingTarget(this.timingTarget, t, nearHit);
      this.repairLight.intensity = nearHit ? 2.4 : 1.2;
    } else if (this.phase === 'reassemble') {
      if (this.reassemblePause > 0) {
        this.reassemblePause -= dt;
        if (this.reassemblePause <= 0) void this.unlockCutscene();
      } else {
        this.reassembleT += dt / REASSEMBLE_DURATION;
        const p = Math.min(1, this.reassembleT);
        const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

        this.repairWheel.position.lerpVectors(REPAIR_WHEEL_START, this.reassembleHub, eased);
        const scale = THREE.MathUtils.lerp(1, SKETCH_WHEEL_ATTACH_SCALE, eased);
        this.repairWheel.scale.setScalar(scale);
        this.repairWheel.rotation.x += 0.04 * frame;

        this.repairArrows.scale.setScalar(1 - eased);
        this.timingTarget.scale.setScalar(1 - eased);
        this.repairLight.intensity = 1.2 + eased * 1.4;

        if (p >= 1 && !this.reassembleSnapped) this.finishReassemble();
      }
    }

    this.dust.update(dt, this.phase === 'ride', this.phase === 'ride' ? 2.8 : 0.4);

    this.layoutBackup();
    scrollWorld(this.world.farLayer, this.world.nearLayer, this.world.props, this.world.dashes, this.scroll);
    updateSkyTime(this.sky, t);

    this.progressSyncTimer += dt * 1000;
    if (this.progressSyncTimer > 8000) {
      this.progressSyncTimer = 0;
      void postProgress(this.best, this.totalTaps);
    }

    const targetCam =
      this.phase === 'repair' || this.phase === 'reassemble'
        ? REPAIR_CAM
        : this.phase === 'cutscene'
          ? this.camPos
          : RIDE_CAM;
    const targetLook =
      this.phase === 'repair' || this.phase === 'reassemble'
        ? REPAIR_LOOK
        : this.phase === 'cutscene'
          ? this.camLook
          : RIDE_LOOK;
    if (this.phase !== 'cutscene') {
      this.camPos.lerp(targetCam, 0.08);
      this.camLook.lerp(targetLook, 0.08);
    }

    // Subtle ride camera sway
    const sway =
      this.phase === 'ride'
        ? new THREE.Vector3(Math.sin(t * 0.7) * 0.08, Math.sin(t * 1.1) * 0.05, 0)
        : new THREE.Vector3(0, 0, 0);

    if (this.shake > 0) {
      this.shake *= 0.88;
      this.camera.position
        .copy(this.camPos)
        .add(sway)
        .add(new THREE.Vector3((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake, 0));
    } else {
      this.camera.position.copy(this.camPos).add(sway);
    }
    this.camera.lookAt(this.camLook);

    const baseFov = this.phase === 'repair' || this.phase === 'reassemble' ? 30 : 34;
    if (this.fovPunch > 0.01) {
      this.fovPunch *= 0.86;
      this.camera.fov = baseFov + this.fovPunch;
      this.camera.updateProjectionMatrix();
    } else if (Math.abs(this.camera.fov - baseFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, baseFov, 0.15);
      this.camera.updateProjectionMatrix();
    }

    if (this.bloomKick > 0.01) {
      this.bloomKick *= 0.9;
      this.postfx.setBloom(0.28 + this.bloomKick);
    } else {
      this.postfx.setBloom(this.phase === 'repair' || this.phase === 'reassemble' ? 0.34 : 0.26);
    }

    this.postfx.render();
  };

  dispose(): void {
    this.resizeObserver?.disconnect();
    this.renderer.dispose();
  }
}
