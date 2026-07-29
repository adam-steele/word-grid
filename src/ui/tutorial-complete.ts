import type { ScoreResult } from '@shared/types.js';
import type { GameGrid } from '../core/grid.js';
import { renderGrid } from './grid-view.js';

export function renderTutorialComplete(
  container: HTMLElement,
  result: ScoreResult,
  grid: GameGrid,
  onMenu: () => void,
): void {
  const grouped = {
    horizontal: result.breakdown.filter((w) => w.direction === 'horizontal'),
    vertical: result.breakdown.filter((w) => w.direction === 'vertical'),
    diagonal: result.breakdown.filter((w) => w.direction === 'diagonal'),
  };

  container.innerHTML = `
    <div class="tutorial-complete">
      <h2>Tutorial Complete</h2>
      <p class="status-message">Final score: ${result.total}</p>
      <div id="tutorial-final-grid" class="final-grid"></div>
      <div class="breakdown">
        ${renderGroup('Vertical', grouped.vertical)}
        ${renderGroup('Diagonal', grouped.diagonal)}
        ${renderGroup('Horizontal', grouped.horizontal)}
      </div>
      <section class="tutorial-outro" aria-label="What's next">
        <h3>What's next?</h3>
        <ul>
          <li><strong>Free Play</strong> lets you pick any grid size before you start — try to beat your high score each run.</li>
          <li>In <strong>Level Mode</strong>, some letters are prefilled and must stay in your word.</li>
        </ul>
      </section>
      <div class="game-over-actions">
        <button class="btn btn-primary" id="tutorial-menu-btn" type="button">Back to Menu</button>
      </div>
    </div>
  `;

  renderGrid(container.querySelector('#tutorial-final-grid')!, grid, {
    highlights: result.breakdown,
    showLegend: true,
    showWordPaths: true,
    overlayIntensity: 'final',
  });

  container.querySelector('#tutorial-menu-btn')?.addEventListener('click', onMenu);
}

function renderGroup(title: string, words: ScoreResult['breakdown']): string {
  if (!words.length) {
    return `
      <section class="breakdown-group breakdown-empty">
        <h3>${title}</h3>
        <p class="hint">None found</p>
      </section>
    `;
  }

  const sorted = [...words].sort((a, b) => b.score - a.score);
  const items = sorted
    .map((w) => `<li>${w.word} <span class="pts">+${w.score}</span></li>`)
    .join('');
  const subtotal = words.reduce((sum, w) => sum + w.score, 0);
  return `
    <section class="breakdown-group">
      <h3>${title} <span class="pts">${subtotal} pts</span></h3>
      <ul>${items}</ul>
    </section>
  `;
}
