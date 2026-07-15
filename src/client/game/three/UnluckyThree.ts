import * as THREE from 'three';
import '../three/three.css';
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
import { createHud, flashHud, updateHud, type HudRefs } from './hud';
import { createWorld, scrollWorld } from './world';

type Phase = 'ride' | 'backup' | 'brake' | 'repair';

export class UnluckyThree {
  private readonly container: HTMLElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.OrthographicCamera;
  private readonly clock = new THREE.Clock();

  private hud!: HudRefs;
  private world!: ReturnType<typeof createWorld>;
  private bike!: ReturnType<typeof createBike>;
  private repairWheel!: THREE.Group;

  private phase: Phase = 'ride';
  private scroll = 0;
  private backupDepth = 0;
  private rideTimer = 0;
  private brakeTimer = 0;
  private streak = 0;
  private best = 0;
  private wheelAngle = 0;
  private spinSpeed = BASE_SPIN_SPEED;
  private resizeObserver?: ResizeObserver;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x9ecae8);
    this.scene.fog = new THREE.Fog(0x9ecae8, 18, 42);

    const aspect = container.clientWidth / Math.max(container.clientHeight, 1);
    const frustum = 6.2;
    this.camera = new THREE.OrthographicCamera(
      (-frustum * aspect) / 2,
      (frustum * aspect) / 2,
      frustum / 2,
      -frustum / 2,
      0.1,
      100
    );
    this.camera.position.set(8, 3.2, 12);
    this.camera.lookAt(0, 1.2, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    this.hud = createHud(container);
    this.best = Number(localStorage.getItem(STORAGE_KEYS.bestStreak) ?? 0);

    this.setupLights();
    this.setupScene();
    this.bindInput();
    this.onResize();
    this.resetRide();
    this.animate();
  }

  private setupLights(): void {
    this.scene.add(new THREE.AmbientLight(0xd4e4f2, 0.55));
    const sun = new THREE.DirectionalLight(0xfff4cc, 1.1);
    sun.position.set(6, 10, 8);
    sun.castShadow = true;
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0x7eb8e8, 0.35);
    fill.position.set(-4, 2, 6);
    this.scene.add(fill);
  }

  private setupScene(): void {
    this.world = createWorld();
    this.scene.add(this.world.root);

    this.bike = createBike(false);
    this.bike.root.position.set(-2.4, 0, 0);
    this.scene.add(this.bike.root);

    this.repairWheel = createRepairWheel();
    this.repairWheel.visible = false;
    this.repairWheel.position.set(0.8, 0.95, 0.5);
    this.scene.add(this.repairWheel);

    const groundShadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.1, 24),
      new THREE.MeshBasicMaterial({ color: 0x141820, transparent: true, opacity: 0.22 })
    );
    groundShadow.rotation.x = -Math.PI / 2;
    groundShadow.position.set(-2.4, 0.01, 0);
    this.scene.add(groundShadow);
  }

  private bindInput(): void {
    const tap = (): void => this.onTap();
    this.renderer.domElement.addEventListener('pointerdown', tap);
    window.addEventListener(
      'touchmove',
      (e) => e.preventDefault(),
      { passive: false, capture: true }
    );

    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(this.container);
  }

  private onResize(): void {
    const w = this.container.clientWidth;
    const h = Math.max(this.container.clientHeight, 1);
    const aspect = w / h;
    const frustum = 6.2;
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
    this.repairWheel.visible = false;
    this.bike.rearWheel.visible = true;
    updateHud(this.hud, this.streak, this.best, 'Riding', 'TAP anywhere (3D preview)');
  }

  private triggerBackup(): void {
    this.phase = 'backup';
    updateHud(this.hud, this.streak, this.best, 'Traffic jam', 'Traffic jam…');
    window.setTimeout(() => {
      if (this.phase !== 'backup') return;
      this.phase = 'brake';
      this.brakeTimer = 0;
      updateHud(this.hud, this.streak, this.best, 'Hard stop', 'Hard stop!');
      this.bike.frame.rotation.z = -0.08;
    }, 900);
  }

  private enterRepair(): void {
    this.phase = 'repair';
    this.streak = 0;
    this.spinSpeed = BASE_SPIN_SPEED;
    this.wheelAngle = 60 + Math.random() * 240;
    this.bike.rearWheel.visible = false;
    this.repairWheel.visible = true;
    this.repairWheel.rotation.z = THREE.MathUtils.degToRad(this.wheelAngle);
    updateHud(
      this.hud,
      this.streak,
      this.best,
      'Repair',
      'TAP when the green line hits the top mark'
    );
  }

  private onTap(): void {
    if (this.phase !== 'repair') return;

    const diff = this.angleDistance(this.wheelAngle, TARGET_ANGLE);
    if (diff <= TIMING_WINDOW_DEG / 2) {
      this.streak += 1;
      if (this.streak > this.best) {
        this.best = this.streak;
        localStorage.setItem(STORAGE_KEYS.bestStreak, String(this.best));
      }
      this.spinSpeed = Math.min(MAX_SPIN_SPEED, this.spinSpeed + SPIN_ACCEL);
      flashHud(this.hud, '#22c55e');
      updateHud(this.hud, this.streak, this.best, 'Repair', 'Hit!');

      if (this.streak >= REQUIRED_STREAK) {
        updateHud(this.hud, this.streak, this.best, 'Unlocked', 'POC complete — switch back to main game for cutscene');
        this.phase = 'ride';
        this.repairWheel.visible = false;
        this.bike.rearWheel.visible = true;
        window.setTimeout(() => this.resetRide(), 2400);
        return;
      }

      window.setTimeout(() => {
        if (this.phase === 'repair') {
          updateHud(
            this.hud,
            this.streak,
            this.best,
            'Repair',
            'TAP when the green line hits the top mark'
          );
        }
      }, 350);
    } else {
      this.streak = 0;
      this.spinSpeed = BASE_SPIN_SPEED;
      flashHud(this.hud, '#ef4444');
      updateHud(this.hud, this.streak, this.best, 'Repair', 'Miss. Chain reset.');
      window.setTimeout(() => {
        if (this.phase === 'repair') {
          updateHud(
            this.hud,
            this.streak,
            this.best,
            'Repair',
            'TAP when the green line hits the top mark'
          );
        }
      }, 900);
    }
  }

  private angleDistance(a: number, b: number): number {
    let d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const frame = dt * 60;

    if (this.phase === 'ride') {
      this.rideTimer += dt * 1000;
      this.scroll += 2.8 * frame;
      this.bike.frame.rotation.z = Math.sin(this.scroll * 0.06) * 0.03;
      if (this.rideTimer > 2200 + Math.random() * 2000) {
        this.triggerBackup();
      }
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

    scrollWorld(this.world.farLayer, this.world.nearLayer, this.world.dashes, this.scroll);
    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    this.resizeObserver?.disconnect();
    this.renderer.dispose();
  }
}
