import { startLevelSession } from './session.js';
import { renderMenu } from '../ui/menu.js';
import levelManifest from '../data/level-manifest.json';

export { startLevelSession };

export const TOTAL_LEVELS = levelManifest.length;

const LEVEL_NAMES: Record<number, string> = Object.fromEntries(
  levelManifest.map((l) => [l.id, l.name]),
);

export function renderLevelSelect(container: HTMLElement, unlockedLevel: number): void {
  container.innerHTML = `
    <div class="level-select">
      <button class="btn btn-ghost" id="back-btn">← Menu</button>
      <h2>Levels</h2>
      <p class="hint">Unlocked: ${Math.min(unlockedLevel, TOTAL_LEVELS)} / ${TOTAL_LEVELS}</p>
      <div class="level-grid-scroll">
        <div class="level-grid">
        ${Array.from({ length: TOTAL_LEVELS }, (_, i) => {
          const id = i + 1;
          const locked = id > unlockedLevel;
          const name = LEVEL_NAMES[id] ?? `Level ${id}`;
          return `
            <button
              class="level-btn ${locked ? 'locked' : ''}"
              data-level="${id}"
              ${locked ? 'disabled' : ''}
              aria-label="Level ${id}: ${name}${locked ? ' (locked)' : ''}"
            >
              ${id}
              <span class="level-name">${name}</span>
            </button>
          `;
        }).join('')}
        </div>
      </div>
      <p class="hint">Levels load on demand — no spoilers in page source.</p>
    </div>
  `;

  container.querySelector('#back-btn')?.addEventListener('click', () => renderMenu(container));

  container.querySelectorAll('.level-btn:not(.locked)').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number((btn as HTMLElement).dataset.level);
      startLevelSession(container, id);
    });
  });
}
