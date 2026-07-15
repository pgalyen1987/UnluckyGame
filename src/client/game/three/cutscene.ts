import * as THREE from 'three';
import { createVictoryBike } from './bike';

export type CutsceneHandle = {
  group: THREE.Group;
  titleEl: HTMLDivElement;
  subtitleEl: HTMLParagraphElement;
  footerEl: HTMLParagraphElement;
};

export function createCutsceneOverlay(container: HTMLElement): Omit<CutsceneHandle, 'group'> {
  const titleEl = document.createElement('div');
  titleEl.className = 'cutscene-title';
  titleEl.textContent = 'UNLUCKY';
  titleEl.style.opacity = '0';

  const subtitleEl = document.createElement('p');
  subtitleEl.className = 'cutscene-subtitle';
  subtitleEl.textContent = 'Wheel locked.';
  subtitleEl.style.opacity = '0';

  const footerEl = document.createElement('p');
  footerEl.className = 'cutscene-footer';
  footerEl.style.opacity = '0';

  container.appendChild(subtitleEl);
  container.appendChild(titleEl);
  container.appendChild(footerEl);

  return { titleEl, subtitleEl, footerEl };
}

export function runCutscene(
  scene: THREE.Scene,
  container: HTMLElement,
  streak: number,
  totalTaps: number,
  onDone: () => void
): CutsceneHandle {
  const overlay = createCutsceneOverlay(container);
  const group = new THREE.Group();
  group.add(createVictoryBike());
  group.position.set(0, 0, 0);
  scene.add(group);

  overlay.footerEl.textContent = `Chain ${streak} · ${totalTaps.toLocaleString()} lifetime taps`;

  fade(overlay.subtitleEl, 1, 600);
  window.setTimeout(() => {
    overlay.subtitleEl.textContent = '…';
    tween(group.rotation, 'z', -0.48, 2200);
    tween(group.position, 'y', -0.15, 2200);
  }, 1400);

  window.setTimeout(() => {
    overlay.subtitleEl.textContent = '';
    overlay.subtitleEl.style.opacity = '0';
    tween(group.rotation, 'z', -1.6, 900);
    tween(group.position, 'y', -0.75, 900);
    tween(group.position, 'x', -0.35, 900, () => {
      fade(overlay.titleEl, 1, 300);
      fade(overlay.footerEl, 1, 300);
    });
  }, 3800);

  window.setTimeout(() => {
    overlay.subtitleEl.textContent = 'tap to ride again';
    overlay.subtitleEl.style.opacity = '0.7';
    const resume = (): void => {
      container.removeEventListener('pointerdown', resume);
      scene.remove(group);
      overlay.titleEl.remove();
      overlay.subtitleEl.remove();
      overlay.footerEl.remove();
      onDone();
    };
    container.addEventListener('pointerdown', resume);
  }, 5200);

  return { group, ...overlay };
}

function fade(el: HTMLElement, opacity: number, ms: number): void {
  el.style.transition = `opacity ${ms}ms ease`;
  el.style.opacity = String(opacity);
}

function tween(
  obj: THREE.Object3D | THREE.Euler,
  key: 'x' | 'y' | 'z',
  target: number,
  ms: number,
  onDone?: () => void
): void {
  const start = (obj as unknown as Record<string, number>)[key]!;
  const t0 = performance.now();
  const step = (): void => {
    const t = Math.min(1, (performance.now() - t0) / ms);
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    (obj as unknown as Record<string, number>)[key] = start + (target - start) * eased;
    if (t < 1) requestAnimationFrame(step);
    else onDone?.();
  };
  requestAnimationFrame(step);
}
