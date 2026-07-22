import { startLevelSession } from './session.js';
import { renderMenu } from '../ui/menu.js';

export { startLevelSession };

const LEVEL_NAMES: Record<number, string> = {
  1: 'Warm Up',
  2: 'Easy Vowel',
  3: 'Two Hints',
  4: 'Short Words',
  5: 'Mid Grid',
  6: 'Three Locks',
  7: 'Hard Start',
  8: 'Expert',
};

export const TOTAL_LEVELS = 8;

export function renderLevelSelect(container: HTMLElement, unlockedLevel: number): void {
  container.innerHTML = `
    <div class="level-select">
      <button class="btn btn-ghost" id="back-btn">← Menu</button>
      <h2>Levels</h2>
      <p class="hint">Unlocked: ${Math.min(unlockedLevel, TOTAL_LEVELS)} / ${TOTAL_LEVELS}</p>
      <div class="level-grid">
        ${Array.from({ length: TOTAL_LEVELS }, (_, i) => {
          const id = i + 1;
          const locked = id > unlockedLevel;
          return `
            <button
              class="level-btn ${locked ? 'locked' : ''}"
              data-level="${id}"
              ${locked ? 'disabled' : ''}
              aria-label="Level ${id}: ${LEVEL_NAMES[id] ?? ''}${locked ? ' (locked)' : ''}"
            >
              ${id}
              <span class="level-name">${LEVEL_NAMES[id] ?? ''}</span>
            </button>
          `;
        }).join('')}
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
