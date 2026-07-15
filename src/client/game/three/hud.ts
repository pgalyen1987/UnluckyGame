import { REQUIRED_STREAK } from '../config';

export type HudRefs = {
  root: HTMLDivElement;
  streak: HTMLParagraphElement;
  meta: HTMLParagraphElement;
  hint: HTMLParagraphElement;
  bar: HTMLDivElement;
  barFill: HTMLDivElement;
};

export function createHud(container: HTMLElement): HudRefs {
  const root = document.createElement('div');
  root.className = 'three-hud';
  root.innerHTML = `
    <p class="three-streak"></p>
    <div class="three-bar"><div class="three-bar-fill"></div></div>
    <p class="three-meta"></p>
    <p class="three-hint">TAP anywhere</p>
  `;
  container.appendChild(root);

  return {
    root,
    streak: root.querySelector('.three-streak') as HTMLParagraphElement,
    meta: root.querySelector('.three-meta') as HTMLParagraphElement,
    hint: root.querySelector('.three-hint') as HTMLParagraphElement,
    bar: root.querySelector('.three-bar') as HTMLDivElement,
    barFill: root.querySelector('.three-bar-fill') as HTMLDivElement,
  };
}

export function updateHud(
  hud: HudRefs,
  streak: number,
  best: number,
  phaseLabel: string,
  hint: string,
  totalTaps = 0,
  backupDepth = 0,
  chainLevel = 0,
  cutsceneSeen = false
): void {
  const pct = ((streak / REQUIRED_STREAK) * 100).toFixed(3);
  hud.streak.textContent = `Chain: ${streak} / ${REQUIRED_STREAK} (${pct}%)`;
  hud.meta.textContent = `${phaseLabel} · Backup: ${Math.floor(backupDepth * 120 + totalTaps * 0.01)}m · Best: ${best}${
    chainLevel > 0 ? ` · Chain lvl ${chainLevel}` : ''
  }${cutsceneSeen ? ' · ???' : ''}`;
  hud.hint.textContent = hint;
  hud.barFill.style.width = `${Math.min(100, (streak / REQUIRED_STREAK) * 100)}%`;
}

export function flashHud(hud: HudRefs, color: string): void {
  hud.root.style.setProperty('--flash', color);
  hud.root.classList.add('flash');
  window.setTimeout(() => hud.root.classList.remove('flash'), 140);
}
